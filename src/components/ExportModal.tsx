import React, { useState } from 'react';
import { X, Film, Grid, Image as ImageIcon, FileCode, Download, Loader2, Check } from 'lucide-react';
import { useFlux } from '../context/FluxContext';
import { downloadBlob, exportToGif, exportToSpriteSheet, compositeFrameToCanvas } from '../utils/exportEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { project, layerCanvasesMap, fps, setProject, triggerCanvasUpdate } = useFlux();

  const [activeTab, setActiveTab] = useState<'gif' | 'spritesheet' | 'frame' | 'project'>('gif');
  const [gifScale, setGifScale] = useState<number>(1);
  const [includeBg, setIncludeBg] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [exportedResult, setExportedResult] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handle GIF generation
  const handleExportGif = async () => {
    setIsExporting(true);
    setProgress(0);
    setExportedResult(null);

    try {
      const blob = await exportToGif(project, layerCanvasesMap.current, {
        scale: gifScale,
        fps,
        includeBackground: includeBg,
        onProgress: p => setProgress(Math.round(p * 100)),
      });

      downloadBlob(blob, `${project.title.toLowerCase().replace(/\s+/g, '_')}.gif`);
      setExportedResult('GIF exported and downloaded successfully!');
    } catch (err) {
      console.error('GIF export failed:', err);
      alert('Failed to generate GIF: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Sprite Sheet generation
  const handleExportSpriteSheet = async () => {
    setIsExporting(true);
    try {
      const { blob, metadata } = await exportToSpriteSheet(project, layerCanvasesMap.current, {
        columns: project.frames.length,
        transparent: !includeBg,
      });

      const baseName = project.title.toLowerCase().replace(/\s+/g, '_');
      downloadBlob(blob, `${baseName}_spritesheet.png`);

      const metaBlob = new Blob([metadata], { type: 'application/json' });
      downloadBlob(metaBlob, `${baseName}_spritesheet.json`);

      setExportedResult('Sprite Sheet and JSON metadata downloaded!');
    } catch (err) {
      console.error('Sprite sheet export failed:', err);
      alert('Failed to generate Sprite Sheet: ' + (err instanceof Error ? err.message : String(err)));
    } finally {
      setIsExporting(false);
    }
  };

  // Handle current frame PNG download
  const handleExportCurrentFrame = async () => {
    setIsExporting(true);
    try {
      const frame = project.frames[0];
      const frameMap = layerCanvasesMap.current.get(frame.id) || new Map();
      const compCanvas = await compositeFrameToCanvas(frame, project.width, project.height, frameMap, includeBg);

      compCanvas.toBlob(blob => {
        if (blob) {
          downloadBlob(blob, `${project.title.toLowerCase().replace(/\s+/g, '_')}_frame.png`);
          setExportedResult('Current frame PNG downloaded!');
        }
      }, 'image/png');
    } catch (err) {
      console.error('Frame export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Project JSON download
  const handleExportProjectJson = () => {
    // Serialize all frames with layers dataUrls
    const updatedFrames = project.frames.map(f => {
      const frameMap = layerCanvasesMap.current.get(f.id);
      const layers = f.layers.map(l => {
        const canvas = frameMap?.get(l.id);
        const dataUrl = canvas ? canvas.toDataURL('image/png') : l.dataUrl;
        return { ...l, dataUrl };
      });
      return { ...f, layers };
    });

    const exportData = {
      app: 'FLUX Studio',
      version: 1,
      project: {
        ...project,
        frames: updatedFrames,
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${project.title.toLowerCase().replace(/\s+/g, '_')}.fluxproject`);
    setExportedResult('FLUX project file downloaded!');
  };

  // Handle importing a project file
  const handleImportProjectJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (parsed.project && parsed.project.frames) {
          setProject(parsed.project);
          triggerCanvasUpdate();
          setExportedResult('Project imported successfully!');
          onClose();
        } else {
          alert('Invalid FLUX project file format.');
        }
      } catch (err) {
        alert('Failed to parse project JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#18191e] border border-[#2c2f38] rounded-xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col text-neutral-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#26282f] flex items-center justify-between bg-[#141518]">
          <div className="flex items-center gap-2">
            <Download className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold text-sm">Export & Share Animation</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Format Tabs */}
        <div className="flex border-b border-[#26282f] bg-[#141518] px-4 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('gif')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'gif'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Animated GIF</span>
          </button>

          <button
            onClick={() => setActiveTab('spritesheet')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'spritesheet'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Sprite Sheet</span>
          </button>

          <button
            onClick={() => setActiveTab('frame')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'frame'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Single Frame PNG</span>
          </button>

          <button
            onClick={() => setActiveTab('project')}
            className={`flex items-center gap-1.5 px-3 py-2.5 font-medium border-b-2 transition-colors ${
              activeTab === 'project'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Project File</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          {/* GIF TAB */}
          {activeTab === 'gif' && (
            <div className="space-y-4">
              <p className="text-neutral-400">
                Encodes all {project.frames.length} frames into a high-fidelity loopable Animated GIF at {fps} frames per second.
              </p>

              <div className="grid grid-cols-2 gap-3 p-3 bg-[#131417] rounded-lg border border-[#24262d]">
                <div>
                  <span className="text-neutral-400 block mb-1">Resolution Scale</span>
                  <select
                    value={gifScale}
                    onChange={e => setGifScale(Number(e.target.value))}
                    className="w-full bg-[#1e2025] border border-[#2b2e37] rounded px-2 py-1.5 text-neutral-200 outline-none"
                  >
                    <option value={1}>1.0x ({project.width} × {project.height})</option>
                    <option value={0.5}>0.5x ({Math.round(project.width * 0.5)} × {Math.round(project.height * 0.5)})</option>
                    <option value={2}>2.0x ({project.width * 2} × {project.height * 2})</option>
                  </select>
                </div>

                <div>
                  <span className="text-neutral-400 block mb-1">Background Fill</span>
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      id="bgFill"
                      checked={includeBg}
                      onChange={e => setIncludeBg(e.target.checked)}
                      className="accent-emerald-500 rounded"
                    />
                    <label htmlFor="bgFill" className="text-neutral-300">White Background</label>
                  </div>
                </div>
              </div>

              {isExporting && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-neutral-400">
                    <span>Encoding GIF frames...</span>
                    <span className="font-mono text-emerald-400">{progress}%</span>
                  </div>
                  <div className="w-full h-2 bg-[#202227] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-150"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={handleExportGif}
                disabled={isExporting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium flex items-center justify-center gap-2 transition-colors shadow"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>{isExporting ? 'Generating GIF...' : 'Generate and Download GIF'}</span>
              </button>
            </div>
          )}

          {/* SPRITE SHEET TAB */}
          {activeTab === 'spritesheet' && (
            <div className="space-y-4">
              <p className="text-neutral-400">
                Exports a horizontal PNG sprite sheet suitable for games (Unity, Godot, Unreal, PixiJS) alongside metadata coordinates.
              </p>

              <div className="p-3 bg-[#131417] rounded-lg border border-[#24262d] space-y-2">
                <div className="flex justify-between text-neutral-400">
                  <span>Frame Dimensions:</span>
                  <span className="font-mono text-neutral-200">{project.width} × {project.height} px</span>
                </div>
                <div className="flex justify-between text-neutral-400">
                  <span>Total Sprite Sheet Size:</span>
                  <span className="font-mono text-neutral-200">
                    {project.width * project.frames.length} × {project.height} px
                  </span>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="sheetBg"
                    checked={!includeBg}
                    onChange={e => setIncludeBg(!e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <label htmlFor="sheetBg" className="text-neutral-300">Transparent Background</label>
                </div>
              </div>

              <button
                onClick={handleExportSpriteSheet}
                disabled={isExporting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium flex items-center justify-center gap-2 transition-colors shadow"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                <span>Download Sprite Sheet & JSON</span>
              </button>
            </div>
          )}

          {/* SINGLE FRAME TAB */}
          {activeTab === 'frame' && (
            <div className="space-y-4">
              <p className="text-neutral-400">
                Saves the current animation frame as a full-resolution 32-bit PNG image.
              </p>

              <button
                onClick={handleExportCurrentFrame}
                disabled={isExporting}
                className="w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium flex items-center justify-center gap-2 transition-colors shadow"
              >
                <Download className="w-4 h-4" />
                <span>Download Current Frame PNG</span>
              </button>
            </div>
          )}

          {/* PROJECT FILE TAB */}
          {activeTab === 'project' && (
            <div className="space-y-4">
              <p className="text-neutral-400">
                Backup the full multi-frame, multi-layer editable vector and raster data to an open <code className="text-emerald-400">.fluxproject</code> file.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleExportProjectJson}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 transition-colors shadow"
                >
                  <Download className="w-4 h-4" />
                  <span>Download .fluxproject</span>
                </button>

                <label className="flex-1 py-2.5 rounded-lg bg-[#202227] hover:bg-[#282a31] border border-[#2d3038] text-neutral-200 font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer">
                  <span>Import .fluxproject</span>
                  <input type="file" accept=".fluxproject,.json" onChange={handleImportProjectJson} className="hidden" />
                </label>
              </div>
            </div>
          )}

          {exportedResult && (
            <div className="flex items-center gap-2 p-2.5 rounded bg-emerald-950/40 border border-emerald-800/60 text-emerald-400">
              <Check className="w-4 h-4 flex-shrink-0" />
              <span>{exportedResult}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
