import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Layer } from '../types';

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const layerSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      name: {
        type: Type.STRING,
        description: 'A short, descriptive name for the layer (e.g., "Background", "Main Subject", "Title Text").'
      },
      description: {
        type: Type.STRING,
        description: 'A brief explanation of what this layer contains (e.g., "A blurry forest landscape.", "A red sports car, front view.", "Headline text reading \'SALE!\'.").'
      },
      type: {
        type: Type.STRING,
        description: 'The category of the layer. Must be one of "image", "shape", or "text".'
      },
      boundingBox: {
        type: Type.OBJECT,
        description: 'A box defining the layer\'s position and size. All values are normalized (0 to 1).',
        properties: {
            x: { type: Type.NUMBER, description: 'Top-left corner X coordinate.'},
            y: { type: Type.NUMBER, description: 'Top-left corner Y coordinate.'},
            width: { type: Type.NUMBER, description: 'Width of the box.'},
            height: { type: Type.NUMBER, description: 'Height of the box.'},
        },
        required: ["x", "y", "width", "height"]
      }
    },
    required: ["name", "description", "type", "boundingBox"]
  }
};

export async function analyzeImageForLayers(base64Image: string, mimeType: string): Promise<Layer[]> {
  const prompt = `You are an expert graphic designer specializing in Photoshop. Your task is to analyze the provided image and break it down into a logical set of layers as if you were preparing it for editing in a PSD file. For each layer, classify it into one of three types: "image" (for rasterized parts like photos or complex graphics), "shape" (for vector-like solid color elements, geometric forms, or simple gradients), or "text" (for any typographic elements). Provide a short, descriptive name and a brief description of what the layer contains. Crucially, for each layer, you must also provide a 'boundingBox' with normalized coordinates (values between 0 and 1) for its position and size. The bounding box must have four properties: 'x' (distance from the left edge), 'y' (distance from the top edge), 'width', and 'height'. Structure your response as a JSON array of objects. Order the layers from bottom (background) to top (foreground).`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: {
            parts: [
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image,
                    },
                },
                { text: prompt },
            ],
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: layerSchema,
        },
    });
    
    const jsonText = response.text;
    if (!jsonText) {
        throw new Error("API returned an empty response.");
    }

    const parsedJson = JSON.parse(jsonText);
    
    // Basic validation
    if (!Array.isArray(parsedJson) || parsedJson.some(item => !item.name || !item.description || !item.type || !item.boundingBox)) {
      throw new Error("Invalid JSON structure received from API.");
    }

    return parsedJson as Layer[];

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to communicate with the AI model.");
  }
}
