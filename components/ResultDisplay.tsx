import React, { useState } from 'react';
import { Layer, LayerType } from '../types';
import { LayersIcon, RefreshCwIcon, ImageIcon, SquareIcon, TypeIcon } from './icons';

interface ResultDisplayProps {
  imageUrl: string;
  layers: Layer[];
  onReset: () => void;
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

const typeHighlightColorMap: Record<LayerType, string> = {
    image: 'border-green-400 bg-green-500/30',
    shape: 'border-yellow-400 bg-yellow-500/30',
    text: 'border-red-400 bg-red-500/30',
};


const ResultDisplay: React.FC<ResultDisplayProps> = ({ imageUrl, layers, onReset }) => {
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
                        className={`absolute border-2 rounded-sm pointer-events-none transition-all duration-200 ${isActive ? typeHighlightColorMap[layer.type] + ' opacity-100' : 'opacity-0 border-transparent'}`}
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
              <button
                onClick={onReset}
                className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-all duration-300 text-sm transform hover:scale-105"
                >
                <RefreshCwIcon className="w-4 h-4 mr-2"/>
                Start Over
              </button>
          </div>
          
          <div className="bg-gray-900 p-4 rounded-lg border border-gray-700 h-96 lg:h-[28rem] overflow-y-auto custom-scrollbar">
            <ul className="space-y-3">
              {[...layers].reverse().map((layer, index) => {
                // Original index is needed for hover state, as we reversed the array for display
                const originalIndex = layers.length - 1 - index;
                return (
                    <li 
                        key={originalIndex}
                        onMouseEnter={() => setActiveLayerIndex(originalIndex)}
                        onMouseLeave={() => setActiveLayerIndex(null)}
                        className={`bg-gray-800 p-3 rounded-md border border-gray-700/50 transition-all duration-200 cursor-pointer ${activeLayerIndex === originalIndex ? 'bg-gray-700/80 border-blue-500/60' : 'hover:border-blue-500/50 hover:bg-gray-700/50'}`}
                    >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <LayerTypeIcon type={layer.type} />
                            <span className="font-semibold text-blue-300">{layer.name}</span>
                        </div>
                        <span className={`text-xs font-mono capitalize px-2 py-1 rounded-full border ${typeColorMap[layer.type] || 'bg-gray-700'}`}>
                            {layer.type}
                        </span>
                    </div>
                    <p className="text-sm text-gray-400 mt-2 pl-8">{layer.description}</p>
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
