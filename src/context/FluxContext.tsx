import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser, testConnection } from '../firebase/config';
import { syncUserProfile, saveProjectToCloud, loadProjectFromCloud } from '../firebase/syncService';
import {
  BlendMode,
  BrushSettings,
  Frame,
  Layer,
  OnionSkinSettings,
  Project,
  ReferenceImage,
  ToolType,
  ViewportTransform,
} from '../types/flux';
import { loadLastActiveProject, saveProjectLocally } from '../utils/storage';
import { compositeFrameToCanvas } from '../utils/exportEngine';
import { formatDuplicateTitle } from '../utils/naming';

interface UndoState {
  frameId: string;
  layerId: string;
  imageData: ImageData;
}

interface FluxContextType {
  // Project & Frame
  project: Project;
  setProject: React.Dispatch<React.SetStateAction<Project>>;
  currentFrameIndex: number;
  setCurrentFrameIndex: (idx: number) => void;
  currentLayerId: string;
  setCurrentLayerId: (id: string) => void;
  currentFrame: Frame;
  currentLayer: Layer | undefined;

  // Frame operations
  addFrame: (afterIndex?: number) => void;
  duplicateFrame: (index: number) => void;
  deleteFrame: (index: number) => void;
  clearFrame: (index: number) => void;
  reorderFrames: (fromIndex: number, toIndex: number) => void;
  setFrameDuration: (index: number, duration: number) => void;

  // Layer operations
  addLayer: () => void;
  duplicateLayer: (layerId: string) => void;
  deleteLayer: (layerId: string) => void;
  reorderLayers: (fromIndex: number, toIndex: number) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  mergeLayerDown: (layerId: string) => void;
  clearCurrentLayer: () => void;

  // Tool & Brush
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  brush: BrushSettings;
  updateBrush: (updates: Partial<BrushSettings>) => void;
  color: string;
  setColor: (hex: string) => void;
  secondaryColor: string;
  setSecondaryColor: (hex: string) => void;
  palette: string[];
  addToPalette: (hex: string) => void;

  // Animation Playback
  isPlaying: boolean;
  togglePlayback: () => void;
  stopPlayback: () => void;
  fps: number;
  setFps: (fps: number) => void;
  loop: boolean;
  setLoop: (loop: boolean) => void;

  // Onion skin
  onionSkin: OnionSkinSettings;
  updateOnionSkin: (updates: Partial<OnionSkinSettings>) => void;

  // Viewport
  viewport: ViewportTransform;
  setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
  resetViewport: () => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // Undo / Redo
  canUndo: boolean;
  canRedo: boolean;
  pushUndo: (layerId?: string) => void;
  undo: () => void;
  redo: () => void;

  // In-memory Canvas Layer Map
  layerCanvasesMap: React.MutableRefObject<Map<string, Map<string, HTMLCanvasElement>>>;
  getLayerCanvas: (frameId: string, layerId: string) => HTMLCanvasElement;
  triggerCanvasUpdate: () => void;
  canvasVersion: number;

  // Auth & Cloud
  user: User | null;
  isAuthLoading: boolean;
  signIn: () => Promise<void>;
  signOutUser: () => Promise<void>;
  cloudSyncStatus: 'idle' | 'saving' | 'synced' | 'error';
  syncToCloudNow: () => Promise<void>;
  loadCloudProject: (id: string) => Promise<void>;

  // View & UI Navigation
  currentView: 'home' | 'editor';
  setCurrentView: (view: 'home' | 'editor') => void;
  isRulerActive: boolean;
  setIsRulerActive: React.Dispatch<React.SetStateAction<boolean>>;
  isInspectorOpen: boolean;
  setIsInspectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isTimelineCollapsed: boolean;
  setIsTimelineCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  accentColor: string;
  setAccentColor: (color: string) => void;
  // Reference Image
  referenceImage: ReferenceImage | null;
  setReferenceImage: React.Dispatch<React.SetStateAction<ReferenceImage | null>>;
  updateReferenceImage: (updates: Partial<ReferenceImage>) => void;

