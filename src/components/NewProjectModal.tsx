import React, { useState } from 'react';
import { X, Sparkles, Check } from 'lucide-react';
import { useFlux } from '../context/FluxContext';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  { label: 'Standard Canvas', w: 800, h: 600, desc: 'Great for digital illustration & cartoons' },
  { label: '1080p Full HD', w: 1920, h: 1080, desc: 'Widescreen 16:9 cinematic animation' },
  { label: '720p HD', w: 1280, h: 720, desc: 'Lightweight video & streaming' },
  { label: 'Square Canvas', w: 800, h: 800, desc: '1:1 ratio for avatars & social media' },
  { label: 'Pixel Art (128px)', w: 128, h: 128, desc: 'Retro game sprites & icons' },
  { label: 'Pixel Art (64px)', w: 64, h: 64, desc: 'Micro retro animations' },
];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ isOpen, onClose }) => {
  const { createNewProject } = useFlux();

  const [title, setTitle] = useState('My Animation');
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [fps, setFps] = useState(12);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalW = Math.max(16, Math.min(4096, Number(width) || 800));
    const finalH = Math.max(16, Math.min(4096, Number(height) || 600));
    const finalFps = Math.max(1, Math.min(60, Number(fps) || 12));

    createNewProject(finalW, finalH, finalFps, title.trim() || 'New Animation');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#18191e] border border-[#2c2f38] rounded-xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#26282f] flex items-center justify-between bg-[#141518]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold text-sm">Create New Animation Canvas</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Project Title */}
          <div className="space-y-1">
            <label className="text-neutral-400 block">Project Title</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-[#1e2025] border border-[#2b2e37] rounded px-3 py-1.5 text-neutral-200 outline-none focus:border-emerald-500"
              placeholder="e.g. Character Walk Cycle"
            />
          </div>

          {/* Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-neutral-400 block">Canvas Presets</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map((p, idx) => {
                const isSelected = width === p.w && height === p.h;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setWidth(p.w);
                      setHeight(p.h);
                    }}
                    className={`p-2 rounded text-left border transition-all ${
                      isSelected
                        ? 'bg-emerald-950/30 border-emerald-500 text-white'
                        : 'bg-[#141518] border-[#25272e] text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    <div className="font-medium text-neutral-200 flex items-center justify-between">
                      <span>{p.label}</span>
                      {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                    </div>
                    <div className="font-mono text-[10px] text-neutral-500 mt-0.5">
                      {p.w} × {p.h} px
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Dimensions & FPS */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="space-y-1">
              <label className="text-neutral-400 block font-mono">Width (px)</label>
              <input
                type="number"
                min="16"
                max="4096"
                value={width}
                onChange={e => setWidth(Number(e.target.value))}
                className="w-full bg-[#1e2025] border border-[#2b2e37] rounded px-2 py-1.5 font-mono text-center text-neutral-200 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400 block font-mono">Height (px)</label>
              <input
                type="number"
                min="16"
                max="4096"
                value={height}
                onChange={e => setHeight(Number(e.target.value))}
                className="w-full bg-[#1e2025] border border-[#2b2e37] rounded px-2 py-1.5 font-mono text-center text-neutral-200 outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-neutral-400 block font-mono">Framerate</label>
              <select
                value={fps}
                onChange={e => setFps(Number(e.target.value))}
                className="w-full bg-[#1e2025] border border-[#2b2e37] rounded px-2 py-1.5 font-mono text-center text-neutral-200 outline-none"
              >
                <option value={8}>8 fps</option>
                <option value={12}>12 fps (Anime)</option>
                <option value={24}>24 fps (Cinema)</option>
                <option value={30}>30 fps (Web)</option>
                <option value={60}>60 fps (Smooth)</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg bg-[#202227] hover:bg-[#26282f] text-neutral-300 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow transition-colors"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
