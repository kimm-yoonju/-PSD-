export type LayerType = 'image' | 'shape' | 'text';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Layer {
  name: string;
  description: string;
  type: LayerType;
  boundingBox: BoundingBox;
}
