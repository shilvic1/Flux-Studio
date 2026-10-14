import React, { useEffect, useState } from 'react';
import {
  X,
  Cloud,
  FolderOpen,
  Trash2,
  Clock,
  LogIn,
  Layers,
  Film,
  Plus,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useFlux } from '../context/FluxContext';
import { ProjectMetadata } from '../types/flux';
import { listUserCloudProjects, deleteProjectFromCloud } from '../firebase/syncService';

interface CloudProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CloudProjectsModal: React.FC<CloudProjectsModalProps> = ({ isOpen, onClose }) => {
  const { user, signIn, loadCloudProject, syncToCloudNow, cloudSyncStatus } = useFlux();

  const [projects, setProjects] = useState<ProjectMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const list = await listUserCloudProjects();
      setProjects(list);
    } catch (err) {
      console.error('Error listing cloud projects:', err);
      setError('Could not fetch cloud projects. Check connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && user) {
      fetchProjects();
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleOpenProject = async (id: string) => {
    try {
      await loadCloudProject(id);
      onClose();
    } catch (err) {
      alert('Failed to load project from Cloud');
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Permanently delete this project from your cloud storage?')) {
      try {
        await deleteProjectFromCloud(id);
        setProjects(p => p.filter(item => item.id !== id));
      } catch (err) {
        alert('Failed to delete cloud project');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-[#18191e] border border-[#2c2f38] rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] text-neutral-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#26282f] flex items-center justify-between bg-[#141518]">
          <div className="flex items-center gap-2">
            <Cloud className="w-4 h-4 text-emerald-400" />
            <h2 className="font-semibold text-sm">Cloud Synced Animations</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          {!user ? (
            <div className="text-center py-12 px-6 space-y-4 bg-[#141518] rounded-xl border border-[#26282f]">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <Cloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Google Cloud Authentication Required</h3>
                <p className="text-neutral-400 text-xs max-w-sm mx-auto">
                  Sign in with Google to enable automatic cloud backups, project synchronization, and cross-device access to all your animations.
                </p>
              </div>
              <button
                onClick={signIn}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center gap-2 mx-auto transition-colors shadow"
              >
                <LogIn className="w-4 h-4" />
                <span>Sign In with Google</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* User banner & Quick Save current project */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#141518] border border-[#25272e]">
                <div className="flex items-center gap-2.5">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="Avatar" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                      {user.displayName?.[0] || 'U'}
                    </div>
                  )}
                  <div>
                    <span className="font-medium text-xs text-white block">{user.displayName || 'Artist'}</span>
                    <span className="text-[10px] text-neutral-500 font-mono">{user.email}</span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    await syncToCloudNow();
                    fetchProjects();
                  }}
                  disabled={cloudSyncStatus === 'saving'}
                  className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Backup Current Project</span>
                </button>
              </div>

              {/* Projects Grid */}
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                  <span className="text-xs">Loading projects from Firebase...</span>
                </div>
              ) : error ? (
                <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-lg text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-12 text-neutral-500 text-xs space-y-1">
                  <p>No projects saved to Cloud yet.</p>
                  <p className="text-neutral-400">Click &quot;Backup Current Project&quot; above to save your first animation.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {projects.map(proj => (
                    <div
                      key={proj.id}
                      onClick={() => handleOpenProject(proj.id)}
                      className="group bg-[#141518] hover:bg-[#1a1d24] border border-[#25272e] hover:border-emerald-500/50 rounded-lg p-2.5 cursor-pointer transition-all flex flex-col justify-between space-y-2 relative"
                    >
                      {/* Thumbnail */}
                      <div className="w-full h-28 bg-[#0e0f12] rounded border border-[#1e2025] overflow-hidden flex items-center justify-center relative">
                        {proj.thumbnail ? (
                          <img
                            src={proj.thumbnail}
                            alt={proj.title}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <Film className="w-8 h-8 text-neutral-600" />
                        )}

                        <div className="absolute bottom-1 right-1 bg-black/70 px-1 rounded text-[9px] font-mono text-neutral-300">
                          {proj.width}×{proj.height}
                        </div>
                      </div>

                      {/* Project Details */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-xs text-white truncate max-w-[170px]">
                            {proj.title}
                          </h4>
                          <button
                            onClick={e => handleDeleteProject(proj.id, e)}
                            className="text-neutral-500 hover:text-rose-400 p-1 rounded hover:bg-black/40"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="flex items-center gap-3 text-[10px] text-neutral-400 font-mono mt-1">
                          <span className="flex items-center gap-1">
                            <Film className="w-3 h-3 text-neutral-500" />
                            {proj.frameCount} frames
                          </span>
                          <span>{proj.fps} fps</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
