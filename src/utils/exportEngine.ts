import { GIFEncoder, quantize, applyPalette } from 'gifenc';
import { Frame, Project } from '../types/flux';

/**
 * Composite a frame's visible layers into a temporary canvas
 */
export async function compositeFrameToCanvas(
  frame: Frame,
  width: number,
  height: number,
  layerCanvases: Map<string, HTMLCanvasElement>,
  includeBackground = true,
  skipBackgroundLayer = false
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  if (includeBackground && !skipBackgroundLayer) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
  }

  // Draw layers in order from bottom to top
  for (const layer of frame.layers) {
    if (!layer.visible) continue;
    if (skipBackgroundLayer && layer.name.toLowerCase().includes('background')) {
      continue;
    }
    const layerCanvas = layerCanvases.get(layer.id);
    if (!layerCanvas) continue;

    ctx.save();
    ctx.globalAlpha = layer.opacity;
    ctx.globalCompositeOperation = layer.blendMode || 'source-over';
    ctx.drawImage(layerCanvas, 0, 0);
    ctx.restore();
  }

  return canvas;
}

/**
 * Export animation as an animated GIF
 */
export async function exportToGif(
  project: Project,
  layerCanvasesMap: Map<string, Map<string, HTMLCanvasElement>>, // frameId -> (layerId -> Canvas)
  options: {
    scale?: number;
    fps?: number;
    includeBackground?: boolean;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<Blob> {
  const scale = options.scale ?? 1;
  const fps = options.fps ?? project.fps;
  const includeBackground = options.includeBackground ?? true;
  const targetWidth = Math.round(project.width * scale);
  const targetHeight = Math.round(project.height * scale);

  const gif = GIFEncoder();
  const delayMs = Math.round(1000 / fps);

  const totalFrames = project.frames.length;

  for (let i = 0; i < totalFrames; i++) {
    const frame = project.frames[i];
    const frameLayers = layerCanvasesMap.get(frame.id) || new Map();
    const frameCanvas = await compositeFrameToCanvas(
      frame,
      project.width,
      project.height,
      frameLayers,
      includeBackground
    );

    // Rescale if requested
    let renderCanvas = frameCanvas;
    if (scale !== 1) {
      const scaledCanvas = document.createElement('canvas');
      scaledCanvas.width = targetWidth;
      scaledCanvas.height = targetHeight;
      const sCtx = scaledCanvas.getContext('2d');
      if (sCtx) {
        sCtx.imageSmoothingEnabled = false; // pixel crisp
        sCtx.drawImage(frameCanvas, 0, 0, targetWidth, targetHeight);
      }
      renderCanvas = scaledCanvas;
    }

    const rCtx = renderCanvas.getContext('2d');
    if (!rCtx) continue;
    const imgData = rCtx.getImageData(0, 0, targetWidth, targetHeight);
    const palette = quantize(imgData.data, 256);
    const index = applyPalette(imgData.data, palette);

    // Calculate frame delay taking hold exposure into account
    const frameDelay = delayMs * Math.max(1, frame.duration || 1);

    gif.writeFrame(index, targetWidth, targetHeight, {
      palette,
      delay: frameDelay,
      repeat: 0, // loop forever
    });

    if (options.onProgress) {
      options.onProgress((i + 1) / totalFrames);
    }
  }

  gif.finish();
  const buffer = gif.bytes();
  return new Blob([buffer as unknown as BlobPart], { type: 'image/gif' });
}

/**
 * Export animation as a horizontal Sprite Sheet
 */
export async function exportToSpriteSheet(
  project: Project,
  layerCanvasesMap: Map<string, Map<string, HTMLCanvasElement>>,
  options: {
    columns?: number;
    transparent?: boolean;
  } = {}
): Promise<{ blob: Blob; metadata: string }> {
  const frameCount = project.frames.length;
  const cols = options.columns || frameCount;
  const rows = Math.ceil(frameCount / cols);

  const sheetWidth = cols * project.width;
  const sheetHeight = rows * project.height;

  const canvas = document.createElement('canvas');
  canvas.width = sheetWidth;
  canvas.height = sheetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  if (!options.transparent) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, sheetWidth, sheetHeight);
  }

  const framesMeta: Array<{ index: number; x: number; y: number; w: number; h: number; duration: number }> = [];

  for (let i = 0; i < frameCount; i++) {
    const frame = project.frames[i];
    const frameLayers = layerCanvasesMap.get(frame.id) || new Map();
    const frameCanvas = await compositeFrameToCanvas(
      frame,
      project.width,
      project.height,
      frameLayers,
      !options.transparent
    );

    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = col * project.width;
    const y = row * project.height;

    ctx.drawImage(frameCanvas, x, y);

    framesMeta.push({
      index: i,
      x,
      y,
      w: project.width,
      h: project.height,
      duration: frame.duration || 1,
    });
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to generate PNG blob'))), 'image/png');
  });

  const metadata = JSON.stringify(
    {
      app: 'FLUX Studio',
      title: project.title,
      width: sheetWidth,
      height: sheetHeight,
      frameWidth: project.width,
      frameHeight: project.height,
      fps: project.fps,
      frameCount,
      columns: cols,
      rows,
      frames: framesMeta,
    },
    null,
    2
  );

  return { blob, metadata };
}

/**
 * Trigger file download in browser
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
