/**
 * FLUX Studio — Core Architecture Data Models & System Types
 */

export type ToolType =
  | 'brush'
  | 'pencil'
  | 'pen'
  | 'marker'
  | 'airbrush'
  | 'eraser'
  | 'lasso'
  | 'bucket'
  | 'eyedropper'
  | 'line'
  | 'rect'
  | 'ellipse'
  | 'hand';

export type BlendMode =
  | 'source-over'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference';

export interface BrushSettings {
  size: number;
  opacity: number;
  flow: number;
  hardness: number;
  stabilizer: number; // 0 (none) to 10 (maximum smoothing)
  pressureSensitivity: boolean;
}

export interface BrushPreset {
  id: string;
  name: string;
  tool: ToolType;
  settings: BrushSettings;
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number; // 0 to 1
  blendMode: BlendMode;
  alphaLock: boolean;
  dataUrl?: string; // Stored raster data URL for persistence
}

/**
 * Individual Animation Cel
 */
export interface Cel {
  frameId: string;
  layerId: string;
  dataUrl?: string;
  isEmpty: boolean;
}

export interface Frame {
  id: string;
  duration: number; // hold exposure multiplier in frames (default 1)
  layers: Layer[];
}

export interface OnionSkinSettings {
  enabled: boolean;
  prevFrames: number;
  nextFrames: number;
  prevColor: string; // Silhouette tint for preceding frames (e.g. orange/red)
  nextColor: string; // Silhouette tint for upcoming frames (e.g. cyan/blue)
  opacity: number; // 0 to 1
  tintMode?: 'colored' | 'original'; // Tinted colored silhouettes (FlipaClip style) or original artwork colors
}

export interface TimelineSettings {
  fps: number;
  loop: boolean;
  onionSkin: OnionSkinSettings;
}

export interface ProjectAsset {
  id: string;
  type: 'image' | 'palette' | 'audio';
  name: string;
  url: string;
  size?: number;
}

export interface ProjectMetadata {
  id: string;
  ownerId?: string;
  title: string;
  description?: string;
  width: number;
  height: number;
  fps: number;
  frameCount: number;
  layerCount: number;
  thumbnail?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Central Project Model (Versioned Schema)
 */
export interface Project {
  version: number;
  id: string;
  ownerId?: string;
  title: string;
  width: number;
  height: number;
  fps: number;
  backgroundColor: string; // Default canvas paper color (e.g. #ffffff)
  frames: Frame[];
  assets?: ProjectAsset[];
  createdAt: number;
  updatedAt: number;
}

export interface ReferenceImage {
  url: string;
  visible: boolean;
  opacity: number;
  x: number;
  y: number;
  width: number;
  height: number;
  locked: boolean;
}

export interface CanvasPoint {
  x: number;
  y: number;
  pressure: number;
}

export interface ViewportTransform {
  zoom: number;
  panX: number;
  panY: number;
}

export interface LassoSelection {
  active: boolean;
  points: CanvasPoint[];
  bounds: { x: number; y: number; width: number; height: number };
  floatingCanvas?: HTMLCanvasElement;
  dragStartX?: number;
  dragStartY?: number;
  offsetX: number;
  offsetY: number;
  isDragging?: boolean;
}

export interface SelectionArea {
  active: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
}
