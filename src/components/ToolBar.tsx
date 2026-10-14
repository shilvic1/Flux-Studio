import React, { useState } from 'react';
import {
  Paintbrush,
  Pencil,
  PenTool,
  Highlighter,
  Wind,
  Eraser,
  PaintBucket,
  Pipette,
  Minus,
  Square,
  Circle,
  Hand,
  ArrowLeftRight,
  Trash2,
  Spline,
} from 'lucide-react';
import { useFlux } from '../context/FluxContext';
import { ToolType } from '../types/flux';

// Custom FlipaClip Lasso Icon
const LassoIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M7 22a5 5 0 0 1-2-4c0-4 4-8 9-8s8 4 8 8a6 6 0 0 1-6 6c-3 0-5-2-5-4 0-3 3-5 6-5" />
    <path d="M5 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0" strokeDasharray="2 2" />
  </svg>
);

export const ToolBar: React.FC = () => {
  const {
    activeTool,
    setActiveTool,
    brush,
    updateBrush,
    color,
    setColor,
    secondaryColor,
    setSecondaryColor,
    clearCurrentLayer,
    accentColor,
    palette,
  } = useFlux();

  const [showBrushPopup, setShowBrushPopup] = useState(false);
  const [showBrushTypes, setShowBrushTypes] = useState(false);
  const [showShapeTypes, setShowShapeTypes] = useState(false);

  const handleSwapColors = () => {
    const temp = color;
    setColor(secondaryColor);
    setSecondaryColor(temp);
  };

  const isBrushFamily = ['brush', 'pencil', 'pen', 'marker', 'airbrush'].includes(activeTool);
  const isShapeFamily = ['rect', 'ellipse'].includes(activeTool);

  return (
    <aside className="absolute left-4 top-16 z-30 select-none flex items-start gap-2">
      {/* FlipaClip-inspired floating capsule tool rail */}
      <div className="bg-[#181a1f]/95 backdrop-blur-md border border-[#2b2d38] shadow-2xl rounded-2xl p-1.5 flex flex-col items-center gap-1.5">
        {/* 1. BRUSH & DRAWING ENGINE */}
        <div className="relative">
          <button
            onClick={() => {
              if (isBrushFamily) {
                setShowBrushPopup(!showBrushPopup);
              } else {
                setActiveTool('brush');
                setShowBrushPopup(false);
              }
            }}
            onContextMenu={e => {
              e.preventDefault();
              setShowBrushTypes(!showBrushTypes);
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isBrushFamily
                ? 'text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#252831]'
            }`}
            style={{
              backgroundColor: isBrushFamily ? accentColor : 'transparent',
            }}
            title="Pen / Brush (Click to adjust size, right-click for brush types)"
          >
            {activeTool === 'pencil' ? (
              <Pencil className="w-4 h-4" />
            ) : activeTool === 'pen' ? (
              <PenTool className="w-4 h-4" />
            ) : activeTool === 'marker' ? (
              <Highlighter className="w-4 h-4" />
            ) : activeTool === 'airbrush' ? (
              <Wind className="w-4 h-4" />
            ) : (
              <Paintbrush className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 2. ERASER */}
        <button
          onClick={() => {
            if (activeTool === 'eraser') {
              setShowBrushPopup(!showBrushPopup);
            } else {
              setActiveTool('eraser');
              setShowBrushPopup(false);
            }
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            activeTool === 'eraser'
              ? 'text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-[#252831]'
          }`}
          style={{
            backgroundColor: activeTool === 'eraser' ? accentColor : 'transparent',
          }}
          title="Eraser (Click to adjust size)"
        >
          <Eraser className="w-4 h-4" />
        </button>

        {/* 3. LASSO SELECTION TOOL */}
        <button
          onClick={() => {
            setActiveTool('lasso');
            setShowBrushPopup(false);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            activeTool === 'lasso'
              ? 'text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-[#252831]'
          }`}
          style={{
            backgroundColor: activeTool === 'lasso' ? accentColor : 'transparent',
          }}
          title="Lasso Selection (Draw loop around artwork to transform & move)"
        >
          <LassoIcon className="w-4 h-4" />
        </button>

        {/* 4. PAINT BUCKET FLOOD FILL */}
        <button
          onClick={() => {
            setActiveTool('bucket');
            setShowBrushPopup(false);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            activeTool === 'bucket'
              ? 'text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-[#252831]'
          }`}
          style={{
            backgroundColor: activeTool === 'bucket' ? accentColor : 'transparent',
          }}
          title="Paint Bucket (Flood Fill)"
        >
          <PaintBucket className="w-4 h-4" />
        </button>

        {/* 5. DIRECT STRAIGHT LINE TOOL */}
        <button
          onClick={() => {
            setActiveTool('line');
            setShowBrushPopup(false);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            activeTool === 'line'
              ? 'text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-[#252831]'
          }`}
          style={{
            backgroundColor: activeTool === 'line' ? accentColor : 'transparent',
          }}
          title="Straight Line Tool (Drag to draw perfectly straight lines, hold Shift to snap)"
        >
          <Minus className="w-4 h-4 -rotate-45" />
        </button>

        {/* 6. SHAPES (RECTANGLE & ELLIPSE) */}
        <div className="relative">
          <button
            onClick={() => {
              if (isShapeFamily) {
                setShowShapeTypes(!showShapeTypes);
              } else {
                setActiveTool('rect');
              }
            }}
            onContextMenu={e => {
              e.preventDefault();
              setShowShapeTypes(!showShapeTypes);
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              isShapeFamily
                ? 'text-white shadow-md'
                : 'text-neutral-400 hover:text-white hover:bg-[#252831]'
            }`}
            style={{
              backgroundColor: isShapeFamily ? accentColor : 'transparent',
            }}
            title="Shapes Tool (Rectangle & Ellipse)"
          >
            {activeTool === 'ellipse' ? (
              <Circle className="w-4 h-4" />
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* 7. EYEDROPPER COLOR PICKER */}
        <button
          onClick={() => {
            setActiveTool('eyedropper');
            setShowBrushPopup(false);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            activeTool === 'eyedropper'
              ? 'text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-[#252831]'
          }`}
          style={{
            backgroundColor: activeTool === 'eyedropper' ? accentColor : 'transparent',
          }}
          title="Eyedropper (Sample color from canvas)"
        >
          <Pipette className="w-4 h-4" />
        </button>

        {/* 8. HAND / PAN TOOL */}
        <button
          onClick={() => {
            setActiveTool('hand');
            setShowBrushPopup(false);
          }}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            activeTool === 'hand'
              ? 'text-white shadow-md'
              : 'text-neutral-400 hover:text-white hover:bg-[#252831]'
          }`}
          style={{
            backgroundColor: activeTool === 'hand' ? accentColor : 'transparent',
          }}
          title="Hand / Pan Canvas"
        >
          <Hand className="w-4 h-4" />
        </button>

        <div className="w-5 h-[1px] bg-[#2a2c35] my-0.5" />

        {/* COLOR MATRIX: Primary + Secondary + Swap */}
        <div className="relative w-8 h-8 flex items-center justify-center">
          {/* Secondary color swatch */}
          <div
            className="absolute bottom-0 right-0 w-4 h-4 rounded-sm border border-[#3f434d] shadow-sm cursor-pointer hover:scale-110 transition-transform"
            style={{ backgroundColor: secondaryColor }}
            onClick={() => {
              const hex = prompt('Enter secondary HEX (#rrggbb):', secondaryColor);
              if (hex && /^#[0-9A-Fa-f]{6}$/.test(hex)) setSecondaryColor(hex);
            }}
            title="Secondary Color"
          />

          {/* Primary color swatch with input */}
          <div className="absolute top-0 left-0 w-5 h-5 rounded-sm border-2 border-white shadow-md cursor-pointer hover:scale-110 transition-transform relative overflow-hidden">
            <input
              type="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              title="Primary Color"
            />
            <div className="w-full h-full" style={{ backgroundColor: color }} />
          </div>

          {/* Swap button */}
          <button
            onClick={handleSwapColors}
            className="absolute -bottom-2 -left-1 p-0.5 rounded bg-[#1e2025] text-neutral-400 hover:text-white border border-[#2b2e38] z-10"
            title="Swap Colors (X)"
          >
            <ArrowLeftRight className="w-2.5 h-2.5" />
          </button>
        </div>

        {/* Quick palette dot swatches */}
        <div className="flex flex-col gap-1 my-1">
          {palette.slice(0, 4).map(p => (
            <button
              key={p}
              onClick={() => setColor(p)}
              style={{ backgroundColor: p }}
              className="w-3.5 h-3.5 rounded-full border border-black/40 hover:scale-125 transition-transform"
              title={`Quick Color: ${p}`}
            />
          ))}
        </div>

        {/* Clear layer button */}
        <button
          onClick={() => {
            if (confirm('Clear drawings on active layer?')) {
              clearCurrentLayer();
            }
          }}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
          title="Clear Active Layer"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Brush Size Popover */}
      {showBrushPopup && (
        <div className="bg-[#1c1e24] border border-[#2d303a] rounded-2xl p-3 shadow-2xl w-48 text-xs text-neutral-300 space-y-3 animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between pb-1 border-b border-[#292c36]">
            <span className="font-semibold text-white capitalize">{activeTool} Size</span>
            <span className="font-mono text-cyan-400 text-[10px]">{brush.size}px</span>
          </div>

          <div className="space-y-1">
            <input
              type="range"
              min="1"
              max="100"
              value={brush.size}
              onChange={e => updateBrush({ size: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-[#252832] rounded cursor-pointer"
            />
            <div className="flex justify-between text-[9px] font-mono text-neutral-500">
              <span>1px</span>
              <span>50px</span>
              <span>100px</span>
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-neutral-400 text-[10px]">Opacity</span>
              <span className="font-mono text-[10px] text-cyan-400">{Math.round(brush.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.05"
              max="1"
              step="0.01"
              value={brush.opacity}
              onChange={e => updateBrush({ opacity: Number(e.target.value) })}
              className="w-full accent-cyan-400 h-1.5 bg-[#252832] rounded cursor-pointer"
            />
          </div>
        </div>
      )}

      {/* Brush Types Submenu */}
      {showBrushTypes && (
        <div className="bg-[#1c1e24] border border-[#2d303a] rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 text-xs text-neutral-300">
          {[
            { id: 'brush', label: 'Art Brush', icon: Paintbrush },
            { id: 'pencil', label: 'Pencil', icon: Pencil },
            { id: 'pen', label: 'Inking Pen', icon: PenTool },
            { id: 'marker', label: 'Marker', icon: Highlighter },
            { id: 'airbrush', label: 'Airbrush', icon: Wind },
          ].map(b => (
            <button
              key={b.id}
              onClick={() => {
                setActiveTool(b.id as ToolType);
                setShowBrushTypes(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left ${
                activeTool === b.id ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-[#252832]'
              }`}
            >
              <b.icon className="w-3.5 h-3.5" />
              <span>{b.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Shape Types Submenu */}
      {showShapeTypes && (
        <div className="bg-[#1c1e24] border border-[#2d303a] rounded-xl p-1.5 shadow-2xl flex flex-col gap-1 text-xs text-neutral-300">
          {[
            { id: 'rect', label: 'Rectangle', icon: Square },
            { id: 'ellipse', label: 'Ellipse', icon: Circle },
          ].map(s => (
            <button
              key={s.id}
              onClick={() => {
                setActiveTool(s.id as ToolType);
                setShowShapeTypes(false);
              }}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left ${
                activeTool === s.id ? 'bg-cyan-500/20 text-cyan-400' : 'hover:bg-[#252832]'
              }`}
            >
              <s.icon className="w-3.5 h-3.5" />
              <span>{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
};
