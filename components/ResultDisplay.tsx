import React, { useState } from 'react';
import { Layer, LayerType } from '../types';
import { LayersIcon, RefreshCwIcon, ImageIcon, SquareIcon, TypeIcon, ScissorsIcon, DownloadIcon, CopyIcon, CheckIcon } from './icons';

interface ResultDisplayProps {
  imageUrl: string;
  layers: Layer[];
  onReset: () => void;
  onExtractLayer: (layerIndex: number) => void;
  extractingLayerIndex: number | null;
  onExportPsd: () => void;
  isExportingPsd: boolean;
}

const LayerTypeIcon: React.FC<{ type: LayerType }> = ({ type }) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5 text-green-400" aria-label="Image Layer" />;
      case 'shape':
        return <SquareIcon className="w-5 h-5 text-yellow-400" aria-label="Shape Layer" />;
      case 'text':
        return <TypeIcon className="w-5 h-5 text-red-400" aria-label="Text Layer" />;
      default:
        return <LayersIcon className="w-5 h-5 text-gray-400" aria-label="Generic Layer" />;
    }
};

const typeColorMap: Record<LayerType, string> = {
    image: 'bg-green-900/50 text-green-300 border-green-700/50',
    shape: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/50',
    text: 'bg-red-900/50 text-red-300 border-red-700/50',
};

const typeHighlightBorderMap: Record<LayerType, string> = {
    image: 'border-green-400',
    shape: 'border-yellow-400',
    text: 'border-red-400',
};

const CopyableTableRow: React.FC<{ label: string; value: string }> = ({ label, value }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(value).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <tr className="border-b border-gray-700/50 last:border-b-0">
      <th scope="row" className="py-1 pr-3 font-medium text-gray-300 whitespace-nowrap">
        {label}
      </th>
      <td className="py-1 pl-3 text-blue-300 font-mono">
        <div className="flex items-center justify-between gap-2">
            <span className="truncate">{value}</span>
            <button 
                onClick={handleCopy} 
                className="p-1 rounded-md hover:bg-gray-600/50 text-gray-400 hover:text-white transition-colors flex-shrink-0"
                aria-label={`Copy ${label}`}
            >
            {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <CopyIcon className="w-4 h-4" />}
            </button>
        </div>
      </td>
    </tr>
  );
};

const LayerDescription: React.FC<{ layer: Layer }> = ({ layer }) => {
  // For non-text layers or unstructured descriptions, show a simple paragraph.
  if (layer.type !== 'text' || !layer.description.includes(':')) {
      return <p className="text-sm text-gray-400 mt-2 pl-8">{layer.description}</p>;
  }

  // Attempt to parse the structured description for text layers.
  try {
      const properties = layer.description.split(',').map(part => {
          const splitIndex = part.indexOf(':');
          if (splitIndex === -1) return null;
          const key = part.substring(0, splitIndex).trim();
          const value = part.substring(splitIndex + 1).trim();
          return { key, value };
      }).filter((item): item is { key: string, value: string } => item !== null);

      if (properties.length === 0) {
          return <p className="text-sm text-gray-400 mt-2 pl-8">{layer.description}</p>;
      }

      return (
          <div className="mt-3 pl-8">
              <table className="w-full text-sm text-left">
                  <tbody className="text-gray-400">
                      {properties.map(({ key, value }, index) => (
                          <CopyableTableRow key={index} label={key} value={value} />
                      ))}
                  </tbody>
              </table>
          </div>
      );
  } catch (e) {
      // Fallback in case of parsing errors
      return <p className="text-sm text-gray-400 mt-2 pl-8">{layer.description}</p>;
  }
};


