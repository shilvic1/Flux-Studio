import React, { useState } from 'react';
import {
  Sliders,
  Palette,
  Layers,
  Image as ImageIcon,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useFlux } from '../context/FluxContext';
import { BlendMode } from '../types/flux';

type Tab = 'tool' | 'color' | 'layers' | 'reference';

const BLEND_MODES: { id: BlendMode; label: string }[] = [
  { id: 'source-over', label: 'Normal' },
  { id: 'multiply', label: 'Multiply' },
  { id: 'screen', label: 'Screen' },
  { id: 'overlay', label: 'Overlay' },
  { id: 'darken', label: 'Darken' },
  { id: 'lighten', label: 'Lighten' },
  { id: 'color-dodge', label: 'Color Dodge' },
  { id: 'color-burn', label: 'Color Burn' },
  { id: 'hard-light', label: 'Hard Light' },
  { id: 'soft-light', label: 'Soft Light' },
  { id: 'difference', label: 'Difference' },
];

export const InspectorPanel: React.FC = () => {
  const {
    activeTool,
    brush,
    updateBrush,
    color,
    setColor,
    palette,
    addToPalette,
    currentFrame,
    currentLayerId,
    setCurrentLayerId,
    addLayer,
    duplicateLayer,
    deleteLayer,
    reorderLayers,
    updateLayer,
    mergeLayerDown,
    isInspectorOpen,
    setIsInspectorOpen,
    accentColor,
    referenceImage,
    setReferenceImage,
    updateReferenceImage,
  } = useFlux();

  const [activeTab, setActiveTab] = useState<Tab>('layers');

  const handleRefUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = ev => {
        if (ev.target?.result) {
          setReferenceImage({
            url: ev.target.result as string,
            visible: true,
            opacity: 0.7,
            x: 80,
            y: 60,
            width: 280,
            height: 220,
            locked: false,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isInspectorOpen) return null;

  return (
    <aside className="absolute right-4 top-16 bottom-24 w-80 bg-[#191b20]/95 backdrop-blur-md border border-[#2d3039] rounded-2xl shadow-2xl flex flex-col z-40 select-none text-xs animate-in slide-in-from-right-4 duration-150">
      {/* Tab Navigation & Close */}
      <div className="h-11 bg-[#141518]/90 border-b border-[#26282e] rounded-t-2xl flex items-center justify-between px-2">
        <div className="flex items-center gap-1 flex-1">
          <button
            onClick={() => setActiveTab('layers')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'layers'
                ? 'text-cyan-400 bg-[#20222a] border border-[#2d3038]'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Layers Stack"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Layers</span>
          </button>

          <button
            onClick={() => setActiveTab('color')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'color'
                ? 'text-cyan-400 bg-[#20222a] border border-[#2d3038]'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Color Palette"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Color</span>
          </button>

          <button
            onClick={() => setActiveTab('tool')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'tool'
                ? 'text-cyan-400 bg-[#20222a] border border-[#2d3038]'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Tool & Brush Dynamics"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Dynamics</span>
          </button>

          <button
            onClick={() => setActiveTab('reference')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              activeTab === 'reference'
                ? 'text-cyan-400 bg-[#20222a] border border-[#2d3038]'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
            title="Reference Image"
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Ref</span>
          </button>
        </div>

        <button
          onClick={() => setIsInspectorOpen(false)}
          className="p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-[#252832]"
          title="Close Inspector"
        >
          ✕
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-3 text-neutral-300 space-y-4">
        {/* TAB 1: BRUSH & TOOL DYNAMICS */}
        {activeTab === 'tool' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#24262c]">
              <span className="font-semibold text-neutral-200 capitalize">{activeTool} Settings</span>
              <span className="text-[10px] text-neutral-500 font-mono">DYNAMICS</span>
            </div>

            {/* Brush Tip Preview */}
            <div className="h-16 bg-[#1a1c21] rounded border border-[#25272e] flex items-center justify-center relative overflow-hidden">
              <div
                className="rounded-full transition-all"
                style={{
                  width: Math.min(50, Math.max(2, brush.size)),
                  height: Math.min(50, Math.max(2, brush.size)),
                  backgroundColor: color,
                  opacity: brush.opacity,
                  filter: brush.hardness < 0.9 ? `blur(${(1 - brush.hardness) * 4}px)` : 'none',
                }}
              />
              <span className="absolute bottom-1 right-2 text-[10px] text-neutral-500 font-mono">
                {brush.size}px
              </span>
            </div>

            {/* Size Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>Tip Size</span>
                <span className="font-mono text-neutral-200">{brush.size} px</span>
              </div>
              <input
                type="range"
                min="1"
                max="120"
                value={brush.size}
                onChange={e => updateBrush({ size: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#252830] rounded-lg"
              />
              <div className="flex gap-1 pt-1">
                {[2, 4, 8, 16, 32, 64].map(sz => (
                  <button
                    key={sz}
                    onClick={() => updateBrush({ size: sz })}
                    className={`flex-1 py-0.5 rounded text-[10px] font-mono border ${
                      brush.size === sz
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                        : 'bg-[#1e2025] text-neutral-400 border-[#2a2c33] hover:text-white'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Opacity Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>Opacity</span>
                <span className="font-mono text-neutral-200">{Math.round(brush.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.01"
                value={brush.opacity}
                onChange={e => updateBrush({ opacity: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#252830] rounded-lg"
              />
            </div>

            {/* Hardness / Softness Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>Hardness</span>
                <span className="font-mono text-neutral-200">{Math.round(brush.hardness * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={brush.hardness}
                onChange={e => updateBrush({ hardness: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#252830] rounded-lg"
              />
            </div>

            {/* Stabilizer Level */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-neutral-400">
                <span>Smoothing / Stabilizer</span>
                <span className="font-mono text-neutral-200">Lvl {brush.stabilizer}</span>
              </div>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={brush.stabilizer}
                onChange={e => updateBrush({ stabilizer: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#252830] rounded-lg"
              />
            </div>

            {/* Stylus Pressure toggle */}
            <div className="flex items-center justify-between p-2 rounded bg-[#1a1c21] border border-[#25272e]">
              <div>
                <span className="text-neutral-200 font-medium block">Stylus Pressure</span>
                <span className="text-[10px] text-neutral-500">Apple Pencil & Tablet Stylus</span>
              </div>
              <button
                onClick={() => updateBrush({ pressureSensitivity: !brush.pressureSensitivity })}
                className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                  brush.pressureSensitivity ? 'bg-emerald-600' : 'bg-[#2b2e37]'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${
                    brush.pressureSensitivity ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: COLOR STUDIO */}
        {activeTab === 'color' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#24262c]">
              <span className="font-semibold text-neutral-200">Color Studio</span>
              <span className="text-[10px] text-neutral-500 font-mono">SWATCHES</span>
            </div>

            {/* Color preview & Hex input */}
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={color}
                onChange={e => setColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer border border-[#2e313a] bg-transparent"
              />
              <div className="flex-1">
                <span className="text-[10px] text-neutral-500 uppercase block font-mono">Hex Code</span>
                <input
                  type="text"
                  value={color.toUpperCase()}
                  onChange={e => {
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(e.target.value)) {
                      setColor(e.target.value);
                    }
                  }}
                  className="bg-[#202227] text-neutral-200 px-2 py-1 rounded border border-[#2d3038] w-full font-mono text-xs uppercase"
                />
              </div>
              <button
                onClick={() => addToPalette(color)}
                className="px-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center gap-1 self-end"
                title="Add to Swatches"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Swatches Grid */}
            <div className="space-y-1.5">
              <span className="text-neutral-400 text-[11px]">Palette Swatches</span>
              <div className="grid grid-cols-6 gap-1.5 p-2 bg-[#1a1c21] rounded border border-[#25272e]">
                {palette.map((swatch, idx) => (
                  <div
                    key={idx}
                    onClick={() => setColor(swatch)}
                    style={{ backgroundColor: swatch }}
                    className={`w-7 h-7 rounded-sm border cursor-pointer hover:scale-110 transition-transform ${
                      color.toLowerCase() === swatch.toLowerCase()
                        ? 'border-white ring-1 ring-emerald-500 scale-105'
                        : 'border-[#2e313a]'
                    }`}
                    title={swatch}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: LAYERS STACK */}
        {activeTab === 'layers' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#24262c]">
              <span className="font-semibold text-neutral-200">Layers Stack</span>
              <button
                onClick={addLayer}
                className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"
                title="Add New Layer"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {/* Layer List - rendered reversed so top layer is at the top */}
            <div className="space-y-1.5">
              {currentFrame.layers
                .slice()
                .reverse()
                .map((layer, revIdx) => {
                  const actualIdx = currentFrame.layers.length - 1 - revIdx;
                  const isSelected = layer.id === currentLayerId;

                  return (
                    <div
                      key={layer.id}
                      onClick={() => setCurrentLayerId(layer.id)}
                      className={`p-2 rounded border transition-colors ${
                        isSelected
                          ? 'bg-[#20232a] border-emerald-500/50 text-white'
                          : 'bg-[#181a1f] border-[#25272e] text-neutral-300 hover:bg-[#1d1f25]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          {/* Visibility Eye */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              updateLayer(layer.id, { visible: !layer.visible });
                            }}
                            className={`p-0.5 rounded hover:text-white ${
                              layer.visible ? 'text-neutral-400' : 'text-neutral-600'
                            }`}
                            title="Toggle Visibility"
                          >
                            {layer.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Lock Padlock */}
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              updateLayer(layer.id, { locked: !layer.locked });
                            }}
                            className={`p-0.5 rounded hover:text-white ${
                              layer.locked ? 'text-amber-400' : 'text-neutral-600'
                            }`}
                            title="Lock Layer"
                          >
                            {layer.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                          </button>

                          <span className="font-medium truncate text-xs">{layer.name}</span>
                        </div>

                        {/* Reorder and Layer Actions */}
                        <div className="flex items-center gap-0.5" onClick={e => e.stopPropagation()}>
                          <button
                            disabled={actualIdx === currentFrame.layers.length - 1}
                            onClick={() => reorderLayers(actualIdx, actualIdx + 1)}
                            className="p-1 rounded text-neutral-500 hover:text-neutral-200 disabled:opacity-20"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3 h-3" />
                          </button>
                          <button
                            disabled={actualIdx === 0}
                            onClick={() => reorderLayers(actualIdx, actualIdx - 1)}
                            className="p-1 rounded text-neutral-500 hover:text-neutral-200 disabled:opacity-20"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => duplicateLayer(layer.id)}
                            className="p-1 rounded text-neutral-500 hover:text-neutral-200"
                            title="Duplicate Layer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {actualIdx > 0 && (
                            <button
                              onClick={() => mergeLayerDown(layer.id)}
                              className="p-1 rounded text-neutral-500 hover:text-neutral-200"
                              title="Merge Down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          )}
                          {currentFrame.layers.length > 1 && (
                            <button
                              onClick={() => deleteLayer(layer.id)}
                              className="p-1 rounded text-neutral-500 hover:text-rose-400"
                              title="Delete Layer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Opacity and Blend Mode */}
                      {isSelected && (
                        <div className="pt-2 border-t border-[#2a2d36] space-y-2" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-neutral-400">Blend Mode</span>
                            <select
                              value={layer.blendMode}
                              onChange={e => updateLayer(layer.id, { blendMode: e.target.value as BlendMode })}
                              className="bg-[#141518] text-neutral-200 px-1.5 py-0.5 rounded border border-[#2d3038] outline-none text-[11px]"
                            >
                              {BLEND_MODES.map(bm => (
                                <option key={bm.id} value={bm.id}>
                                  {bm.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-neutral-400">
                              <span>Opacity</span>
                              <span className="font-mono">{Math.round(layer.opacity * 100)}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.01"
                              value={layer.opacity}
                              onChange={e => updateLayer(layer.id, { opacity: Number(e.target.value) })}
                              className="w-full accent-emerald-500 cursor-pointer h-1.5 bg-[#252830] rounded-lg"
                            />
                          </div>

                          {/* Alpha Lock Toggle */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-neutral-400 text-[11px]">Alpha Lock (Draw inside pixels)</span>
                            <button
                              onClick={() => updateLayer(layer.id, { alphaLock: !layer.alphaLock })}
                              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                                layer.alphaLock
                                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                  : 'bg-[#181a1f] text-neutral-500 border-[#2b2d35]'
                              }`}
                            >
                              {layer.alphaLock ? 'LOCKED' : 'OFF'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* TAB 4: REFERENCE IMAGE */}
        {activeTab === 'reference' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#24262c]">
              <span className="font-semibold text-neutral-200">Reference Photo / Sketch</span>
              <span className="text-[10px] text-cyan-400 font-mono">CANVAS OVERLAY</span>
            </div>

            {referenceImage ? (
              <div className="space-y-3">
                <div className="relative rounded overflow-hidden border border-[#2b2d35]">
                  <img
                    src={referenceImage.url}
                    alt="Reference"
                    className="w-full h-36 object-contain bg-[#111215]"
                    style={{ opacity: referenceImage.opacity }}
                  />
                  <button
                    onClick={() => setReferenceImage(null)}
                    className="absolute top-1 right-1 p-1 rounded bg-black/60 text-white hover:text-rose-400"
                    title="Remove Reference"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-neutral-400">
                    <span>Reference Opacity</span>
                    <span className="font-mono text-cyan-400">{Math.round(referenceImage.opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={referenceImage.opacity}
                    onChange={e => updateReferenceImage({ opacity: Number(e.target.value) })}
                    className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-[#252830] rounded-lg"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#252830] text-[11px]">
                  <button
                    onClick={() => updateReferenceImage({ locked: !referenceImage.locked })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded border ${
                      referenceImage.locked
                        ? 'bg-amber-950/40 text-amber-400 border-amber-800/50'
                        : 'bg-[#22242a] text-neutral-300 border-[#2f323a] hover:text-white'
                    }`}
                  >
                    {referenceImage.locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    <span>{referenceImage.locked ? 'Locked' : 'Unlocked'}</span>
                  </button>

                  <button
                    onClick={() => updateReferenceImage({ visible: !referenceImage.visible })}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded border ${
                      referenceImage.visible
                        ? 'bg-cyan-950/40 text-cyan-400 border-cyan-800/50'
                        : 'bg-[#22242a] text-neutral-400 border-[#2f323a]'
                    }`}
                  >
                    {referenceImage.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    <span>{referenceImage.visible ? 'Visible' : 'Hidden'}</span>
                  </button>

                  <button
                    onClick={() => updateReferenceImage({ x: 40, y: 40, width: 280, height: 220 })}
                    className="px-2.5 py-1 rounded bg-[#22242a] text-neutral-300 border border-[#2f323a] hover:text-white"
                  >
                    Reset Pos
                  </button>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-[#2f323a] rounded-lg p-6 text-center space-y-2">
                <ImageIcon className="w-8 h-8 text-neutral-500 mx-auto" />
                <p className="text-neutral-400 text-xs">Load an inspiration photo or model sheet</p>
                <label className="inline-block px-3 py-1.5 rounded bg-[#202227] hover:bg-[#282a31] text-cyan-400 border border-[#2d3038] cursor-pointer text-xs font-medium transition-colors">
                  Choose Image
                  <input type="file" accept="image/*" onChange={handleRefUpload} className="hidden" />
                </label>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
