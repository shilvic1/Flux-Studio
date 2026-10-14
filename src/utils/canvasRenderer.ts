import { BlendMode, BrushSettings, CanvasPoint, ToolType } from '../types/flux';

/**
 * High-performance 2D drawing and raster compositing utilities for FLUX Studio
 */

// Helper to convert hex to RGB
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  if (!hex) return { r: 0, g: 0, b: 0 };
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return { r: 0, g: 0, b: 0 };
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

// Convert RGB to Hex
export function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

/**
 * Render a stroke segment between points on a target canvas context
 */
export function drawStrokeSegment(
  ctx: CanvasRenderingContext2D,
  p1: CanvasPoint,
  p2: CanvasPoint,
  tool: ToolType,
  brush: BrushSettings,
  colorHex: string,
  alphaLock = false
) {
  const rgb = hexToRgb(colorHex);
  const pressure = brush.pressureSensitivity ? Math.max(0.1, p2.pressure) : 1;
  const currentSize = Math.max(1, brush.size * pressure);
  const opacity = typeof brush.opacity === 'number' ? Math.max(0.01, Math.min(1, brush.opacity)) : 1;

  ctx.save();

  if (tool === 'eraser') {
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = opacity;
  } else if (alphaLock) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.globalAlpha = opacity;
  } else {
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = opacity;
  }

  const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);

  if (tool === 'pen' || tool === 'pencil' || (tool === 'brush' && brush.hardness >= 0.85)) {
    ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (dist < 0.5) {
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, currentSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  } else if (tool === 'eraser') {
    ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
    ctx.fillStyle = 'rgba(0, 0, 0, 1)';
    ctx.lineWidth = currentSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (dist < 0.5) {
      ctx.beginPath();
      ctx.arc(p1.x, p1.y, currentSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  } else if (tool === 'marker') {
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.5)`;
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, currentSize * 0.2)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      ctx.fillRect(x - currentSize / 2, y - currentSize / 4, currentSize, currentSize / 2);
    }
  } else if (tool === 'airbrush') {
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, currentSize * 0.3)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, currentSize);
      grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.2)`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, currentSize, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    // Soft brush with radial gradient stamp
    const steps = Math.max(1, Math.ceil(dist / Math.max(1, currentSize * 0.2)));
    const radius = currentSize / 2;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const grad = ctx.createRadialGradient(x, y, radius * Math.max(0.1, brush.hardness), x, y, radius);
      grad.addColorStop(0, `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`);
      grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * Accurate 4-way Flood Fill algorithm for raster canvas
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  startX: number,
  startY: number,
  fillColorHex: string,
  tolerance = 32
) {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;
  const x0 = Math.floor(startX);
  const y0 = Math.floor(startY);

  if (x0 < 0 || x0 >= width || y0 < 0 || y0 >= height) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const startIndex = (y0 * width + x0) * 4;
  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];

  const fillRgb = hexToRgb(fillColorHex);
  const fillR = fillRgb.r;
  const fillG = fillRgb.g;
  const fillB = fillRgb.b;
  const fillA = 255;

  // Don't fill if identical
  if (
    Math.abs(targetR - fillR) <= 2 &&
    Math.abs(targetG - fillG) <= 2 &&
    Math.abs(targetB - fillB) <= 2 &&
    Math.abs(targetA - fillA) <= 2
  ) {
    return;
  }

  function matches(idx: number): boolean {
    const dr = Math.abs(data[idx] - targetR);
    const dg = Math.abs(data[idx + 1] - targetG);
    const db = Math.abs(data[idx + 2] - targetB);
    const da = Math.abs(data[idx + 3] - targetA);
    return dr <= tolerance && dg <= tolerance && db <= tolerance && da <= tolerance;
  }

  const stack: number[] = [x0, y0];
  const visited = new Uint8Array(width * height);

  while (stack.length > 0) {
    const cy = stack.pop()!;
    const cx = stack.pop()!;
    const pixelIndex = cy * width + cx;

    if (visited[pixelIndex]) continue;
    visited[pixelIndex] = 1;

    const idx = pixelIndex * 4;
    if (!matches(idx)) continue;

    data[idx] = fillR;
    data[idx + 1] = fillG;
    data[idx + 2] = fillB;
    data[idx + 3] = fillA;

    if (cx > 0) stack.push(cx - 1, cy);
    if (cx < width - 1) stack.push(cx + 1, cy);
    if (cy > 0) stack.push(cx, cy - 1);
    if (cy < height - 1) stack.push(cx, cy + 1);
  }

  ctx.putImageData(imgData, 0, 0);
}

/**
 * Draw shapes (Line, Rectangle, Ellipse)
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  start: CanvasPoint,
  end: CanvasPoint,
  tool: 'line' | 'rect' | 'ellipse',
  brush: BrushSettings,
  colorHex: string,
  alphaLock = false
) {
  const rgb = hexToRgb(colorHex);
  const opacity = typeof brush.opacity === 'number' ? Math.max(0.01, Math.min(1, brush.opacity)) : 1;
  const strokeColor = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
  const lineWidth = Math.max(1, brush.size);

  ctx.save();

  if (alphaLock) {
    ctx.globalCompositeOperation = 'source-atop';
  } else {
    ctx.globalCompositeOperation = 'source-over';
  }

  ctx.strokeStyle = strokeColor;
  ctx.fillStyle = strokeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'line') {
    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    if (dist < 1) {
      // If start and end are practically identical, draw a solid circle dot
      ctx.beginPath();
      ctx.arc(start.x, start.y, lineWidth / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  } else if (tool === 'rect') {
    const x = Math.min(start.x, end.x);
    const y = Math.min(start.y, end.y);
    const w = Math.max(1, Math.abs(end.x - start.x));
    const h = Math.max(1, Math.abs(end.y - start.y));
    ctx.strokeRect(x, y, w, h);
  } else if (tool === 'ellipse') {
    const rx = Math.max(0.5, Math.abs(end.x - start.x) / 2);
    const ry = Math.max(0.5, Math.abs(end.y - start.y) / 2);
    const cx = (start.x + end.x) / 2;
    const cy = (start.y + end.y) / 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Check if a 2D coordinate is inside a polygon path
 */
export function pointInPolygon(x: number, y: number, points: CanvasPoint[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Tint an image canvas into a silhouette color for onion skinning
 */
export function renderTintedCanvas(
  sourceCanvas: HTMLCanvasElement,
  tintHex: string
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Draw source image
  ctx.drawImage(sourceCanvas, 0, 0);

  // Tint using source-in
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = tintHex;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  return canvas;
}
