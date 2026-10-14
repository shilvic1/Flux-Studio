import React, { useEffect, useState, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Plus,
  Copy,
  Trash2,
  Repeat,
  Sparkles,
  Layers,
  Music,
  Settings2,
  Clock,
  ArrowLeft,
  ArrowRight,
  ZoomIn,
  ZoomOut,
  Volume2,
  SlidersHorizontal,
} from 'lucide-react';
import { useFlux } from '../context/FluxContext';

const FPS_PRESETS = [6, 8, 12, 16, 24, 30];

export const AnimationTimeline: React.FC = () => {
  const {
    project,
    currentFrameIndex,
    setCurrentFrameIndex,
    addFrame,
    duplicateFrame,
    deleteFrame,
    reorderFrames,
    setFrameDuration,
    isPlaying,
    togglePlayback,
    stopPlayback,
    fps,
    setFps,
    loop,
    setLoop,
    onionSkin,
    updateOnionSkin,
    layerCanvasesMap,
    getLayerCanvas,
    canvasVersion,
    accentColor,
    isInspectorOpen,
    setIsInspectorOpen,
  } = useFlux();

  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioInfo, setShowAudioInfo] = useState(false);
  const [showOnionPopover, setShowOnionPopover] = useState(false);
  const [timelineZoom, setTimelineZoom] = useState<'sm' | 'md' | 'lg'>('md');
  const [audioTracks, setAudioTracks] = useState<Array<{ id: string; name: string; startFrame: number }>>([
    { id: 'track_1', name: 'Background Beat', startFrame: 1 },
  ]);

  const stripRef = useRef<HTMLDivElement>(null);

  // Generate real mini thumbnails for frame cels
  useEffect(() => {
    const newThumbs = new Map<string, string>();
    const thumbW = 64;
    const thumbH = 48;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = thumbW;
    tempCanvas.height = thumbH;
    const ctx = tempCanvas.getContext('2d');
    if (!ctx) return;

    for (const frame of project.frames) {
      ctx.clearRect(0, 0, thumbW, thumbH);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, thumbW, thumbH);

      const frameMap = layerCanvasesMap.current.get(frame.id);
      for (const layer of frame.layers) {
        if (!layer.visible) continue;
        if (layer.name.toLowerCase().includes('background')) continue;
        const lCanvas = frameMap?.get(layer.id) || getLayerCanvas(frame.id, layer.id);
        if (lCanvas) {
          ctx.drawImage(lCanvas, 0, 0, thumbW, thumbH);
        }
      }
      newThumbs.set(frame.id, tempCanvas.toDataURL('image/jpeg', 0.65));
    }

    setThumbnails(newThumbs);
  }, [project.frames, canvasVersion, layerCanvasesMap, getLayerCanvas]);

  // Auto-scroll strip to active frame during playback or selection
  useEffect(() => {
    if (stripRef.current) {
      const activeElement = stripRef.current.children[currentFrameIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [currentFrameIndex]);

  const currentFrame = project.frames[currentFrameIndex];
  const totalFrames = project.frames.length;
  const currentTimeSec = ((currentFrameIndex + 1) / (fps || 12)).toFixed(2);
  const totalDurationSec = (
    project.frames.reduce((sum, f) => sum + (f.duration || 1), 0) / (fps || 12)
  ).toFixed(2);

  const handlePrevFrame = () => {
    if (currentFrameIndex > 0) {
      setCurrentFrameIndex(currentFrameIndex - 1);
    } else if (loop) {
      setCurrentFrameIndex(project.frames.length - 1);
    }
  };

  const handleNextFrame = () => {
    if (currentFrameIndex < project.frames.length - 1) {
      setCurrentFrameIndex(currentFrameIndex + 1);
    } else if (loop) {
      setCurrentFrameIndex(0);
    }
  };

  // Card dimensions based on zoom
  const cardSizeClass =
    timelineZoom === 'sm'
      ? 'w-12 h-10'
      : timelineZoom === 'lg'
      ? 'w-20 h-16'
      : 'w-16 h-12';

  return (
    <footer className="absolute bottom-4 left-4 right-4 z-30 select-none flex flex-col items-center pointer-events-none">
      {/* Floating Bottom Animation Dock */}
      <div className="w-full max-w-5xl bg-[#16181e]/95 backdrop-blur-md border border-[#272a33] rounded-2xl shadow-2xl px-4 py-2 flex flex-col gap-2 pointer-events-auto">
        {/* Frame Cels Strip & Transport Controls */}
        <div className="flex items-center justify-between gap-3">
          {/* Left Transport: Audio, Onion Skin, Settings */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Audio Track Toggle (FlipaClip bottom-left feature) */}
            <button
              onClick={() => {
                setShowAudioInfo(!showAudioInfo);
                setShowSettings(false);
                setShowOnionPopover(false);
              }}
              className={`p-2 rounded-xl transition-colors relative ${
                showAudioInfo
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-neutral-400 hover:text-white hover:bg-[#22242c]'
              }`}
              title="Audio & Sound Tracks"
            >
              <Music className="w-4 h-4" />
              {audioTracks.length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-cyan-400" />
              )}
            </button>

            {/* Onion Skin toggle & configuration */}
            <div className="relative flex items-center bg-[#15161b] rounded-xl border border-[#272a33] p-0.5">
              <button
                onClick={() => updateOnionSkin({ enabled: !onionSkin.enabled })}
                className={`px-2 py-1 rounded-lg transition-colors flex items-center gap-1.5 ${
                  onionSkin.enabled
                    ? 'bg-amber-500/20 text-amber-400 font-bold'
                    : 'text-neutral-400 hover:text-white hover:bg-[#22242c]'
                }`}
                title={onionSkin.enabled ? 'Onion Skinning is ACTIVE (Click to turn OFF)' : 'Turn ON Onion Skinning'}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-[10px] font-mono">ONION</span>
                {onionSkin.enabled && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                )}
              </button>
              <button
                onClick={() => {
                  setShowOnionPopover(!showOnionPopover);
                  setShowSettings(false);
                  setShowAudioInfo(false);
                }}
                className={`p-1 rounded-lg transition-colors text-neutral-400 hover:text-white ${
                  showOnionPopover ? 'bg-amber-500/30 text-amber-300' : 'hover:bg-[#22242c]'
                }`}
                title="Configure Onion Skinning (Frames, Opacity, Colors)"
              >
                <SlidersHorizontal className="w-3 h-3" />
              </button>
            </div>

            {/* FPS Settings */}
            <button
              onClick={() => {
                setShowSettings(!showSettings);
                setShowAudioInfo(false);
                setShowOnionPopover(false);
              }}
              className={`p-2 rounded-xl transition-colors ${
                showSettings
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-neutral-400 hover:text-white hover:bg-[#22242c]'
              }`}
              title="Timeline Settings & Framerate"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {/* Timeline Cel Zoom Size */}
            <button
              onClick={() => {
                setTimelineZoom(z => (z === 'sm' ? 'md' : z === 'md' ? 'lg' : 'sm'));
              }}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#22242c] text-[10px] font-mono px-2 hidden md:flex items-center gap-1"
              title="Toggle Timeline Thumbnail Size (Small / Medium / Large)"
            >
              <span>{timelineZoom.toUpperCase()}</span>
            </button>
          </div>

          {/* Center: Scrollable Frame Cards Strip */}
          <div
            ref={stripRef}
            className="flex-1 overflow-x-auto flex items-center justify-start gap-2 py-1 scrollbar-none px-2"
          >
            {project.frames.map((frame, idx) => {
              const isSelected = idx === currentFrameIndex;
              const thumbUrl = thumbnails.get(frame.id);

              return (
                <div
                  key={frame.id}
                  onClick={() => setCurrentFrameIndex(idx)}
                  className={`relative flex-shrink-0 ${cardSizeClass} rounded-xl border cursor-pointer transition-all flex flex-col justify-between overflow-hidden group shadow-md ${
                    isSelected
                      ? 'border-2 border-white ring-2 ring-cyan-500/50 scale-105 z-10'
                      : 'border-[#282b35] hover:border-neutral-500 bg-[#141519]'
                  }`}
                >
                  {/* Thumbnail Image */}
                  {thumbUrl ? (
                    <img
                      src={thumbUrl}
                      alt={`Frame ${idx + 1}`}
                      className="absolute inset-0 w-full h-full object-cover bg-white"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-white" />
                  )}

                  {/* Frame Number Badge (FlipaClip rounded pill) */}
                  <div className="relative z-10 flex justify-between items-center p-0.5">
                    <span
                      className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded text-white shadow-xs"
                      style={{
                        backgroundColor: isSelected ? accentColor : 'rgba(0,0,0,0.65)',
                      }}
                    >
                      {idx + 1}
                    </span>

                    {(frame.duration || 1) > 1 && (
                      <span className="text-[8px] font-mono px-1 rounded bg-amber-500/80 text-black font-bold">
                        {frame.duration}x
                      </span>
                    )}
                  </div>

                  {/* Hover Actions: Reorder Left, Duplicate, Hold Exposure, Reorder Right, Delete */}
                  <div className="relative z-10 flex items-center justify-between p-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/90 to-transparent">
                    {/* Move Left */}
                    {idx > 0 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          reorderFrames(idx, idx - 1);
                        }}
                        className="p-0.5 rounded text-white hover:text-cyan-400"
                        title="Move Frame Earlier"
                      >
                        <ArrowLeft className="w-2.5 h-2.5" />
                      </button>
                    )}

                    {/* Duplicate */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        duplicateFrame(idx);
                      }}
                      className="p-0.5 rounded text-white hover:text-cyan-400"
                      title="Duplicate Frame"
                    >
                      <Copy className="w-2.5 h-2.5" />
                    </button>

                    {/* Exposure Hold (1x, 2x, 3x, 4x) */}
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        const nextDuration = (frame.duration || 1) >= 4 ? 1 : (frame.duration || 1) + 1;
                        setFrameDuration(idx, nextDuration);
                      }}
                      className="p-0.5 rounded text-[8px] font-mono text-neutral-300 hover:text-amber-400 font-bold"
                      title={`Hold Exposure: ${frame.duration || 1} frames`}
                    >
                      {frame.duration || 1}x
                    </button>

                    {/* Move Right */}
                    {idx < project.frames.length - 1 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          reorderFrames(idx, idx + 1);
                        }}
                        className="p-0.5 rounded text-white hover:text-cyan-400"
                        title="Move Frame Later"
                      >
                        <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    )}

                    {/* Delete Frame */}
                    {project.frames.length > 1 && (
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          deleteFrame(idx);
                        }}
                        className="p-0.5 rounded text-white hover:text-rose-400"
                        title="Delete Frame"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Add Frame Dashed Cel Button (FlipaClip signature feature) */}
            <button
              onClick={() => addFrame()}
              className={`flex-shrink-0 ${cardSizeClass} rounded-xl border-2 border-dashed border-[#2f333f] hover:border-cyan-400/80 bg-[#16171c] hover:bg-[#1c1e25] flex items-center justify-center text-neutral-400 hover:text-cyan-400 transition-all cursor-pointer group`}
              title="Add New Frame (+)"
            >
              <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
            </button>
          </div>

          {/* Right Transport: Frame Steppers + Playback + Stop + Layers */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* First Frame */}
            <button
              onClick={() => setCurrentFrameIndex(0)}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#22242c] transition-colors"
              title="First Frame"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            {/* Previous Frame Step */}
            <button
              onClick={handlePrevFrame}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#22242c] transition-colors"
              title="Previous Frame (,)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Play / Pause (Large FlipaClip Cyan Button) */}
            <button
              onClick={togglePlayback}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ backgroundColor: accentColor }}
              title="Play / Pause Animation (Space)"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Stop Button */}
            <button
              onClick={stopPlayback}
              className="p-2 rounded-xl text-neutral-400 hover:text-rose-400 hover:bg-[#22242c] transition-colors"
              title="Stop & Rewind to Frame 1"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            {/* Next Frame Step */}
            <button
              onClick={handleNextFrame}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#22242c] transition-colors"
              title="Next Frame (.)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Last Frame */}
            <button
              onClick={() => setCurrentFrameIndex(project.frames.length - 1)}
              className="p-1.5 rounded-xl text-neutral-400 hover:text-white hover:bg-[#22242c] transition-colors"
              title="Last Frame"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            <div className="h-4 w-[1px] bg-[#272a33] mx-0.5" />

            {/* Frame counter badge */}
            <div className="text-[10px] font-mono text-neutral-400 text-right hidden sm:block min-w-12">
              <span className="text-white font-semibold">{currentFrameIndex + 1}</span>
              <span className="text-neutral-600">/{totalFrames}</span>
              <div className="text-[9px] text-cyan-400">{currentTimeSec}s / {totalDurationSec}s</div>
            </div>

            {/* Layers Toggle button on timeline right */}
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              className={`p-2 rounded-xl transition-colors ${
                isInspectorOpen
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-neutral-400 hover:text-white hover:bg-[#22242c]'
              }`}
              title="Layers & Settings Inspector"
            >
              <Layers className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Playback Scrubber Slider when multiple frames exist */}
        {totalFrames > 1 && (
          <div className="flex items-center gap-2 pt-1 px-1">
            <span className="text-[9px] font-mono text-neutral-500">1</span>
            <input
              type="range"
              min={0}
              max={totalFrames - 1}
              value={currentFrameIndex}
              onChange={e => setCurrentFrameIndex(Number(e.target.value))}
              className="w-full accent-cyan-400 h-1 bg-[#232630] rounded-lg cursor-pointer"
              title="Seek Frame"
            />
            <span className="text-[9px] font-mono text-neutral-500">{totalFrames}</span>
          </div>
        )}

        {/* Audio Info Popover */}
        {showAudioInfo && (
          <div className="pt-2 border-t border-[#252831] flex flex-col gap-2 text-xs text-neutral-300 animate-in fade-in duration-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-medium text-white">Audio & Sound Tracks</span>
                <span className="text-[10px] text-neutral-500">Sync sound effects with frame playback</span>
              </div>
              <button
                onClick={() => {
                  const newTrackName = `Sound Cue ${audioTracks.length + 1}`;
                  setAudioTracks(prev => [
                    ...prev,
                    { id: 'track_' + Date.now(), name: newTrackName, startFrame: currentFrameIndex + 1 },
                  ]);
                }}
                className="px-2.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 text-[11px] font-medium"
              >
                + Add Sound Cue at Frame {currentFrameIndex + 1}
              </button>
            </div>

            {audioTracks.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {audioTracks.map(track => (
                  <div
                    key={track.id}
                    className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-[#1f2128] border border-[#2c2f3a] text-[11px]"
                  >
                    <Volume2 className="w-3 h-3 text-cyan-400" />
                    <span>{track.name}</span>
                    <span className="text-[10px] font-mono text-neutral-500">Frame {track.startFrame}</span>
                    <button
                      onClick={() => setAudioTracks(prev => prev.filter(t => t.id !== track.id))}
                      className="text-neutral-500 hover:text-rose-400 ml-1"
                      title="Remove cue"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Onion Skin Settings Popover */}
        {showOnionPopover && (
          <div className="pt-2.5 pb-1 border-t border-[#252831] flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-300 animate-in fade-in duration-100">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Master toggle */}
              <button
                onClick={() => updateOnionSkin({ enabled: !onionSkin.enabled })}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border ${
                  onionSkin.enabled
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-[#181a20] text-neutral-400 border-[#282b35] hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{onionSkin.enabled ? 'Onion Skin: ON' : 'Onion Skin: OFF'}</span>
              </button>

              {/* Mode toggle */}
              <div className="flex items-center bg-[#15161b] rounded-lg p-0.5 border border-[#252831]">
                <button
                  onClick={() => updateOnionSkin({ tintMode: 'colored' })}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    onionSkin.tintMode !== 'original'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="FlipaClip style: Previous frames orange/red, Next frames cyan"
                >
                  Colored Silhouette
                </button>
                <button
                  onClick={() => updateOnionSkin({ tintMode: 'original' })}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    onionSkin.tintMode === 'original'
                      ? 'bg-amber-500/20 text-amber-300 font-semibold'
                      : 'text-neutral-400 hover:text-white'
                  }`}
                  title="Ghost original drawing colors with opacity"
                >
                  Original Colors
                </button>
              </div>

              {/* Prev Frames */}
              <div className="flex items-center gap-1.5 bg-[#16181f] px-2 py-1 rounded-lg border border-[#252831]">
                <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs" title="Previous Frames Color" />
                <span className="text-neutral-400 text-[11px]">Prev:</span>
                <input
                  type="range"
                  min="0"
                  max="4"
                  value={onionSkin.prevFrames}
                  onChange={e => updateOnionSkin({ prevFrames: Number(e.target.value) })}
                  className="w-14 accent-orange-400 h-1 bg-neutral-700 rounded cursor-pointer"
                />
                <span className="font-mono text-[11px] text-orange-400 font-semibold">{onionSkin.prevFrames}</span>
              </div>

              {/* Next Frames */}
              <div className="flex items-center gap-1.5 bg-[#16181f] px-2 py-1 rounded-lg border border-[#252831]">
                <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-xs" title="Future Frames Color" />
                <span className="text-neutral-400 text-[11px]">Next:</span>
                <input
                  type="range"
                  min="0"
                  max="3"
                  value={onionSkin.nextFrames}
                  onChange={e => updateOnionSkin({ nextFrames: Number(e.target.value) })}
                  className="w-14 accent-cyan-400 h-1 bg-neutral-700 rounded cursor-pointer"
                />
                <span className="font-mono text-[11px] text-cyan-400 font-semibold">{onionSkin.nextFrames}</span>
              </div>

              {/* Ghost Opacity */}
              <div className="flex items-center gap-1.5 bg-[#16181f] px-2 py-1 rounded-lg border border-[#252831]">
                <span className="text-neutral-400 text-[11px]">Ghost Opacity:</span>
                <input
                  type="range"
                  min="0.1"
                  max="0.8"
                  step="0.05"
                  value={onionSkin.opacity}
                  onChange={e => updateOnionSkin({ opacity: Number(e.target.value) })}
                  className="w-16 accent-neutral-300 h-1 bg-neutral-700 rounded cursor-pointer"
                />
                <span className="font-mono text-[11px] font-semibold">{Math.round(onionSkin.opacity * 100)}%</span>
              </div>
            </div>

            <button
              onClick={() => setShowOnionPopover(false)}
              className="text-neutral-500 hover:text-white px-2 py-1 rounded text-xs"
            >
              Done
            </button>
          </div>
        )}

        {/* Timeline Settings / FPS Popover */}
        {showSettings && (
          <div className="pt-2 border-t border-[#252831] flex items-center justify-between text-xs text-neutral-300 animate-in fade-in duration-100">
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 text-[11px]">Framerate (FPS):</span>
              <div className="flex gap-1">
                {FPS_PRESETS.map(f => (
                  <button
                    key={f}
                    onClick={() => setFps(f)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      fps === f
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40 font-bold'
                        : 'bg-[#15161b] text-neutral-400 border-[#262831] hover:text-white'
                    }`}
                  >
                    {f} fps
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setLoop(!loop)}
                className={`flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] border ${
                  loop
                    ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/50'
                    : 'bg-[#15161b] text-neutral-400 border-[#262831]'
                }`}
              >
                <Repeat className="w-3 h-3" />
                <span>{loop ? 'Looping' : 'Play Once'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
};
