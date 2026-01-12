import { writePsd, Layer as PsdLayer } from 'ag-psd';
import { Layer, LayerType } from '../types';

const typeToRgba: Record<LayerType, [number, number, number, number]> = {
    image: [74, 222, 128, 100], // green-400 at ~40%
    shape: [250, 204, 21, 100], // yellow-400 at ~40%
    text: [248, 113, 113, 100], // red-400 at ~40%
};


// Helper to load an image from a URL and return its pixel data
async function loadImageData(url: string): Promise<{ data: Uint8ClampedArray; width: number; height: number; }> {
    const response = await fetch(url);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);
    
    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error("Could not create canvas context");

    ctx.drawImage(imageBitmap, 0, 0);
    return {
        data: ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height).data,
        width: imageBitmap.width,
        height: imageBitmap.height,
    };
}

// Helper to load an image from a base64 string
async function loadImageDataFromBase64(base64: string): Promise<{ data: Uint8ClampedArray; width: number; height: number; }> {
    const url = `data:image/png;base64,${base64}`;
    return loadImageData(url);
}


export async function exportToPsd(imageUrl: string, layers: Layer[]): Promise<Uint8Array> {
    const { data: baseImageData, width, height } = await loadImageData(imageUrl);

    const psdLayers: PsdLayer[] = [
        {
            name: 'Original Image',
            imageData: baseImageData,
            left: 0,
            top: 0,
            right: width,
            bottom: height,
        }
    ];

    // Create a transparent canvas for layer guides
    const layerCanvas = new OffscreenCanvas(width, height);
    const ctx = layerCanvas.getContext('2d');
    if (!ctx) throw new Error("Could not create layer canvas context");

    for (const layer of layers) {
        // If layer is an image and has been extracted, use the actual image data
        if (layer.type === 'image' && layer.extractedImage) {
            const { data: extractedData, width: extractedWidth, height: extractedHeight } = await loadImageDataFromBase64(layer.extractedImage);
            
            const left = Math.round(layer.boundingBox.x * width);
            const top = Math.round(layer.boundingBox.y * height);

            psdLayers.push({
                name: `[Extracted] ${layer.name}`,
                imageData: extractedData,
                left: left,
                top: top,
                right: left + extractedWidth,
                bottom: top + extractedHeight,
            });
            continue; // Move to the next layer
        }

        // Otherwise, draw a colored box as a guide
        ctx.clearRect(0, 0, width, height);
        
        const [r, g, b, a] = typeToRgba[layer.type];
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        
        const rect = {
            x: Math.round(layer.boundingBox.x * width),
            y: Math.round(layer.boundingBox.y * height),
            w: Math.round(layer.boundingBox.width * width),
            h: Math.round(layer.boundingBox.height * height),
        };

        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        const layerImageData = ctx.getImageData(0, 0, width, height).data;

        psdLayers.push({
            name: `[${layer.type.toUpperCase()}] ${layer.name}`,
            imageData: layerImageData,
            left: 0,
            top: 0,
            right: width,
            bottom: height,
            opacity: 0.7,
        });
    }

    // Reverse the layers so they are ordered correctly in Photoshop (top-most layer first)
    psdLayers.reverse();

    const psdBuffer = writePsd({
        width,
        height,
        children: psdLayers,
    });

    return new Uint8Array(psdBuffer);
}