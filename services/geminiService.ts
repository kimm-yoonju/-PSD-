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
        description: 'A brief explanation of what this layer contains. For text layers, this must include the text content and color hex code(s).'
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
  const prompt = `You are an expert graphic designer specializing in Photoshop. Your task is to analyze the provided image and break it down into a logical set of layers as if you were preparing it for editing in a PSD file.

For each layer, you will:
1.  Provide a short, descriptive 'name'.
2.  Classify its 'type' as one of three categories: "image", "shape", or "text".
3.  Provide a 'description' with specific details based on the layer type.
4.  Provide a 'boundingBox' with normalized coordinates (values between 0 and 1) for its position and size ('x', 'y', 'width', 'height').

LAYER DESCRIPTION REQUIREMENTS:
- For "image" layers (rasterized parts, photos): Describe the content (e.g., "A blurry forest landscape.", "A red sports car, front view.").
- For "shape" layers (vector-like elements, solid colors): Describe the shape and color (e.g., "A solid blue circle.", "A red rectangle with rounded corners.").
- For "text" layers: Your description MUST include the following, separated by a comma:
    1.  Text: The exact text content from the image.
    2.  Color Hex: Provide the hex code (e.g., "#FFFFFF"). If the text has a gradient, analyze the colors and provide the hex codes for the primary colors (e.g., "Gradient from #FF5733 to #C70039").

Structure your entire response as a single JSON array of layer objects. Order the layers from bottom (background) to top (foreground).`;

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


export async function extractImageLayer(base64Image: string, mimeType: string, layer: Layer): Promise<string> {
    const prompt = `You are an image editing expert. Your task is to perform a precise cutout. From the provided main image, extract the object located within this bounding box: ${JSON.stringify(layer.boundingBox)}. The object is described as: '${layer.description}'.
Your output MUST be ONLY the extracted object on a transparent background, cropped to its content. Do not include any other text or content in your response. Return a PNG image.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
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
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              return part.inlineData.data; // This is the base64 string
            }
        }
        
        throw new Error("No image data found in AI response for extraction.");

    } catch(error) {
        console.error("Error calling Gemini API for image extraction:", error);
        throw new Error("Failed to extract image layer with the AI model.");
    }
}