  // Project management
  createNewProject: (width: number, height: number, fps: number, title?: string) => void;
  loadProject: (project: Project) => void;
  updateProjectTitle: (title: string) => void;
}

const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;

function createDefaultProject(width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, fps = 12, title = 'New Animation'): Project {
  const frameId = 'frame_' + Date.now();
  const bgLayerId = 'layer_bg_' + Date.now();
  const drawLayerId = 'layer_draw_' + Date.now();

  return {
    version: 1,
    id: 'proj_' + Math.random().toString(36).substring(2, 9),
    title,
    width,
    height,
    fps,
    backgroundColor: '#ffffff',
    frames: [
      {
        id: frameId,
        duration: 1,
        layers: [
          {
            id: drawLayerId,
            name: 'Layer 1',
            visible: true,
            locked: false,
            opacity: 1,
            blendMode: 'source-over',
            alphaLock: false,
          },
        ],
      },
    ],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

const FluxContext = createContext<FluxContextType | null>(null);

export const FluxProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<Project>(() => createDefaultProject());
  const [currentFrameIndex, setCurrentFrameIndex] = useState(0);
  const [currentLayerId, setCurrentLayerId] = useState<string>('');
  const [canvasVersion, setCanvasVersion] = useState(0);

  // In-memory offscreen canvases: frameId -> (layerId -> HTMLCanvasElement)
  const layerCanvasesMap = useRef<Map<string, Map<string, HTMLCanvasElement>>>(new Map());

  // Tools & Brush
  const [activeTool, setActiveTool] = useState<ToolType>('brush');
  const [brush, setBrush] = useState<BrushSettings>({
    size: 8,
    opacity: 1,
    flow: 1,
    hardness: 0.8,
    stabilizer: 2,
    pressureSensitivity: true,
  });
  const [color, setColor] = useState('#22c55e');
  const [secondaryColor, setSecondaryColor] = useState('#ffffff');
  const [palette, setPalette] = useState<string[]>([
    '#000000',
    '#ffffff',
    '#ef4444',
    '#f97316',
    '#facc15',
    '#22c55e',
    '#06b6d4',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#71717a',
    '#3f3f46',
  ]);

  // Animation Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [fps, setFps] = useState(12);
  const [loop, setLoop] = useState(true);

  // Onion Skin
  const [onionSkin, setOnionSkin] = useState<OnionSkinSettings>({
    enabled: true,
    prevFrames: 2,
    nextFrames: 1,
    prevColor: '#f97316', // Orange/Red for previous
    nextColor: '#06b6d4', // Cyan for future
    opacity: 0.35,
    tintMode: 'colored',
  });

  // Viewport
  const [viewport, setViewport] = useState<ViewportTransform>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });

  // View Navigation (starts on 'home' per request)
  const [currentView, setCurrentView] = useState<'home' | 'editor'>('home');

  // UI Workspace States (responsive & collapsible)
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [accentColor, setAccentColor] = useState('#00a8ff'); // FlipaClip cyan blue

  // Reference Image on Canvas (draggable & scalable)
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);

  const updateReferenceImage = (updates: Partial<ReferenceImage>) => {
    setReferenceImage((prev: ReferenceImage | null) => (prev ? { ...prev, ...updates } : null));
  };

  // Undo / Redo Stacks
  const undoStack = useRef<UndoState[]>([]);
  const redoStack = useRef<UndoState[]>([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Auth & Cloud Sync
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'saving' | 'synced' | 'error'>('idle');

  // Helper to force canvas re-render
  const triggerCanvasUpdate = () => {
    setCanvasVersion(v => v + 1);
  };

  // Helper to get or create layer canvas
  const getLayerCanvas = (frameId: string, layerId: string): HTMLCanvasElement => {
    let frameMap = layerCanvasesMap.current.get(frameId);
    if (!frameMap) {
      frameMap = new Map();
      layerCanvasesMap.current.set(frameId, frameMap);
    }

    let canvas = frameMap.get(layerId);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = project.width;
      canvas.height = project.height;

      const frame = project.frames.find(f => f.id === frameId);
      const layer = frame?.layers.find(l => l.id === layerId);
      const ctx = canvas.getContext('2d');

      // If layer has dataUrl saved, load it into canvas
      if (layer?.dataUrl) {
        const img = new Image();
        img.onload = () => {
          ctx?.drawImage(img, 0, 0);
          triggerCanvasUpdate();
        };
        img.src = layer.dataUrl;
      }

      frameMap.set(layerId, canvas);
    }
    return canvas;
  };

  // Initialize Layer canvases from project
  const hydrateCanvasesFromProject = (proj: Project) => {
    layerCanvasesMap.current.clear();
    for (const frame of proj.frames) {
      const frameMap = new Map<string, HTMLCanvasElement>();
      layerCanvasesMap.current.set(frame.id, frameMap);

      for (const layer of frame.layers) {
        const canvas = document.createElement('canvas');
        canvas.width = proj.width;
        canvas.height = proj.height;
        const ctx = canvas.getContext('2d');

        if (layer.dataUrl) {
          const img = new Image();
          img.onload = () => {
            ctx?.drawImage(img, 0, 0);
            triggerCanvasUpdate();
          };
          img.src = layer.dataUrl;
        }

        frameMap.set(layer.id, canvas);
      }
    }
  };

  // Safe current Frame & Layer
  const currentFrame = project.frames[currentFrameIndex] || project.frames[0];
  const currentLayer = currentFrame?.layers.find(l => l.id === currentLayerId) || currentFrame?.layers[currentFrame.layers.length - 1];

  // Set default currentLayerId when frame changes or on load
  useEffect(() => {
    if (currentFrame && currentFrame.layers.length > 0) {
      if (!currentFrame.layers.some(l => l.id === currentLayerId)) {
        setCurrentLayerId(currentFrame.layers[currentFrame.layers.length - 1].id);
      }
    }
  }, [currentFrameIndex, currentFrame, currentLayerId]);

  // Auth listener
  useEffect(() => {
    testConnection();
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      setIsAuthLoading(false);
      if (u) {
        syncUserProfile().catch(console.warn);
      }
    });
    return () => unsubscribe();
  }, []);

  // Restore project on initial mount
  useEffect(() => {
    loadLastActiveProject().then(saved => {
      if (saved && saved.frames && saved.frames.length > 0) {
        // Sanitize legacy "Background" layers that were auto-created as solid white sheets
        const cleanedFrames = saved.frames.map(frame => {
          let layers = frame.layers;
          if (layers.length > 1 && layers.some(l => l.name.toLowerCase().includes('background'))) {
            layers = layers.filter(l => !l.name.toLowerCase().includes('background'));
          } else {
            layers = layers.map(l => ({
              ...l,
              name: l.name.toLowerCase().includes('background') ? 'Layer 1' : l.name,
            }));
          }
          return {
            ...frame,
            layers: layers.length > 0 ? layers : [{
              id: 'layer_' + Date.now(),
              name: 'Layer 1',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over' as const,
              alphaLock: false,
            }],
          };
        });
        const cleanedProj = { ...saved, frames: cleanedFrames };
        setProject(cleanedProj);
        setFps(cleanedProj.fps || 12);
        hydrateCanvasesFromProject(cleanedProj);
      } else {
        hydrateCanvasesFromProject(project);
      }
    });
  }, []);

  // Auto-save to IndexedDB debounced
  useEffect(() => {
    const timer = setTimeout(() => {
      // Serialize current frame layers dataUrls before saving
      const updatedFrames = project.frames.map(f => {
        const frameMap = layerCanvasesMap.current.get(f.id);
        const layers = f.layers.map(l => {
          const canvas = frameMap?.get(l.id);
          const dataUrl = canvas ? canvas.toDataURL('image/png') : l.dataUrl;
          return { ...l, dataUrl };
        });
        return { ...f, layers };
      });

      const updatedProj = { ...project, frames: updatedFrames, fps, updatedAt: Date.now() };
      saveProjectLocally(updatedProj);
    }, 1200);

    return () => clearTimeout(timer);
  }, [project, canvasVersion, fps]);

  // Undo / Redo mechanics
  const pushUndo = (targetLayerId?: string) => {
    const layerIdToSave = targetLayerId || currentLayerId;
    if (!currentFrame || !layerIdToSave) return;

    const canvas = getLayerCanvas(currentFrame.id, layerIdToSave);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    undoStack.current.push({
      frameId: currentFrame.id,
      layerId: layerIdToSave,
      imageData: imgData,
    });

    if (undoStack.current.length > 30) {
      undoStack.current.shift();
    }

    redoStack.current = [];
    setCanUndo(true);
    setCanRedo(false);
  };

  const undo = () => {
    if (undoStack.current.length === 0) return;
    const lastAction = undoStack.current.pop()!;
    const canvas = getLayerCanvas(lastAction.frameId, lastAction.layerId);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const currentImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      redoStack.current.push({
        frameId: lastAction.frameId,
        layerId: lastAction.layerId,
        imageData: currentImgData,
      });

      ctx.putImageData(lastAction.imageData, 0, 0);
      triggerCanvasUpdate();
    }
    setCanUndo(undoStack.current.length > 0);
    setCanRedo(true);
  };

  const redo = () => {
    if (redoStack.current.length === 0) return;
    const nextAction = redoStack.current.pop()!;
    const canvas = getLayerCanvas(nextAction.frameId, nextAction.layerId);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const currentImgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      undoStack.current.push({
        frameId: nextAction.frameId,
        layerId: nextAction.layerId,
        imageData: currentImgData,
      });

      ctx.putImageData(nextAction.imageData, 0, 0);
      triggerCanvasUpdate();
    }
    setCanUndo(true);
    setCanRedo(redoStack.current.length > 0);
  };

  // Keyboard shortcuts (Z, Y, Space, Playback, Numbers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      } else if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(p => !p);
      } else if (e.key === 'b' || e.key === 'B') {
        setActiveTool('brush');
      } else if (e.key === 'e' || e.key === 'E') {
        setActiveTool('eraser');
      } else if (e.key === 'g' || e.key === 'G') {
        setActiveTool('bucket');
      } else if (e.key === 'i' || e.key === 'I') {
        setActiveTool('eyedropper');
      } else if (e.key === 'h' || e.key === 'H') {
        setActiveTool('hand');
      } else if (e.key === 'l' || e.key === 'L') {
        setActiveTool('line');
      } else if (e.key === 'u' || e.key === 'U') {
        setActiveTool('rect');
      } else if (e.key === 'x' || e.key === 'X') {
        setColor(c => {
          setSecondaryColor(c);
          return secondaryColor;
        });
      } else if (e.key === '[') {
        setBrush(b => ({ ...b, size: Math.max(1, b.size - 2) }));
      } else if (e.key === ']') {
        setBrush(b => ({ ...b, size: Math.min(200, b.size + 2) }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentFrameIndex(idx => Math.max(0, idx - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentFrameIndex(idx => Math.min(project.frames.length - 1, idx + 1));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [project.frames.length, canUndo, canRedo]);

  // Animation Playback Engine with requestAnimationFrame
  useEffect(() => {
    if (!isPlaying || project.frames.length <= 1) return;

    let animationFrameId: number;
    let lastTime = performance.now();
    let currentExposureCount = 0;

    const step = (time: number) => {
      const interval = 1000 / fps;
      const elapsed = time - lastTime;

      if (elapsed >= interval) {
        lastTime = time - (elapsed % interval);
        currentExposureCount++;

        setCurrentFrameIndex(curr => {
          const currentFrameObj = project.frames[curr];
          const hold = Math.max(1, currentFrameObj?.duration || 1);

          if (currentExposureCount >= hold) {
            currentExposureCount = 0;
            const nextIdx = curr + 1;
            if (nextIdx >= project.frames.length) {
              return loop ? 0 : curr;
            }
            return nextIdx;
          }
          return curr;
        });
      }

      animationFrameId = requestAnimationFrame(step);
    };

    animationFrameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, fps, project.frames, loop]);

  // Frame operations
  const addFrame = (afterIndex?: number) => {
    const targetIdx = afterIndex ?? currentFrameIndex;
    const newFrameId = 'frame_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);

    // Create fresh layers identical in structure to current frame
    const newLayers: Layer[] = currentFrame.layers.map((l, i) => ({
      id: 'layer_' + Date.now() + '_' + i,
      name: l.name,
      visible: true,
      locked: false,
      opacity: l.opacity,
      blendMode: l.blendMode,
      alphaLock: false,
    }));

    const newFrame: Frame = {
      id: newFrameId,
      duration: 1,
      layers: newLayers,
    };

    const newFrames = [...project.frames];
    newFrames.splice(targetIdx + 1, 0, newFrame);

    setProject(p => ({ ...p, frames: newFrames }));
    setCurrentFrameIndex(targetIdx + 1);
    setCurrentLayerId(newLayers[newLayers.length - 1].id);
    triggerCanvasUpdate();
  };

  const duplicateFrame = (index: number) => {
    const sourceFrame = project.frames[index];
    if (!sourceFrame) return;

    const newFrameId = 'frame_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const sourceMap = layerCanvasesMap.current.get(sourceFrame.id);

    const newLayers: Layer[] = [];
    const newFrameMap = new Map<string, HTMLCanvasElement>();

    for (const l of sourceFrame.layers) {
      const newLayerId = 'layer_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
      newLayers.push({
        id: newLayerId,
        name: l.name,
        visible: l.visible,
        locked: l.locked,
        opacity: l.opacity,
        blendMode: l.blendMode,
        alphaLock: l.alphaLock,
      });

      // Clone canvas content
      const oldCanvas = sourceMap?.get(l.id);
      const newCanvas = document.createElement('canvas');
      newCanvas.width = project.width;
      newCanvas.height = project.height;
      if (oldCanvas) {
        newCanvas.getContext('2d')?.drawImage(oldCanvas, 0, 0);
      }
      newFrameMap.set(newLayerId, newCanvas);
    }

    layerCanvasesMap.current.set(newFrameId, newFrameMap);

    const newFrame: Frame = {
      id: newFrameId,
      duration: sourceFrame.duration,
      layers: newLayers,
    };

    const newFrames = [...project.frames];
    newFrames.splice(index + 1, 0, newFrame);

    setProject(p => ({ ...p, frames: newFrames }));
    setCurrentFrameIndex(index + 1);
    setCurrentLayerId(newLayers[newLayers.length - 1].id);
    triggerCanvasUpdate();
  };

  const deleteFrame = (index: number) => {
    if (project.frames.length <= 1) return; // Must have at least 1 frame

    const frameToDelete = project.frames[index];
    layerCanvasesMap.current.delete(frameToDelete.id);

    const newFrames = project.frames.filter((_, i) => i !== index);
    setProject(p => ({ ...p, frames: newFrames }));
    setCurrentFrameIndex(Math.max(0, Math.min(index, newFrames.length - 1)));
    triggerCanvasUpdate();
  };

  const clearFrame = (index: number) => {
    const frame = project.frames[index];
    if (!frame) return;

    pushUndo();
    const frameMap = layerCanvasesMap.current.get(frame.id);
    if (frameMap) {
      for (const layer of frame.layers) {
        const c = frameMap.get(layer.id);
        const ctx = c?.getContext('2d');
        if (ctx && c) {
          ctx.clearRect(0, 0, c.width, c.height);
        }
      }
    }
    triggerCanvasUpdate();
  };

  const reorderFrames = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newFrames = [...project.frames];
    const [moved] = newFrames.splice(fromIndex, 1);
    newFrames.splice(toIndex, 0, moved);

    setProject(p => ({ ...p, frames: newFrames }));
    setCurrentFrameIndex(toIndex);
  };

  const setFrameDuration = (index: number, duration: number) => {
    const newFrames = [...project.frames];
    if (newFrames[index]) {
      newFrames[index] = { ...newFrames[index], duration: Math.max(1, duration) };
      setProject(p => ({ ...p, frames: newFrames }));
    }
  };

  // Layer operations
  const addLayer = () => {
    const newLayerId = 'layer_' + Date.now();
    const layerName = 'Layer ' + (currentFrame.layers.length + 1);

    const newLayer: Layer = {
      id: newLayerId,
      name: layerName,
      visible: true,
      locked: false,
      opacity: 1,
      blendMode: 'source-over',
      alphaLock: false,
    };

    // Add this layer to ALL frames to keep animation tracks synchronized
    const updatedFrames = project.frames.map(f => ({
      ...f,
      layers: [...f.layers, { ...newLayer, id: f.id === currentFrame.id ? newLayerId : 'layer_' + f.id + '_' + Date.now() }],
    }));

    setProject(p => ({ ...p, frames: updatedFrames }));
    setCurrentLayerId(newLayerId);
    triggerCanvasUpdate();
  };

  const duplicateLayer = (layerId: string) => {
    const srcLayer = currentFrame.layers.find(l => l.id === layerId);
    if (!srcLayer) return;

    const existingNames = currentFrame.layers.map(l => l.name);
    const newName = formatDuplicateTitle(srcLayer.name, existingNames);

    const newId = 'layer_copy_' + Date.now();
    const newLayer: Layer = {
      ...srcLayer,
      id: newId,
      name: newName,
    };

    // Clone canvas
    const oldCanvas = getLayerCanvas(currentFrame.id, layerId);
    const newCanvas = document.createElement('canvas');
    newCanvas.width = project.width;
    newCanvas.height = project.height;
    newCanvas.getContext('2d')?.drawImage(oldCanvas, 0, 0);

    let frameMap = layerCanvasesMap.current.get(currentFrame.id);
    if (!frameMap) {
      frameMap = new Map();
      layerCanvasesMap.current.set(currentFrame.id, frameMap);
    }
    frameMap.set(newId, newCanvas);

    const idx = currentFrame.layers.findIndex(l => l.id === layerId);
    const newLayers = [...currentFrame.layers];
    newLayers.splice(idx + 1, 0, newLayer);

    const newFrames = project.frames.map(f => (f.id === currentFrame.id ? { ...f, layers: newLayers } : f));
    setProject(p => ({ ...p, frames: newFrames }));
    setCurrentLayerId(newId);
    triggerCanvasUpdate();
  };

  const deleteLayer = (layerId: string) => {
    if (currentFrame.layers.length <= 1) return; // Keep at least one layer

    const newLayers = currentFrame.layers.filter(l => l.id !== layerId);
    const newFrames = project.frames.map(f => (f.id === currentFrame.id ? { ...f, layers: newLayers } : f));

    setProject(p => ({ ...p, frames: newFrames }));
    setCurrentLayerId(newLayers[newLayers.length - 1].id);
    triggerCanvasUpdate();
  };

  const reorderLayers = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const newLayers = [...currentFrame.layers];
    const [moved] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, moved);

    const newFrames = project.frames.map(f => (f.id === currentFrame.id ? { ...f, layers: newLayers } : f));
    setProject(p => ({ ...p, frames: newFrames }));
    triggerCanvasUpdate();
  };

  const updateLayer = (layerId: string, updates: Partial<Layer>) => {
    const newLayers = currentFrame.layers.map(l => (l.id === layerId ? { ...l, ...updates } : l));
    const newFrames = project.frames.map(f => (f.id === currentFrame.id ? { ...f, layers: newLayers } : f));
    setProject(p => ({ ...p, frames: newFrames }));
    triggerCanvasUpdate();
  };

  const mergeLayerDown = (layerId: string) => {
    const idx = currentFrame.layers.findIndex(l => l.id === layerId);
    if (idx <= 0) return; // Cannot merge bottom layer

    const upperLayer = currentFrame.layers[idx];
    const lowerLayer = currentFrame.layers[idx - 1];

    pushUndo(lowerLayer.id);

    const upperCanvas = getLayerCanvas(currentFrame.id, upperLayer.id);
    const lowerCanvas = getLayerCanvas(currentFrame.id, lowerLayer.id);
    const lowerCtx = lowerCanvas.getContext('2d');

    if (lowerCtx) {
      lowerCtx.save();
      lowerCtx.globalAlpha = upperLayer.opacity;
      lowerCtx.globalCompositeOperation = upperLayer.blendMode;
      lowerCtx.drawImage(upperCanvas, 0, 0);
      lowerCtx.restore();
    }

    const newLayers = currentFrame.layers.filter(l => l.id !== upperLayer.id);
    const newFrames = project.frames.map(f => (f.id === currentFrame.id ? { ...f, layers: newLayers } : f));

    setProject(p => ({ ...p, frames: newFrames }));
    setCurrentLayerId(lowerLayer.id);
    triggerCanvasUpdate();
  };

  const clearCurrentLayer = () => {
    if (!currentLayer) return;
    pushUndo();
    const canvas = getLayerCanvas(currentFrame.id, currentLayer.id);
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (currentLayer.name.toLowerCase().includes('background')) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    triggerCanvasUpdate();
  };

  // Viewport adjustments
  const resetViewport = () => {
    setViewport({ zoom: 1, panX: 0, panY: 0 });
  };
  const zoomIn = () => {
    setViewport(v => ({ ...v, zoom: Math.min(8, v.zoom * 1.25) }));
  };
  const zoomOut = () => {
    setViewport(v => ({ ...v, zoom: Math.max(0.15, v.zoom * 0.8) }));
  };

  // Brush and color
  const updateBrush = (updates: Partial<BrushSettings>) => {
    setBrush(b => ({ ...b, ...updates }));
  };
  const addToPalette = (hex: string) => {
    if (!palette.includes(hex)) {
      setPalette(p => [hex, ...p.slice(0, 23)]);
    }
  };

  // Onion skin updates
  const updateOnionSkin = (updates: Partial<OnionSkinSettings>) => {
    setOnionSkin(s => ({ ...s, ...updates }));
  };

  // Cloud Actions
  const signIn = async () => {
    try {
      await loginWithGoogle();
      await syncUserProfile();
    } catch (e) {
      console.error('Sign-in failed:', e);
    }
  };

  const signOutUser = async () => {
    await logoutUser();
  };

  const syncToCloudNow = async () => {
    if (!user) {
      await signIn();
      return;
    }

    setCloudSyncStatus('saving');
    try {
      // Generate a small thumbnail from frame 0
      const thumbCanvas = document.createElement('canvas');
      const thumbScale = 180 / Math.max(project.width, project.height);
      thumbCanvas.width = Math.round(project.width * thumbScale);
      thumbCanvas.height = Math.round(project.height * thumbScale);

      const frame0Canvas = await compositeFrameToCanvas(
        project.frames[0],
        project.width,
        project.height,
        layerCanvasesMap.current.get(project.frames[0].id) || new Map(),
        true
      );

      const tCtx = thumbCanvas.getContext('2d');
      if (tCtx) {
        tCtx.drawImage(frame0Canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
      }
      const thumbDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.7);

      // Serialize current frame layers dataUrls before saving
      const updatedFrames = project.frames.map(f => {
        const frameMap = layerCanvasesMap.current.get(f.id);
        const layers = f.layers.map(l => {
          const canvas = frameMap?.get(l.id);
          const dataUrl = canvas ? canvas.toDataURL('image/png') : l.dataUrl;
          return { ...l, dataUrl };
        });
        return { ...f, layers };
      });

      const updatedProj: Project = {
        ...project,
        ownerId: user.uid,
        frames: updatedFrames,
        fps,
        updatedAt: Date.now(),
      };

      await saveProjectToCloud(updatedProj, thumbDataUrl);
      setCloudSyncStatus('synced');
      setTimeout(() => setCloudSyncStatus('idle'), 3000);
    } catch (err) {
      console.error('Failed to sync to Cloud:', err);
      setCloudSyncStatus('error');
      setTimeout(() => setCloudSyncStatus('idle'), 4000);
    }
  };

  const loadCloudProject = async (id: string) => {
    setCloudSyncStatus('saving');
    try {
      const loaded = await loadProjectFromCloud(id);
      if (loaded) {
        setProject(loaded);
        setFps(loaded.fps || 12);
        setCurrentFrameIndex(0);
        hydrateCanvasesFromProject(loaded);
        setCloudSyncStatus('synced');
        setCurrentView('editor');
        setTimeout(() => setCloudSyncStatus('idle'), 2000);
      }
    } catch (e) {
      console.error('Failed to load project from cloud:', e);
      setCloudSyncStatus('error');
    }
  };

  const loadProject = (proj: Project) => {
    setProject(proj);
    setFps(proj.fps || 12);
    setCurrentFrameIndex(0);
    hydrateCanvasesFromProject(proj);
    resetViewport();
    setCurrentView('editor');
  };

  const createNewProject = (width: number, height: number, newFps: number, title?: string) => {
    const newProj = createDefaultProject(width, height, newFps, title || 'New Animation');
    setProject(newProj);
    setFps(newFps);
    setCurrentFrameIndex(0);
    hydrateCanvasesFromProject(newProj);
    resetViewport();
    setCurrentView('editor');
  };

  const updateProjectTitle = (title: string) => {
    setProject(p => ({ ...p, title }));
  };

  return (
    <FluxContext.Provider
      value={{
        project,
        setProject,
        currentFrameIndex,
        setCurrentFrameIndex,
        currentLayerId,
        setCurrentLayerId,
        currentFrame,
        currentLayer,
        addFrame,
        duplicateFrame,
        deleteFrame,
        clearFrame,
        reorderFrames,
        setFrameDuration,
        addLayer,
        duplicateLayer,
        deleteLayer,
        reorderLayers,
        updateLayer,
        mergeLayerDown,
        clearCurrentLayer,
        activeTool,
        setActiveTool,
        brush,
        updateBrush,
        color,
        setColor,
        secondaryColor,
        setSecondaryColor,
        palette,
        addToPalette,
        isPlaying,
        togglePlayback: () => setIsPlaying(p => !p),
        stopPlayback: () => {
          setIsPlaying(false);
          setCurrentFrameIndex(0);
        },
        fps,
        setFps,
        loop,
        setLoop,
        onionSkin,
        updateOnionSkin,
        viewport,
        setViewport,
        resetViewport,
        zoomIn,
        zoomOut,
        canUndo,
        canRedo,
        pushUndo,
        undo,
        redo,
        layerCanvasesMap,
        getLayerCanvas,
        triggerCanvasUpdate,
        canvasVersion,
        user,
        isAuthLoading,
        signIn,
        signOutUser,
        cloudSyncStatus,
        syncToCloudNow,
        loadCloudProject,
        currentView,
        setCurrentView,
        isRulerActive,
        setIsRulerActive,
        isInspectorOpen,
        setIsInspectorOpen,
        isTimelineCollapsed,
        setIsTimelineCollapsed,
        accentColor,
        setAccentColor,
        referenceImage,
        setReferenceImage,
        updateReferenceImage,
        loadProject,
        createNewProject,
        updateProjectTitle,
      }}
    >
      {children}
    </FluxContext.Provider>
  );
};

export const useFlux = (): FluxContextType => {
  const context = useContext(FluxContext);
  if (!context) {
    throw new Error('useFlux must be used within a FluxProvider');
  }
  return context;
};
