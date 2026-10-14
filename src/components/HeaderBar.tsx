import React, { useState } from 'react';
import {
  ChevronLeft,
  RotateCcw,
  RotateCw,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Cloud,
  CloudCheck,
  Download,
  Layers,
  Sparkles,
  Ruler,
  Share2,
  MoreVertical,
  LogIn,
  LogOut,
  Image as ImageIcon,
  Plus,
} from 'lucide-react';
import { useFlux } from '../context/FluxContext';

interface HeaderBarProps {
  onOpenNewModal: () => void;
  onOpenCloudModal: () => void;
  onOpenExportModal: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onOpenNewModal,
  onOpenCloudModal,
  onOpenExportModal,
}) => {
  const {
    project,
    currentFrame,
    updateProjectTitle,
    canUndo,
    canRedo,
    undo,
    redo,
    setCurrentView,
    onionSkin,
    updateOnionSkin,
    isRulerActive,
    setIsRulerActive,
    isInspectorOpen,
    setIsInspectorOpen,
    user,
    signIn,
    signOutUser,
    cloudSyncStatus,
    syncToCloudNow,
    accentColor,
    resetViewport,
    zoomIn,
    zoomOut,
    referenceImage,
    setReferenceImage,
  } = useFlux();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState(project.title);
  const [showMenu, setShowMenu] = useState(false);

  const handleTitleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (titleInput.trim()) {
      updateProjectTitle(titleInput.trim());
    }
    setIsEditingTitle(false);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleToggleReference = () => {
    if (!referenceImage) {
      // Trigger file picker for reference image
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            if (ev.target?.result) {
              setReferenceImage({
                url: ev.target.result as string,
                visible: true,
                opacity: 0.7,
                x: 60,
                y: 50,
                width: 280,
                height: 220,
                locked: false,
              });
            }
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      setReferenceImage({
        ...referenceImage,
        visible: !referenceImage.visible,
      });
    }
  };

  return (
    <header className="h-11 bg-[#16171b] border-b border-[#24262d] px-3 flex items-center justify-between text-xs select-none z-30 shrink-0">
      {/* Left: Back to Home + Brand + Project Title */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setCurrentView('home')}
          className="p-1.5 rounded-lg hover:bg-[#22242b] text-neutral-300 hover:text-white transition-colors flex items-center gap-1 font-medium group"
          title="Back to Home Projects"
        >
          <ChevronLeft className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
          <div
            className="w-5 h-5 rounded flex items-center justify-center font-mono font-bold text-[10px] text-white shadow-xs"
            style={{ backgroundColor: accentColor }}
          >
            FX
          </div>
          <span className="font-mono text-xs hidden sm:inline">Home</span>
        </button>

        <div className="h-4 w-[1px] bg-[#272930] mx-0.5" />

        {/* Title Editing */}
        {isEditingTitle ? (
          <form onSubmit={handleTitleSubmit}>
            <input
              type="text"
              value={titleInput}
              autoFocus
              onChange={e => setTitleInput(e.target.value)}
              onBlur={handleTitleSubmit}
              className="bg-[#202228] text-neutral-200 px-2 py-0.5 rounded border border-cyan-500/50 outline-none w-44 text-xs font-medium"
            />
          </form>
        ) : (
          <div
            onClick={() => {
              setTitleInput(project.title);
              setIsEditingTitle(true);
            }}
            title="Click to rename project"
            className="flex items-center gap-2 px-2 py-0.5 rounded hover:bg-[#202228] cursor-pointer text-neutral-200 font-medium transition-colors"
          >
            <span className="truncate max-w-[140px] text-xs font-semibold">{project.title}</span>
            <span className="text-[10px] text-neutral-500 font-mono hidden md:inline">
              {project.width}×{project.height}
            </span>
          </div>
        )}
      </div>

      {/* Center: FlipaClip Quick Action Capsule */}
      <div className="flex items-center gap-1 bg-[#121316] px-1.5 py-0.5 rounded-full border border-[#24262d]">
        {/* Ruler / Straight Line Guide Toggle */}
        <button
          onClick={() => setIsRulerActive(!isRulerActive)}
          className={`p-1.5 rounded-full transition-colors ${
            isRulerActive
              ? 'text-cyan-400 bg-cyan-950/40 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1f2127]'
          }`}
          title="Toggle Straight Line Ruler"
        >
          <Ruler className="w-3.5 h-3.5" />
        </button>

        {/* Onion Skin toggle */}
        <button
          onClick={() => updateOnionSkin({ enabled: !onionSkin.enabled })}
          className={`p-1.5 rounded-full transition-colors ${
            onionSkin.enabled
              ? 'text-amber-400 bg-amber-950/40 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1f2127]'
          }`}
          title="Toggle Onion Skinning"
        >
          <Sparkles className="w-3.5 h-3.5" />
        </button>

        {/* Reference Image Quick Toggle / Add */}
        <button
          onClick={handleToggleReference}
          className={`p-1.5 rounded-full transition-colors ${
            referenceImage && referenceImage.visible
              ? 'text-cyan-400 bg-cyan-950/40 shadow-xs'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-[#1f2127]'
          }`}
          title={referenceImage ? (referenceImage.visible ? 'Hide Reference Image' : 'Show Reference Image') : 'Add Reference Image to Canvas'}
        >
          <ImageIcon className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-[1px] bg-[#272930] mx-0.5" />

        {/* Undo & Redo */}
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`p-1.5 rounded-full transition-colors ${
            canUndo ? 'text-neutral-300 hover:text-white hover:bg-[#1f2127]' : 'text-neutral-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`p-1.5 rounded-full transition-colors ${
            canRedo ? 'text-neutral-300 hover:text-white hover:bg-[#1f2127]' : 'text-neutral-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <RotateCw className="w-3.5 h-3.5" />
        </button>

        <div className="h-3 w-[1px] bg-[#272930] mx-0.5" />

        {/* Zoom Controls */}
        <button
          onClick={zoomOut}
          className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-200 hover:bg-[#1f2127]"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={zoomIn}
          className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-200 hover:bg-[#1f2127]"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={resetViewport}
          className="p-1.5 rounded-full text-neutral-400 hover:text-neutral-200 hover:bg-[#1f2127]"
          title="Reset Zoom (Fit Canvas)"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right: Cloud Sync, Layers Panel Toggle, Export, and Profile */}
      <div className="flex items-center gap-2">
        {/* Cloud Sync Button */}
        <button
          onClick={syncToCloudNow}
          disabled={cloudSyncStatus === 'saving'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] transition-colors ${
            cloudSyncStatus === 'synced'
              ? 'bg-emerald-950/30 text-emerald-400 border-emerald-800/50'
              : cloudSyncStatus === 'saving'
              ? 'bg-amber-950/30 text-amber-400 border-amber-800/50 animate-pulse'
              : 'bg-[#181a1f] text-neutral-400 border-[#272930] hover:text-white'
          }`}
          title={user ? 'Sync to Firebase Cloud' : 'Connect Cloud Backup'}
        >
          {cloudSyncStatus === 'saving' ? (
            <Cloud className="w-3.5 h-3.5 animate-spin" />
          ) : cloudSyncStatus === 'synced' ? (
            <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <Cloud className="w-3.5 h-3.5" />
          )}
          <span className="hidden sm:inline">
            {cloudSyncStatus === 'saving' ? 'Syncing' : cloudSyncStatus === 'synced' ? 'Synced' : 'Cloud'}
          </span>
        </button>

        {/* Layers Stack Toggle Button */}
        <button
          onClick={() => setIsInspectorOpen(!isInspectorOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-colors ${
            isInspectorOpen
              ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
              : 'bg-[#181a1f] text-neutral-300 border-[#272930] hover:bg-[#202229]'
          }`}
          title="Layers Stack & Inspector"
        >
          <Layers className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Layers</span>
          <span className="px-1 py-0.2 rounded bg-[#252832] text-[10px] font-mono text-neutral-400">
            {currentFrame?.layers.length || 1}
          </span>
        </button>

        {/* Export / Share Button */}
        <button
          onClick={onOpenExportModal}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-white font-medium text-xs shadow-md transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: accentColor }}
          title="Export GIF or Sprite Sheet"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Export</span>
        </button>

        {/* Overflow Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded-lg hover:bg-[#202228] text-neutral-400 hover:text-white"
            title="Studio Menu"
          >
            <MoreVertical className="w-4 h-4" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-9 w-48 bg-[#181a20] border border-[#292c36] rounded-xl shadow-2xl py-1 text-xs text-neutral-300 z-50 select-none animate-in fade-in zoom-in-95 duration-100"
              onClick={() => setShowMenu(false)}
            >
              <button
                onClick={onOpenNewModal}
                className="w-full text-left px-3 py-2 hover:bg-[#20232a] flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
                <span>New Project...</span>
              </button>
              <button
                onClick={onOpenCloudModal}
                className="w-full text-left px-3 py-2 hover:bg-[#20232a] flex items-center gap-2"
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                <span>Open from Cloud</span>
              </button>
              <button
                onClick={toggleFullscreen}
                className="w-full text-left px-3 py-2 hover:bg-[#20232a] flex items-center gap-2"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Toggle Fullscreen</span>
              </button>
              <div className="h-[1px] bg-[#24262d] my-1" />
              {user ? (
                <button
                  onClick={signOutUser}
                  className="w-full text-left px-3 py-2 hover:bg-[#20232a] text-neutral-400 hover:text-white flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  onClick={signIn}
                  className="w-full text-left px-3 py-2 hover:bg-[#20232a] text-cyan-400 flex items-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
