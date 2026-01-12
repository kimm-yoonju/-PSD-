import React, { useState, useCallback } from 'react';
import ImageUploader from './components/ImageUploader';
import ResultDisplay from './components/ResultDisplay';
import Loader from './components/Loader';
import { Layer } from './types';
import { analyzeImageForLayers } from './services/geminiService';

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

const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [layers, setLayers] = useState<Layer[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

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
  };
  
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
          <ResultDisplay imageUrl={imageUrl} layers={layers} onReset={handleReset} />
        )}
      </main>
    </div>
  );
};

export default App;
