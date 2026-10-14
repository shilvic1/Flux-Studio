import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Lock,
  Unlock,
  X,
  Check,
  ArrowLeftRight,
  ArrowUpDown,
  Trash2,
  Copy,
  Move,
  RotateCw,
} from 'lucide-react';
import { useFlux } from '../context/FluxContext';
import { CanvasPoint, LassoSelection, ToolType } from '../types/flux';
import {
  drawShape,
  drawStrokeSegment,
  floodFill,
  renderTintedCanvas,
  rgbToHex,
} from '../utils/canvasRenderer';

export const CanvasArea: React.FC = () => {
  const {
    project,
    currentFrame,
    currentLayer,
    currentLayerId,
    activeTool,
    setActiveTool,
    brush,
    color,
    setColor,
    addToPalette,
    viewport,
    setViewport,
    onionSkin,
    layerCanvasesMap,
    getLayerCanvas,
    triggerCanvasUpdate,
    canvasVersion,
    pushUndo,
    isRulerActive,
    isInspectorOpen,
    setIsInspectorOpen,
    referenceImage,
    setReferenceImage,
    updateReferenceImage,
    isPlaying,
  } = useFlux();

  const containerRef = useRef<HTMLDivElement>(null);
  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const scratchCanvasRef = useRef<HTMLCanvasElement>(null);
  const onionCanvasRef = useRef<HTMLCanvasElement>(null);

  // Brush Cursor Preview State
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  // Stroke & Drawing Interaction State
  const isDrawing = useRef(false);
  const isPanning = useRef(false);
  const lastPanPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPoint = useRef<CanvasPoint | null>(null);
  const shapeStartPoint = useRef<CanvasPoint | null>(null);
  const shapeEndPoint = useRef<CanvasPoint | null>(null);
  const currentPointerPt = useRef<CanvasPoint | null>(null);

  // Lasso Selection State
  const [lasso, setLasso] = useState<LassoSelection | null>(null);
  const lassoRef = useRef<LassoSelection | null>(null);
  lassoRef.current = lasso;
  const isDrawingLasso = useRef(false);
  const lassoPoints = useRef<CanvasPoint[]>([]);
  const isDraggingLasso = useRef(false);
  const lassoDragStart = useRef<{
    startX: number;
    startY: number;
    initOffsetX: number;
    initOffsetY: number;
  }>({
    startX: 0,
    startY: 0,
    initOffsetX: 0,
    initOffsetY: 0,
  });

  // Reference Image Drag & Resize State
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const refDragStart = useRef<{
    clientX: number;
    clientY: number;
    initX: number;
    initY: number;
    initW: number;
    initH: number;
  }>({
    clientX: 0,
    clientY: 0,
    initX: 0,
    initY: 0,
    initW: 0,
    initH: 0,
  });

  // Convert mouse/pointer event coordinates to canvas space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): CanvasPoint => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const x = (clientX / rect.width) * project.width;
    const y = (clientY / rect.height) * project.height;
    const pressure = e.pressure > 0 ? e.pressure : 0.5;

    return { x, y, pressure };
  };

  // Center canvas on mount or resolution change
  useEffect(() => {
    if (containerRef.current) {
      const containerW = containerRef.current.clientWidth;
      const containerH = containerRef.current.clientHeight;

      const scaleX = (containerW - 80) / project.width;
      const scaleY = (containerH - 80) / project.height;
      const fitZoom = Math.min(1.5, Math.max(0.2, Math.min(scaleX, scaleY)));

      const panX = (containerW - project.width * fitZoom) / 2;
      const panY = (containerH - project.height * fitZoom) / 2;

      setViewport({ zoom: fitZoom, panX, panY });
    }
  }, [project.width, project.height, setViewport]);

  // Re-composite main display canvas whenever layers, frames, or project changes
  const renderCompositedView = useCallback(() => {
    const bgCanvas = bgCanvasRef.current;
    const displayCanvas = displayCanvasRef.current;
    if (!currentFrame) return;

    // 1. Render Background paper / project background color onto bgCanvas
    if (bgCanvas) {
      bgCanvas.width = project.width;
      bgCanvas.height = project.height;
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        bgCtx.fillStyle = project.backgroundColor || '#ffffff';
        bgCtx.fillRect(0, 0, project.width, project.height);
      }
    }

    // 2. Render Artwork layers onto displayCanvas in bottom-to-top order
    // Note: displayCanvas remains transparent so onionSkin underneath is visible!
    if (displayCanvas) {
      displayCanvas.width = project.width;
      displayCanvas.height = project.height;
      const ctx = displayCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, project.width, project.height);
        for (const layer of currentFrame.layers) {
          if (!layer.visible) continue;

          const layerCanvas = getLayerCanvas(currentFrame.id, layer.id);

          ctx.save();
          ctx.globalAlpha = layer.opacity;
          ctx.globalCompositeOperation = layer.blendMode || 'source-over';
          ctx.drawImage(layerCanvas, 0, 0);
          ctx.restore();
        }
      }
    }
  }, [currentFrame, project.width, project.height, project.backgroundColor, getLayerCanvas]);

  // Render Onion Skinning Overlay
  const renderOnionSkins = useCallback(() => {
    const onionCanvas = onionCanvasRef.current;
    if (!onionCanvas) return;

    onionCanvas.width = project.width;
    onionCanvas.height = project.height;
    const ctx = onionCanvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, project.width, project.height);

    if (!onionSkin.enabled || project.frames.length <= 1 || isPlaying) return;

    const currentIdx = project.frames.findIndex(f => f.id === currentFrame.id);
    if (currentIdx === -1) return;

    // Composite transparent artwork for a target ghost frame
    const compositeGhostArtwork = (targetFrame: typeof currentFrame) => {
      const gCanvas = document.createElement('canvas');
      gCanvas.width = project.width;
      gCanvas.height = project.height;
      const gCtx = gCanvas.getContext('2d');
      if (!gCtx) return null;

      let hasVisiblePixels = false;
      for (const layer of targetFrame.layers) {
        if (!layer.visible) continue;

        const lCanvas = getLayerCanvas(targetFrame.id, layer.id);
        if (lCanvas) {
          gCtx.save();
          gCtx.globalAlpha = layer.opacity;
          gCtx.globalCompositeOperation = layer.blendMode || 'source-over';
          gCtx.drawImage(lCanvas, 0, 0);
          gCtx.restore();
          hasVisiblePixels = true;
        }
      }
      return hasVisiblePixels ? gCanvas : null;
    };

    // 1. Previous frames (e.g. orange/red ghost)
    for (let i = 1; i <= onionSkin.prevFrames; i++) {
      const prevIdx = currentIdx - i;
      if (prevIdx >= 0) {
        const prevFrame = project.frames[prevIdx];
        if (!prevFrame) continue;

        const ghost = compositeGhostArtwork(prevFrame);
        if (ghost) {
          const fade = (onionSkin.opacity / i);
          const tinted = onionSkin.tintMode === 'original'
            ? ghost
            : renderTintedCanvas(ghost, onionSkin.prevColor || '#f97316');

          ctx.save();
          ctx.globalAlpha = Math.max(0.08, Math.min(1, fade));
          ctx.drawImage(tinted, 0, 0);
          ctx.restore();
        }
      }
    }

    // 2. Future frames (e.g. cyan/blue ghost)
    for (let i = 1; i <= onionSkin.nextFrames; i++) {
      const nextIdx = currentIdx + i;
      if (nextIdx < project.frames.length) {
        const nextFrame = project.frames[nextIdx];
        if (!nextFrame) continue;

        const ghost = compositeGhostArtwork(nextFrame);
        if (ghost) {
          const fade = (onionSkin.opacity / i);
          const tinted = onionSkin.tintMode === 'original'
            ? ghost
            : renderTintedCanvas(ghost, onionSkin.nextColor || '#06b6d4');

          ctx.save();
          ctx.globalAlpha = Math.max(0.08, Math.min(1, fade));
          ctx.drawImage(tinted, 0, 0);
          ctx.restore();
        }
      }
    }
  }, [onionSkin, currentFrame, project.frames, project.width, project.height, getLayerCanvas, isPlaying]);

  useEffect(() => {
    renderCompositedView();
    renderOnionSkins();
  }, [renderCompositedView, renderOnionSkins, canvasVersion, isPlaying]);

  // Commit floating lasso cutout back to layer canvas
  const commitLasso = useCallback(() => {
    const curLasso = lassoRef.current;
    if (!curLasso || !curLasso.floatingCanvas || !currentLayer) return;

    pushUndo();
    const targetCanvas = getLayerCanvas(currentFrame.id, currentLayer.id);
    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx) {
      targetCtx.save();
      targetCtx.drawImage(
        curLasso.floatingCanvas,
        curLasso.bounds.x + curLasso.offsetX,
        curLasso.bounds.y + curLasso.offsetY
      );
      targetCtx.restore();
    }

    const scratch = scratchCanvasRef.current;
    if (scratch) {
      scratch.getContext('2d')?.clearRect(0, 0, scratch.width, scratch.height);
    }

    setLasso(null);
    renderCompositedView();
    triggerCanvasUpdate();
  }, [currentFrame.id, currentLayer, getLayerCanvas, pushUndo, renderCompositedView, triggerCanvasUpdate]);

  // Render floating lasso preview onto scratchpad canvas
  const renderLassoPreview = useCallback((curLasso: LassoSelection) => {
    const scratch = scratchCanvasRef.current;
    if (!scratch) return;
    scratch.width = project.width;
    scratch.height = project.height;
    const sCtx = scratch.getContext('2d');
    if (!sCtx) return;

    sCtx.clearRect(0, 0, project.width, project.height);

    const drawX = curLasso.bounds.x + curLasso.offsetX;
    const drawY = curLasso.bounds.y + curLasso.offsetY;

    // Draw floating artwork
    if (curLasso.floatingCanvas) {
      sCtx.drawImage(curLasso.floatingCanvas, drawX, drawY);
    }

    // Draw dashed bounding box & handles
    sCtx.save();
    sCtx.setLineDash([5, 4]);
    sCtx.strokeStyle = '#00a8ff';
    sCtx.lineWidth = 1.5;
    sCtx.strokeRect(drawX, drawY, curLasso.bounds.width, curLasso.bounds.height);

    // Corner handles
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(drawX - 3, drawY - 3, 6, 6);
    sCtx.fillRect(drawX + curLasso.bounds.width - 3, drawY - 3, 6, 6);
    sCtx.fillRect(drawX - 3, drawY + curLasso.bounds.height - 3, 6, 6);
    sCtx.fillRect(drawX + curLasso.bounds.width - 3, drawY + curLasso.bounds.height - 3, 6, 6);
    sCtx.restore();
  }, [project.width, project.height]);

  // Flip Lasso Horizontal
  const flipLassoHorizontal = () => {
    const curLasso = lassoRef.current;
    if (!curLasso || !curLasso.floatingCanvas) return;

    const fc = curLasso.floatingCanvas;
    const temp = document.createElement('canvas');
    temp.width = fc.width;
    temp.height = fc.height;
    const tCtx = temp.getContext('2d');
    if (!tCtx) return;

    tCtx.translate(fc.width, 0);
    tCtx.scale(-1, 1);
    tCtx.drawImage(fc, 0, 0);

    const fCtx = fc.getContext('2d');
    if (fCtx) {
      fCtx.clearRect(0, 0, fc.width, fc.height);
      fCtx.drawImage(temp, 0, 0);
    }

    const updated = { ...curLasso };
    setLasso(updated);
    renderLassoPreview(updated);
  };

  // Flip Lasso Vertical
  const flipLassoVertical = () => {
    const curLasso = lassoRef.current;
    if (!curLasso || !curLasso.floatingCanvas) return;

    const fc = curLasso.floatingCanvas;
    const temp = document.createElement('canvas');
    temp.width = fc.width;
    temp.height = fc.height;
    const tCtx = temp.getContext('2d');
    if (!tCtx) return;

    tCtx.translate(0, fc.height);
    tCtx.scale(1, -1);
    tCtx.drawImage(fc, 0, 0);

    const fCtx = fc.getContext('2d');
    if (fCtx) {
      fCtx.clearRect(0, 0, fc.width, fc.height);
      fCtx.drawImage(temp, 0, 0);
    }

    const updated = { ...curLasso };
    setLasso(updated);
    renderLassoPreview(updated);
  };

  // Duplicate Lasso Selection: stamps the current floating cutout to layer and keeps floating clone active
  const duplicateLassoSelection = useCallback(() => {
    const curLasso = lassoRef.current;
    if (!curLasso || !curLasso.floatingCanvas || !currentLayer) return;

    pushUndo();
    const targetCanvas = getLayerCanvas(currentFrame.id, currentLayer.id);
    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx) {
      targetCtx.save();
      targetCtx.drawImage(
        curLasso.floatingCanvas,
        curLasso.bounds.x + curLasso.offsetX,
        curLasso.bounds.y + curLasso.offsetY
      );
      targetCtx.restore();
    }

    // Clone floating canvas for the duplicated piece and shift it slightly
    const clone = document.createElement('canvas');
    clone.width = curLasso.floatingCanvas.width;
    clone.height = curLasso.floatingCanvas.height;
    clone.getContext('2d')?.drawImage(curLasso.floatingCanvas, 0, 0);

    const updated: LassoSelection = {
      ...curLasso,
      floatingCanvas: clone,
      offsetX: curLasso.offsetX + 20,
      offsetY: curLasso.offsetY + 20,
    };

    setLasso(updated);
    renderLassoPreview(updated);
    renderCompositedView();
    triggerCanvasUpdate();
  }, [currentFrame.id, currentLayer, getLayerCanvas, pushUndo, renderCompositedView, renderLassoPreview, triggerCanvasUpdate]);

  // Delete / Discard Lasso Selection
  const deleteLassoSelection = useCallback(() => {
    const scratch = scratchCanvasRef.current;
    if (scratch) {
      scratch.getContext('2d')?.clearRect(0, 0, scratch.width, scratch.height);
    }
    setLasso(null);
    renderCompositedView();
    triggerCanvasUpdate();
  }, [renderCompositedView, triggerCanvasUpdate]);

  // Global Keyboard shortcuts when Lasso selection is active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!lassoRef.current) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        commitLasso();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        commitLasso();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only if not typing in an input
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        e.preventDefault();
        deleteLassoSelection();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        duplicateLassoSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [commitLasso, deleteLassoSelection, duplicateLassoSelection]);

  // Commit lasso if tool changes away from lasso
  useEffect(() => {
    if (activeTool !== 'lasso' && lassoRef.current) {
      commitLasso();
    }
  }, [activeTool, commitLasso]);

  // Helper to snap line angles if Shift key is pressed
  const getSnappedLinePoint = (start: CanvasPoint, current: CanvasPoint, isShift: boolean): CanvasPoint => {
    if (!isShift) return current;
    const dx = current.x - start.x;
    const dy = current.y - start.y;
    const angle = Math.atan2(dy, dx);
    const distance = Math.hypot(dx, dy);

    // Snap to nearest 45 degrees (PI / 4)
    const snapAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
    return {
      x: start.x + Math.cos(snapAngle) * distance,
      y: start.y + Math.sin(snapAngle) * distance,
      pressure: current.pressure,
    };
  };

  // Handle Pointer Down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Panning (middle mouse, space, or hand tool)
    if (e.button === 1 || activeTool === 'hand' || e.altKey) {
      isPanning.current = true;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    if (e.button !== 0) return;
    if (!currentLayer) return;
    if (currentLayer.locked) {
      return;
    }

    const pt = getCanvasCoords(e);
    currentPointerPt.current = pt;
    e.currentTarget.setPointerCapture(e.pointerId);

    // 1. LASSO SELECTION TOOL
    if (activeTool === 'lasso') {
      const curLasso = lassoRef.current;
      if (curLasso && curLasso.active) {
        const boxX = curLasso.bounds.x + curLasso.offsetX;
        const boxY = curLasso.bounds.y + curLasso.offsetY;
        const insideBox =
          pt.x >= boxX &&
          pt.x <= boxX + curLasso.bounds.width &&
          pt.y >= boxY &&
          pt.y <= boxY + curLasso.bounds.height;

        if (insideBox) {
          // Dragging existing lasso cutout
          isDraggingLasso.current = true;
          lassoDragStart.current = {
            startX: pt.x,
            startY: pt.y,
            initOffsetX: curLasso.offsetX,
            initOffsetY: curLasso.offsetY,
          };
          return;
        } else {
          // Clicked outside: commit and start new selection loop
          commitLasso();
        }
      }

      // Start new lasso loop
      isDrawingLasso.current = true;
      lassoPoints.current = [pt];
      return;
    }

    // 2. EYEDROPPER (or Alt-Click fast color sampling)
    if (activeTool === 'eyedropper' || (e.altKey && !isPanning.current)) {
      const displayCtx = displayCanvasRef.current?.getContext('2d');
      if (displayCtx) {
        const pixel = displayCtx.getImageData(Math.floor(pt.x), Math.floor(pt.y), 1, 1).data;
        if (pixel[3] > 0) {
          const sampled = rgbToHex(pixel[0], pixel[1], pixel[2]);
          setColor(sampled);
          addToPalette(sampled);
        } else {
          const bgCol = project.backgroundColor || '#ffffff';
          setColor(bgCol);
          addToPalette(bgCol);
        }
      }
      return;
    }

    // 3. BUCKET FILL
    if (activeTool === 'bucket') {
      pushUndo(currentLayer.id);
      const targetCanvas = getLayerCanvas(currentFrame.id, currentLayer.id);
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) {
        floodFill(targetCtx, pt.x, pt.y, color);
        renderCompositedView();
        triggerCanvasUpdate();
      }
      return;
    }

    // 4. LINE & SHAPE TOOLS (or if Ruler is active)
    const effectiveShapeTool = isRulerActive ? 'line' : activeTool;
    if (['line', 'rect', 'ellipse'].includes(effectiveShapeTool)) {
      isDrawing.current = true;
      shapeStartPoint.current = pt;
      shapeEndPoint.current = pt;
      lastPoint.current = pt;
      pushUndo(currentLayer.id);

      // Draw initial scratch preview
      const scratch = scratchCanvasRef.current;
      if (scratch) {
        scratch.width = project.width;
        scratch.height = project.height;
        const sCtx = scratch.getContext('2d');
        if (sCtx) {
          sCtx.clearRect(0, 0, project.width, project.height);
          drawShape(
            sCtx,
            pt,
            pt,
            effectiveShapeTool as 'line' | 'rect' | 'ellipse',
            brush,
            color,
            currentLayer.alphaLock
          );
        }
      }
      return;
    }

    // 5. FREEHAND DRAWING TOOLS (Brush, Pencil, Pen, Marker, Airbrush, Eraser)
    isDrawing.current = true;
    lastPoint.current = pt;
    pushUndo();

    const targetCanvas = getLayerCanvas(currentFrame.id, currentLayer.id);
    const targetCtx = targetCanvas.getContext('2d');
    if (targetCtx) {
      drawStrokeSegment(
        targetCtx,
        pt,
        pt,
        activeTool,
        brush,
        color,
        currentLayer.alphaLock
      );
      renderCompositedView();
    }
  };

  // Handle Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    // Panning
    if (isPanning.current) {
      const dx = e.clientX - lastPanPos.current.x;
      const dy = e.clientY - lastPanPos.current.y;
      lastPanPos.current = { x: e.clientX, y: e.clientY };
      setViewport(v => ({ ...v, panX: v.panX + dx, panY: v.panY + dy }));
      return;
    }

    const pt = getCanvasCoords(e);
    currentPointerPt.current = pt;
    setCursorPos({ x: pt.x, y: pt.y });

    // Lasso Dragging
    if (isDraggingLasso.current && lassoRef.current) {
      const dx = pt.x - lassoDragStart.current.startX;
      const dy = pt.y - lassoDragStart.current.startY;
      const updated: LassoSelection = {
        ...lassoRef.current,
        offsetX: Math.round(lassoDragStart.current.initOffsetX + dx),
        offsetY: Math.round(lassoDragStart.current.initOffsetY + dy),
      };
      setLasso(updated);
      renderLassoPreview(updated);
      return;
    }

    // Lasso Path Drawing Loop
    if (isDrawingLasso.current) {
      lassoPoints.current.push(pt);
      const scratch = scratchCanvasRef.current;
      if (scratch) {
        scratch.width = project.width;
        scratch.height = project.height;
        const sCtx = scratch.getContext('2d');
        if (sCtx) {
          sCtx.clearRect(0, 0, project.width, project.height);
          sCtx.save();
          sCtx.setLineDash([4, 4]);
          sCtx.strokeStyle = '#00a8ff';
          sCtx.lineWidth = 1.5;
          sCtx.beginPath();
          sCtx.moveTo(lassoPoints.current[0].x, lassoPoints.current[0].y);
          for (let i = 1; i < lassoPoints.current.length; i++) {
            sCtx.lineTo(lassoPoints.current[i].x, lassoPoints.current[i].y);
          }
          sCtx.stroke();
          sCtx.restore();
        }
      }
      return;
    }

    if (!isDrawing.current || !currentLayer || currentLayer.locked) return;

    // Line & Shape Tool Live Scratch Preview
    const effectiveShapeTool = isRulerActive ? 'line' : activeTool;
    if (['line', 'rect', 'ellipse'].includes(effectiveShapeTool) && shapeStartPoint.current) {
      const scratch = scratchCanvasRef.current;
      if (!scratch) return;
      scratch.width = project.width;
      scratch.height = project.height;
      const sCtx = scratch.getContext('2d');
      if (!sCtx) return;

      sCtx.clearRect(0, 0, project.width, project.height);
      const finalEndPt = getSnappedLinePoint(shapeStartPoint.current, pt, e.shiftKey);
      shapeEndPoint.current = finalEndPt;

      drawShape(
        sCtx,
        shapeStartPoint.current,
        finalEndPt,
        effectiveShapeTool as 'line' | 'rect' | 'ellipse',
        brush,
        color,
        currentLayer.alphaLock
      );
      return;
    }

    // Freehand Stroke Segment
    if (lastPoint.current) {
      const targetCanvas = getLayerCanvas(currentFrame.id, currentLayer.id);
      const targetCtx = targetCanvas.getContext('2d');
      if (!targetCtx) return;

      let nextPt = pt;
      if (brush.stabilizer > 0) {
        const weight = Math.min(0.85, brush.stabilizer * 0.12);
        nextPt = {
          x: lastPoint.current.x * weight + pt.x * (1 - weight),
          y: lastPoint.current.y * weight + pt.y * (1 - weight),
          pressure: pt.pressure,
        };
      }

      drawStrokeSegment(
        targetCtx,
        lastPoint.current,
        nextPt,
        activeTool,
        brush,
        color,
        currentLayer.alphaLock
      );

      lastPoint.current = nextPt;
      renderCompositedView();
    }
  };

  // Handle Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (isPanning.current) {
      isPanning.current = false;
      return;
    }

    // Lasso Drag Finished
    if (isDraggingLasso.current) {
      isDraggingLasso.current = false;
      return;
    }

    // Lasso Loop Finished: Extract cutout into floating selection
    if (isDrawingLasso.current) {
      isDrawingLasso.current = false;
      const pts = lassoPoints.current;

      if (pts.length > 5 && currentLayer) {
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity;

        for (const p of pts) {
          if (p.x < minX) minX = p.x;
          if (p.y < minY) minY = p.y;
          if (p.x > maxX) maxX = p.x;
          if (p.y > maxY) maxY = p.y;
        }

        const width = Math.max(1, Math.round(maxX - minX));
        const height = Math.max(1, Math.round(maxY - minY));

        if (width > 3 && height > 3) {
          const floatCanvas = document.createElement('canvas');
          floatCanvas.width = width;
          floatCanvas.height = height;
          const fCtx = floatCanvas.getContext('2d');

          const targetCanvas = getLayerCanvas(currentFrame.id, currentLayer.id);
          const targetCtx = targetCanvas.getContext('2d');

          if (fCtx && targetCtx) {
            // 1. Clip and copy artwork into floating canvas
            fCtx.save();
            fCtx.beginPath();
            fCtx.moveTo(pts[0].x - minX, pts[0].y - minY);
            for (let i = 1; i < pts.length; i++) {
              fCtx.lineTo(pts[i].x - minX, pts[i].y - minY);
            }
            fCtx.closePath();
            fCtx.clip();
            fCtx.drawImage(targetCanvas, -minX, -minY);
            fCtx.restore();

            // 2. Clear selected area from layer canvas
            pushUndo();
            targetCtx.save();
            targetCtx.beginPath();
            targetCtx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              targetCtx.lineTo(pts[i].x, pts[i].y);
            }
            targetCtx.closePath();
            targetCtx.clip();
            targetCtx.clearRect(0, 0, project.width, project.height);
            targetCtx.restore();

            const newLasso: LassoSelection = {
              active: true,
              points: pts,
              bounds: { x: minX, y: minY, width, height },
              floatingCanvas: floatCanvas,
              offsetX: 0,
              offsetY: 0,
            };

            setLasso(newLasso);
            renderLassoPreview(newLasso);
            renderCompositedView();
            triggerCanvasUpdate();
            return;
          }
        }
      }

      // If loop too small or empty, clear scratchpad
      const scratch = scratchCanvasRef.current;
      if (scratch) {
        scratch.getContext('2d')?.clearRect(0, 0, scratch.width, scratch.height);
      }
      return;
    }

    // Release pointer capture
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}

    if (!isDrawing.current) return;
    isDrawing.current = false;

    // Commit Line & Shape Tool directly to Layer Canvas
    const effectiveShapeTool = isRulerActive ? 'line' : activeTool;
    if (['line', 'rect', 'ellipse'].includes(effectiveShapeTool) && shapeStartPoint.current && currentLayer) {
      const pt = getCanvasCoords(e);
      const finalEndPt = shapeEndPoint.current || getSnappedLinePoint(shapeStartPoint.current, pt, e.shiftKey);

      const targetCanvas = getLayerCanvas(currentFrame.id, currentLayer.id);
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) {
        drawShape(
          targetCtx,
          shapeStartPoint.current,
          finalEndPt,
          effectiveShapeTool as 'line' | 'rect' | 'ellipse',
          brush,
          color,
          currentLayer.alphaLock
        );
      }

      // Clear scratchpad immediately
      const scratch = scratchCanvasRef.current;
      if (scratch) {
        scratch.getContext('2d')?.clearRect(0, 0, scratch.width, scratch.height);
      }

      // Synchronously composite view so line appears with zero delay
      renderCompositedView();
    }

    lastPoint.current = null;
    shapeStartPoint.current = null;
    shapeEndPoint.current = null;
    triggerCanvasUpdate();
  };

  // Wheel Zoom centered at cursor
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    const newZoom = Math.max(0.1, Math.min(16, viewport.zoom * zoomFactor));

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newPanX = mouseX - (mouseX - viewport.panX) * (newZoom / viewport.zoom);
    const newPanY = mouseY - (mouseY - viewport.panY) * (newZoom / viewport.zoom);

    setViewport({ zoom: newZoom, panX: newPanX, panY: newPanY });
  };

  // Global Drag & Resize Listeners for Reference Image
  const handleRefPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!referenceImage || referenceImage.locked) return;
    isDraggingRef.current = true;
    refDragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initX: referenceImage.x,
      initY: referenceImage.y,
      initW: referenceImage.width,
      initH: referenceImage.height,
    };
  };

  const handleRefResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    if (!referenceImage || referenceImage.locked) return;
    isResizingRef.current = true;
    refDragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      initX: referenceImage.x,
      initY: referenceImage.y,
      initW: referenceImage.width,
      initH: referenceImage.height,
    };
  };

  useEffect(() => {
    const handleGlobalMove = (e: PointerEvent) => {
      if (!referenceImage) return;

      if (isDraggingRef.current) {
        const dx = (e.clientX - refDragStart.current.clientX) / viewport.zoom;
        const dy = (e.clientY - refDragStart.current.clientY) / viewport.zoom;
        updateReferenceImage({
          x: Math.round(refDragStart.current.initX + dx),
          y: Math.round(refDragStart.current.initY + dy),
        });
      } else if (isResizingRef.current) {
        const dx = (e.clientX - refDragStart.current.clientX) / viewport.zoom;
        const dy = (e.clientY - refDragStart.current.clientY) / viewport.zoom;
        const newW = Math.max(80, Math.round(refDragStart.current.initW + dx));
        const newH = Math.max(60, Math.round(refDragStart.current.initH + dy));
        updateReferenceImage({ width: newW, height: newH });
      }
    };

    const handleGlobalUp = () => {
      isDraggingRef.current = false;
      isResizingRef.current = false;
    };

    window.addEventListener('pointermove', handleGlobalMove);
    window.addEventListener('pointerup', handleGlobalUp);
    return () => {
      window.removeEventListener('pointermove', handleGlobalMove);
      window.removeEventListener('pointerup', handleGlobalUp);
    };
  }, [referenceImage, viewport.zoom, updateReferenceImage]);

  return (
    <main
      ref={containerRef}
      onWheel={handleWheel}
      className="flex-1 h-full relative overflow-hidden bg-[#0e1014] flex items-center justify-center select-none"
      style={{
        backgroundImage: `
          radial-gradient(#1f222b 1px, transparent 1px),
          radial-gradient(#1f222b 1px, #0e1014 1px)
        `,
        backgroundSize: '24px 24px',
        backgroundPosition: '0 0, 12px 12px',
      }}
    >
      {/* Canvas Viewport transform wrapper */}
      <div
        className="relative shadow-2xl transition-transform duration-75 ease-out"
        style={{
          width: project.width,
          height: project.height,
          transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
          transformOrigin: '0 0',
        }}
      >
        {/* Transparency Checkerboard Background */}
        <div
          className="absolute inset-0 border border-[#262832] rounded-sm pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #1b1d24 25%, transparent 25%),
              linear-gradient(-45deg, #1b1d24 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #1b1d24 75%),
              linear-gradient(-45deg, transparent 75%, #1b1d24 75%)
            `,
            backgroundSize: '16px 16px',
            backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
            backgroundColor: '#15171d',
          }}
        />

        {/* Background Paper / Base Layer Canvas */}
        <canvas
          ref={bgCanvasRef}
          width={project.width}
          height={project.height}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Onion Skin Ghost Layer Canvas */}
        <canvas
          ref={onionCanvasRef}
          width={project.width}
          height={project.height}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Composited Current Frame Artwork Display Canvas */}
        <canvas
          ref={displayCanvasRef}
          width={project.width}
          height={project.height}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Scratchpad Preview Canvas for Shapes, Strokes & Lasso */}
        <canvas
          ref={scratchCanvasRef}
          width={project.width}
          height={project.height}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Interactive Pointer Events Receiver Canvas */}
        <canvas
          width={project.width}
          height={project.height}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={() => setCursorPos(null)}
          className={`absolute inset-0 touch-none ${
            activeTool === 'hand'
              ? 'cursor-grab active:cursor-grabbing'
              : activeTool === 'lasso'
              ? 'cursor-cell'
              : activeTool === 'eyedropper'
              ? 'cursor-crosshair'
              : ['brush', 'pencil', 'pen', 'marker', 'airbrush', 'eraser', 'line'].includes(activeTool)
              ? 'cursor-none'
              : 'cursor-crosshair'
          }`}
        />

        {/* Live Brush, Eraser & Pen Reticle Cursor Preview */}
        {cursorPos && ['brush', 'pencil', 'pen', 'marker', 'airbrush', 'eraser', 'line'].includes(activeTool) && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all duration-75"
            style={{
              left: cursorPos.x,
              top: cursorPos.y,
              width: Math.max(4, brush.size),
              height: Math.max(4, brush.size),
              borderColor: activeTool === 'eraser' ? 'rgba(255, 255, 255, 0.95)' : (color.toLowerCase() === '#ffffff' ? '#000000' : color),
              backgroundColor: activeTool === 'eraser' ? 'rgba(244, 63, 94, 0.15)' : `${color}25`,
              boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.5), 0 0 4px rgba(0,0,0,0.25)',
            }}
          >
            {/* Center dot for precision placement */}
            <div
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: activeTool === 'eraser' ? '#ffffff' : (color.toLowerCase() === '#ffffff' ? '#000000' : color),
                boxShadow: '0 0 0 0.5px rgba(0,0,0,0.7)',
              }}
            />
          </div>
        )}

        {/* Floating Action Strip for Active Lasso Selection */}
        {lasso && lasso.active && (
          <div
            style={{
              position: 'absolute',
              left: lasso.bounds.x + lasso.offsetX,
              top: Math.max(0, lasso.bounds.y + lasso.offsetY - 36),
              pointerEvents: 'auto',
            }}
            className="z-30 flex items-center gap-1 bg-[#1a1c22]/95 backdrop-blur-md border border-[#2e313c] rounded-xl px-1.5 py-1 shadow-2xl text-xs text-neutral-200 animate-in fade-in zoom-in-95 duration-100"
          >
            <button
              onClick={commitLasso}
              className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 flex items-center gap-1 px-2 font-medium"
              title="Apply & Commit (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
              <span className="text-[10px]">Apply</span>
            </button>
            <div className="h-3 w-[1px] bg-[#2a2d36] mx-0.5" />
            <button
              onClick={flipLassoHorizontal}
              className="p-1 rounded-lg text-neutral-300 hover:text-white hover:bg-[#252832]"
              title="Flip Horizontal"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={flipLassoVertical}
              className="p-1 rounded-lg text-neutral-300 hover:text-white hover:bg-[#252832]"
              title="Flip Vertical"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={duplicateLassoSelection}
              className="p-1 rounded-lg text-neutral-300 hover:text-cyan-400 hover:bg-[#252832]"
              title="Duplicate Selection (Ctrl+D)"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={deleteLassoSelection}
              className="p-1 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-950/20"
              title="Delete Selection (Del)"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Draggable & Resizable Reference Image Overlay directly on Canvas */}
        {referenceImage && referenceImage.visible && (
          <div
            onPointerDown={handleRefPointerDown}
            style={{
              position: 'absolute',
              left: referenceImage.x,
              top: referenceImage.y,
              width: referenceImage.width,
              height: referenceImage.height,
              opacity: referenceImage.opacity,
              pointerEvents: 'auto',
            }}
            className={`group select-none z-20 border-2 rounded-xl shadow-2xl overflow-visible transition-shadow ${
              referenceImage.locked
                ? 'border-amber-400/60 cursor-default'
                : 'border-cyan-400 hover:border-cyan-300 cursor-move shadow-cyan-950/40'
            }`}
          >
            {/* Draggable Control Bar */}
            <div
              className="absolute -top-8 left-0 right-0 h-8 bg-[#181a20]/95 backdrop-blur-md border border-[#2d303b] rounded-t-xl px-2.5 flex items-center justify-between text-[11px] text-neutral-300 shadow-md"
              onPointerDown={handleRefPointerDown}
            >
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-cyan-400 font-semibold">
                <Move className="w-3 h-3 text-cyan-400" />
                <span>REF</span>
              </div>

              <div className="flex items-center gap-1.5" onPointerDown={e => e.stopPropagation()}>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={referenceImage.opacity}
                  onChange={e => updateReferenceImage({ opacity: Number(e.target.value) })}
                  className="w-14 accent-cyan-400 h-1 bg-neutral-700 rounded cursor-pointer"
                  title="Reference Opacity"
                />
                <button
                  onClick={() => updateReferenceImage({ locked: !referenceImage.locked })}
                  className="p-1 rounded text-neutral-400 hover:text-white"
                  title={referenceImage.locked ? 'Unlock (Allow Drag)' : 'Lock (Trace Mode)'}
                >
                  {referenceImage.locked ? <Lock className="w-3 h-3 text-amber-400" /> : <Unlock className="w-3 h-3" />}
                </button>
                <button
                  onClick={() => setReferenceImage(null)}
                  className="p-1 rounded text-neutral-400 hover:text-rose-400"
                  title="Remove Reference"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Reference Image Content */}
            <div className="w-full h-full rounded-b-xl overflow-hidden bg-black/30 backdrop-blur-[1px]">
              <img
                src={referenceImage.url}
                alt="Reference"
                className="w-full h-full object-contain pointer-events-none"
              />
            </div>

            {/* Corner Resize Handle */}
            {!referenceImage.locked && (
              <div
                onPointerDown={handleRefResizeDown}
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-cyan-500 rounded-full cursor-nwse-resize border-2 border-white shadow-xl flex items-center justify-center text-[9px] text-white hover:scale-110 transition-transform"
                title="Drag to resize reference image"
              >
                <div className="w-2 h-2 border-r-2 border-b-2 border-white -translate-x-0.5 -translate-y-0.5" />
              </div>
            )}
          </div>
        )}

        {/* Straight Ruler Guide Overlay */}
        {isRulerActive && (
          <div
            className="absolute inset-0 pointer-events-none border-2 border-cyan-400/40"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(0, 168, 255, 0.12) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(0, 168, 255, 0.12) 1px, transparent 1px)
              `,
              backgroundSize: '32px 32px',
            }}
          >
            <div className="absolute top-2 left-2 bg-cyan-950/80 border border-cyan-500/50 text-cyan-300 px-2 py-0.5 rounded text-[10px] font-mono font-semibold flex items-center gap-1 shadow">
              <span>STRAIGHT LINE RULER ACTIVE</span>
            </div>
          </div>
        )}
      </div>

      {/* Right Edge Inspector / Layers Drawer Tab */}
      <button
        onClick={() => setIsInspectorOpen(!isInspectorOpen)}
        className="absolute right-0 top-1/2 -translate-y-1/2 bg-[#1b1d24]/90 hover:bg-[#232630] border-l border-y border-[#2f323e] text-neutral-400 hover:text-white px-1.5 py-4 rounded-l-xl shadow-2xl transition-all z-20 flex flex-col items-center justify-center gap-1 group"
        title="Toggle Layers & Inspector"
      >
        <div className="w-1 h-3 rounded-full bg-neutral-500 group-hover:bg-cyan-400 transition-colors" />
        <span className="text-[9px] font-mono [writing-mode:vertical-rl] tracking-widest text-neutral-400 group-hover:text-white">
          {isInspectorOpen ? 'CLOSE' : 'LAYERS'}
        </span>
      </button>

      {/* Floating Canvas Navigation Status Badge */}
      <div className="absolute top-3 right-3 flex items-center gap-2 px-3 py-1 rounded-full bg-[#14161acc] backdrop-blur-md border border-[#262832] text-neutral-300 text-[11px] font-mono shadow-lg pointer-events-auto">
        <span className="text-neutral-500">CANVAS</span>
        <span className="text-cyan-400 font-semibold">{project.width} × {project.height}</span>
        <span className="text-neutral-600">|</span>
        <span className="text-neutral-300">{Math.round(viewport.zoom * 100)}%</span>
      </div>
    </main>
  );
};
