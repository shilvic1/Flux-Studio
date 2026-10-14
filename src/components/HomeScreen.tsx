import React, { useEffect, useState } from 'react';
import {
  Plus,
  FolderOpen,
  Film,
  Sparkles,
  Trash2,
  Copy,
  Clock,
  Cloud,
  CloudCheck,
  LogIn,
  LogOut,
  Play,
  Upload,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useFlux } from '../context/FluxContext';
import { Project } from '../types/flux';
import { getAllLocalProjects, deleteProjectLocally, saveProjectLocally } from '../utils/storage';
import { createBouncingBallSample } from '../utils/sampleProjects';
import { formatDuplicateTitle } from '../utils/naming';

interface HomeScreenProps {
  onOpenNewModal: () => void;
  onOpenCloudModal: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({ onOpenNewModal, onOpenCloudModal }) => {
  const {
    loadProject,
    createNewProject,
    user,
    signIn,
    signOutUser,
    cloudSyncStatus,
    accentColor,
  } = useFlux();

  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLocalProjects = async () => {
    setIsLoading(true);
    try {
      const list = await getAllLocalProjects();
      setLocalProjects(list);
    } catch (err) {
      console.warn('Failed to fetch local projects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocalProjects();
  }, []);

  const handleOpenProject = (proj: Project) => {
    loadProject(proj);
  };

  const handleDuplicateProject = async (proj: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    const existingTitles = localProjects.map(p => p.title);
    const newTitle = formatDuplicateTitle(proj.title, existingTitles);

    const duplicated: Project = {
      ...proj,
      id: 'proj_' + Math.random().toString(36).substring(2, 9),
      title: newTitle,
      updatedAt: Date.now(),
    };
    await saveProjectLocally(duplicated);
    fetchLocalProjects();
  };

  const handleDeleteProject = async (projId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this project from your device?')) {
      await deleteProjectLocally(projId);
      setLocalProjects(prev => prev.filter(p => p.id !== projId));
    }
  };

  const handleOpenSample = () => {
    const sample = createBouncingBallSample();
    saveProjectLocally(sample).then(() => {
      loadProject(sample);
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const projData = parsed.project || parsed;
        if (projData && projData.frames) {
          saveProjectLocally(projData).then(() => {
            loadProject(projData);
          });
        } else {
          alert('Invalid .fluxproject format.');
        }
      } catch (err) {
        alert('Could not parse project file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex-1 h-full w-full bg-[#121316] overflow-y-auto select-none flex flex-col text-neutral-200">
      {/* Top Studio Navbar */}
      <header className="h-14 border-b border-[#212329] bg-[#16171a] px-6 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-white text-sm shadow-md"
            style={{ backgroundColor: accentColor }}
          >
            FX
          </div>
          <div>
            <h1 className="font-semibold text-sm tracking-wide text-white uppercase font-mono flex items-center gap-2">
              FLUX <span className="font-light text-neutral-400">STUDIO</span>
            </h1>
            <span className="text-[10px] text-neutral-500 font-mono tracking-tight block -mt-0.5">
              2D DIGITAL ART & ANIMATION
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Cloud Status / Google Account */}
          {user ? (
            <div className="flex items-center gap-2 bg-[#1b1c22] border border-[#272932] pl-2 pr-3 py-1 rounded-full text-xs">
              {user.photoURL ? (
                <img src={user.photoURL} alt="Avatar" className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <div
                  className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-bold"
                  style={{ backgroundColor: accentColor }}
                >
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <span className="text-neutral-300 font-medium max-w-[100px] truncate text-xs">
                {user.displayName?.split(' ')[0] || 'Artist'}
              </span>
              <button
                onClick={signOutUser}
                className="text-neutral-500 hover:text-neutral-200 ml-1"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={signIn}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1b1c22] hover:bg-[#23252d] border border-[#272932] text-neutral-300 hover:text-white text-xs font-medium transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-neutral-400" />
              <span>Connect Cloud</span>
            </button>
          )}

          <button
            onClick={onOpenCloudModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e2026] hover:bg-[#252830] border border-[#2b2e38] text-neutral-300 hover:text-white text-xs font-medium transition-colors"
            title="Browse Cloud Animations"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cloud Projects</span>
          </button>

          <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e2026] hover:bg-[#252830] border border-[#2b2e38] text-neutral-300 hover:text-white text-xs font-medium transition-colors cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-neutral-400" />
            <span>Import</span>
            <input type="file" accept=".fluxproject,.json" onChange={handleImportFile} className="hidden" />
          </label>

          <button
            onClick={onOpenNewModal}
            className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white font-medium text-xs shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
            style={{ backgroundColor: accentColor }}
          >
            <Plus className="w-4 h-4" />
            <span>New Animation</span>
          </button>
        </div>
      </header>

      {/* Main Home Content */}
      <div className="max-w-6xl w-full mx-auto px-6 py-8 space-y-8 flex-1">
        {/* Hero Banner with Quick Presets */}
        <div className="bg-gradient-to-r from-[#181a20] via-[#16181d] to-[#14151a] border border-[#262832] rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="max-w-xl space-y-2 z-10 relative">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[11px] font-mono">
              <Sparkles className="w-3 h-3" />
              <span>READY TO ANIMATE</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Create smooth, frame-by-frame 2D animation
            </h2>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Real digital painting, onion skinning, layer compositing, and instant exports to Animated GIF and Sprite Sheets.
            </p>

            <div className="pt-2 flex flex-wrap gap-2.5">
              <button
                onClick={() => createNewProject(800, 600, 12, 'Untitled Animation')}
                className="px-3.5 py-2 rounded-lg bg-[#21242d] hover:bg-[#282b36] border border-[#2e313c] text-white text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-400" />
                <span>Standard (800×600)</span>
              </button>
              <button
                onClick={() => createNewProject(1920, 1080, 24, '1080p Cinema Animation')}
                className="px-3.5 py-2 rounded-lg bg-[#21242d] hover:bg-[#282b36] border border-[#2e313c] text-white text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <Film className="w-3.5 h-3.5 text-cyan-400" />
                <span>1080p HD (24 fps)</span>
              </button>
              <button
                onClick={() => createNewProject(800, 800, 12, 'Square Animation')}
                className="px-3.5 py-2 rounded-lg bg-[#21242d] hover:bg-[#282b36] border border-[#2e313c] text-white text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>Square (800×800)</span>
              </button>
              <button
                onClick={handleOpenSample}
                className="px-3.5 py-2 rounded-lg bg-cyan-950/30 hover:bg-cyan-950/50 border border-cyan-700/40 text-cyan-300 text-xs font-medium flex items-center gap-2 transition-colors"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open Sample: Bouncing Ball</span>
              </button>
            </div>
          </div>
        </div>

        {/* Recent Projects Gallery */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#212329]">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-neutral-400" />
              <h3 className="font-semibold text-sm text-white">Your Animations</h3>
              <span className="text-xs text-neutral-500 font-mono">({localProjects.length})</span>
            </div>
            <button
              onClick={onOpenNewModal}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
            >
              <span>+ Create New</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-xs text-neutral-500">Loading projects...</div>
          ) : localProjects.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-[#15161a] border border-[#22242c] rounded-2xl p-8">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-white"
                style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
              >
                <Film className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-white text-sm">No saved animations yet</h4>
                <p className="text-neutral-400 text-xs max-w-sm mx-auto">
                  Start fresh with a new project or explore the interactive bouncing ball template.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <button
                  onClick={handleOpenSample}
                  className="px-4 py-2 rounded-lg text-white font-medium text-xs flex items-center gap-2 transition-transform hover:scale-105"
                  style={{ backgroundColor: accentColor }}
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Try Bouncing Ball Sample</span>
                </button>
                <button
                  onClick={onOpenNewModal}
                  className="px-4 py-2 rounded-lg bg-[#22242d] hover:bg-[#282a35] border border-[#2e313d] text-neutral-200 font-medium text-xs"
                >
                  Create Custom Canvas
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {localProjects.map(proj => {
                // Find thumbnail if present or default
                const firstLayer = proj.frames?.[0]?.layers?.find(l => l.dataUrl);
                const thumbUrl = firstLayer?.dataUrl;

                return (
                  <div
                    key={proj.id}
                    onClick={() => handleOpenProject(proj)}
                    className="group bg-[#16171b] hover:bg-[#1c1d22] border border-[#24262e] hover:border-cyan-500/50 rounded-xl p-3 cursor-pointer transition-all shadow-md flex flex-col justify-between space-y-2 relative"
                  >
                    {/* Thumbnail Preview */}
                    <div className="w-full h-36 bg-[#0e0f12] rounded-lg border border-[#1e2025] overflow-hidden flex items-center justify-center relative group-hover:scale-[1.01] transition-transform">
                      {thumbUrl ? (
                        <img src={thumbUrl} alt={proj.title} className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-neutral-600 space-y-1">
                          <Film className="w-8 h-8" />
                          <span className="text-[10px] font-mono text-neutral-600">{proj.frames?.length || 1} Frames</span>
                        </div>
                      )}

                      {/* Dimensions pill */}
                      <div className="absolute bottom-1.5 right-1.5 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-[10px] font-mono text-neutral-300">
                        {proj.width}×{proj.height}
                      </div>
                    </div>

                    {/* Metadata & Actions */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold text-xs text-white truncate max-w-[160px] group-hover:text-cyan-400 transition-colors">
                          {proj.title}
                        </h4>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={e => handleDuplicateProject(proj, e)}
                            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-[#252830]"
                            title="Duplicate"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            onClick={e => handleDeleteProject(proj.id, e)}
                            className="p-1 rounded text-neutral-400 hover:text-rose-400 hover:bg-[#252830]"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono mt-1">
                        <span>{proj.frames?.length || 1} frames · {proj.fps || 12} fps</span>
                        <span>{new Date(proj.updatedAt || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