const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageUrl, layers, onReset, onExtractLayer, extractingLayerIndex, onExportPsd, isExportingPsd }) => {
  const [activeLayerIndex, setActiveLayerIndex] = useState<number | null>(null);
  
  return (
    <div className="w-full max-w-6xl p-4 bg-gray-800/50 rounded-xl border border-gray-700 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Image Preview */}
        <div className="flex flex-col items-center justify-center">
          <h2 className="text-xl font-semibold text-gray-300 mb-4">Original Image</h2>
          <div className="relative w-full aspect-square max-w-lg shadow-2xl shadow-blue-900/20 rounded-lg overflow-hidden">
             <img src={imageUrl} alt="Uploaded preview" className="w-full h-full object-contain" />
             {/* Bounding Box Overlay */}
             {layers.map((layer, index) => {
                 const isActive = index === activeLayerIndex;
                 if (!layer.boundingBox) return null;

                 return (
                    <div
                        key={index}
                        className={`absolute rounded-sm pointer-events-none transition-all duration-300 ease-in-out border-2 
                        ${isActive ? `${typeHighlightBorderMap[layer.type]} shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]` : 'opacity-0 border-transparent'}`}
                        style={{
                            left: `${layer.boundingBox.x * 100}%`,
                            top: `${layer.boundingBox.y * 100}%`,
                            width: `${layer.boundingBox.width * 100}%`,
                            height: `${layer.boundingBox.height * 100}%`,
                        }}
                    ></div>
                 )
             })}
          </div>
        </div>

        {/* Layers Panel */}
        <div className="flex flex-col">
          <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-300 flex items-center">
                  <LayersIcon className="w-6 h-6 mr-2 text-blue-400" />
                  AI Generated Layers
              </h2>
              <div className="flex items-center gap-2">
                <button
                    onClick={onExportPsd}
                    disabled={isExportingPsd}
                    className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-md font-semibold transition-all duration-300 text-sm transform hover:scale-105 disabled:bg-purple-800 disabled:scale-100 disabled:cursor-not-allowed"
                >
                    <DownloadIcon className={`w-4 h-4 mr-2 ${isExportingPsd ? 'animate-pulse' : ''}`}/>
                    {isExportingPsd ? 'Exporting...' : 'Export to PSD'}
                </button>
                <button
                  onClick={onReset}
                  className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-all duration-300 text-sm transform hover:scale-105"
                  >
                  <RefreshCwIcon className="w-4 h-4 mr-2"/>
                  Start Over
                </button>
              </div>
          </div>
          
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
            <ul className="space-y-3">
              {[...layers].reverse().map((layer, index) => {
                // Original index is needed for hover state, as we reversed the array for display
                const originalIndex = layers.length - 1 - index;
                const isExtracting = extractingLayerIndex === originalIndex;
                return (
                    <li 
                        key={originalIndex}
                        onMouseEnter={() => setActiveLayerIndex(originalIndex)}
                        onMouseLeave={() => setActiveLayerIndex(null)}
                        className={`bg-gray-800 p-3 rounded-md border border-gray-700/50 transition-all duration-200 ${activeLayerIndex === originalIndex ? 'bg-gray-700/80 border-blue-500/60' : 'hover:border-blue-500/50 hover:bg-gray-700/50'}`}
                    >
                      <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                              <LayerTypeIcon type={layer.type} />
                              <span className="font-semibold text-blue-300">{layer.name}</span>
                          </div>
                           <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono capitalize px-2 py-1 rounded-full border ${typeColorMap[layer.type] || 'bg-gray-700'}`}>
                                    {layer.type}
                                </span>
                           </div>
                      </div>
                      <LayerDescription layer={layer} />
                       {layer.type === 'image' && (
                            <div className="flex justify-end mt-2">
                                <button
                                    onClick={() => onExtractLayer(originalIndex)}
                                    disabled={isExtracting}
                                    className="flex items-center text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded-md font-semibold transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    <ScissorsIcon className={`w-3 h-3 mr-1 ${isExtracting ? 'animate-spin' : ''}`} />
                                    {isExtracting ? 'Extracting...' : 'Extract'}
                                </button>
                            </div>
                        )}
                    </li>
                )
              })}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultDisplay;