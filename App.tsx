import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import Loader from './components/Loader';
import { Layer } from './types';
import { analyzeImageForLayers, extractImageLayer } from './services/geminiService';
import { exportToPsd } from './services/psdService';

// Helper function to convert a File to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // remove 'data:image/jpeg;base64,' part
      resolve(result.split(',')[1]);
    };
    reader.onerror = (error) => reject(error);
  });
};

const Modal: React.FC<{ imageUrl: string; onClose: () => void; onDownload: () => void }> = ({ imageUrl, onClose, onDownload }) => (
    <div 
        className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in"
        onClick={onClose}
    >
        <div 
            className="bg-gray-800 rounded-lg shadow-xl p-4 relative max-w-2xl w-full mx-4"
            onClick={(e) => e.stopPropagation()}
        >
            <h3 className="text-lg font-semibold text-gray-200 mb-4">Extracted Layer</h3>
            <div className="bg-white/10 rounded-md p-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgZmlsbD0ibm9uZSI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjNDE0NzU1Ii8+PHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iOCIgZmlsbD0iIzMxMzY0MiIvPjxyZWN0IHg9IjgiIHk9IjgiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiMzMTM2NDIiLz48L3N2Zz4=')]">
                <img src={imageUrl} alt="Extracted layer" className="max-h-[60vh] w-auto mx-auto" />
            </div>
            <div className="mt-4 flex justify-end gap-3">
                 <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-md font-semibold transition-colors">
                    Close
                </button>
                <a
                    href={imageUrl}
                    download="extracted-layer.png"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-colors"
                >
                    Download
                </a>
            </div>
        </div>
    </div>
);


const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [extractingLayerIndex, setExtractingLayerIndex] = useState<number | null>(null);
  const [modalImage, setModalImage] = useState<string | null>(null);
  const [isExportingPsd, setIsExportingPsd] = useState(false);


  const processImage = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    setLayers(null);

    try {
      setStatusMessage('Converting image for analysis...');
      const base64Image = await fileToBase64(file);
      
      setStatusMessage('AI is analyzing image layers...');
      const analyzedLayers = await analyzeImageForLayers(base64Image, file.type);
      
      setLayers(analyzedLayers);
    } catch (err) {
      console.error(err);
      setError('Failed to analyze the image. Please try again with a different image.');
    } finally {
      setIsLoading(false);
      setStatusMessage('');
    }
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    setImageFile(file);
    setImageUrl(URL.createObjectURL(file));
    processImage(file);
  }, [processImage]);

  const handleReset = () => {
    setImageFile(null);
    setImageUrl(null);
    setLayers(null);
    setIsLoading(false);
    setError(null);
    setStatusMessage('');
    setExtractingLayerIndex(null);
    setModalImage(null);
    setIsExportingPsd(false);
  };
  
  const handleExtractLayer = useCallback(async (layerIndex: number) => {
    if (!imageFile || !layers) return;
    const targetLayer = layers[layerIndex];

    // Use cached image if available
    if (targetLayer.extractedImage) {
        setModalImage(`data:image/png;base64,${targetLayer.extractedImage}`);
        return;
    }

    setExtractingLayerIndex(layerIndex);
    setError(null);
    try {
        const base64Image = await fileToBase64(imageFile);
        const extractedBase64 = await extractImageLayer(base64Image, imageFile.type, targetLayer);

        const updatedLayers = [...layers];
        updatedLayers[layerIndex] = { ...targetLayer, extractedImage: extractedBase64 };
        setLayers(updatedLayers);
        setModalImage(`data:image/png;base64,${extractedBase64}`);

    } catch (err) {
        console.error(err);
        setError('Failed to extract the layer. The AI may not have been able to isolate it.');
    } finally {
        setExtractingLayerIndex(null);
    }
  }, [imageFile, layers]);

  const handleExportPsd = useCallback(async () => {
    if (!imageUrl || !layers || !imageFile) return;

    setIsExportingPsd(true);
    setError(null);
    try {
        const psdBytes = await exportToPsd(imageUrl, layers);
        const blob = new Blob([psdBytes], { type: 'application/vnd.adobe.photoshop' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const originalFileName = imageFile.name.substring(0, imageFile.name.lastIndexOf('.')) || imageFile.name;
        link.download = `${originalFileName}-layers.psd`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
    } catch(err) {
        console.error(err);
        setError('Failed to export PSD file.');
    } finally {
        setIsExportingPsd(false);
    }
  }, [imageUrl, layers, imageFile]);

  const Header: React.FC = () => (
    <header className="text-center p-4 md:p-6">
      <h1 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
        AI PSD Layer Architect
      </h1>
      <p className="text-gray-400 mt-2 text-sm md:text-base max-w-2xl mx-auto">
        Upload an image to generate a professional layer breakdown for easy editing in Photoshop.
      </p>
    </header>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-4">
      {modalImage && <Modal imageUrl={modalImage} onClose={() => setModalImage(null)} onDownload={() => {}} />}
      <Header />
      <main className="w-full max-w-6xl flex-grow flex flex-col items-center justify-center">
        {!imageUrl && <ImageUploader onImageUpload={handleImageUpload} />}
        {isLoading && <Loader message={statusMessage} />}
        {error && (
          <div className="text-center p-8 bg-gray-800 rounded-lg">
            <p className="text-red-400 font-semibold mb-4">{error}</p>
            <button
              onClick={handleReset}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-semibold transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
        {imageUrl && layers && !isLoading && (
          <ResultDisplay 
            imageUrl={imageUrl} 
            layers={layers} 
            onReset={handleReset} 
            onExtractLayer={handleExtractLayer}
            extractingLayerIndex={extractingLayerIndex}
            onExportPsd={handleExportPsd}
            isExportingPsd={isExportingPsd}
            />
        )}
      </main>
    </div>
  );
};

export default App;