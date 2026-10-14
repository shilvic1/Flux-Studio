declare module 'gifenc' {
  export interface GIFEncoderOptions {
    palette?: number[][];
    delay?: number;
    repeat?: number;
    transparent?: number;
  }

  export interface GIFEncoderInstance {
    writeFrame: (
      index: Uint8Array,
      width: number,
      height: number,
      options?: GIFEncoderOptions
    ) => void;
    finish: () => void;
    bytes: () => Uint8Array;
    reset: () => void;
  }

  export function GIFEncoder(): GIFEncoderInstance;
  export function quantize(rgbaData: Uint8ClampedArray | Uint8Array, maxColors: number): number[][];
  export function applyPalette(rgbaData: Uint8ClampedArray | Uint8Array, palette: number[][]): Uint8Array;
}
