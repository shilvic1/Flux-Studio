/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { FluxProvider, useFlux } from './context/FluxContext';
import { HomeScreen } from './components/HomeScreen';
import { HeaderBar } from './components/HeaderBar';
import { ToolBar } from './components/ToolBar';
import { CanvasArea } from './components/CanvasArea';
import { InspectorPanel } from './components/InspectorPanel';
import { AnimationTimeline } from './components/AnimationTimeline';
import { ExportModal } from './components/ExportModal';
import { CloudProjectsModal } from './components/CloudProjectsModal';
import { NewProjectModal } from './components/NewProjectModal';

function StudioRouter() {
  const { currentView } = useFlux();
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#121316] text-[#e0e2e8] select-none font-sans flex flex-col">
      {currentView === 'home' ? (
        /* HOME SCREEN: Project gallery, presets, and cloud integration */
        <HomeScreen
          onOpenNewModal={() => setIsNewModalOpen(true)}
          onOpenCloudModal={() => setIsCloudModalOpen(true)}
        />
      ) : (
        /* STUDIO EDITOR: Distraction-free creative animation workspace */
        <div className="flex flex-col h-full w-full overflow-hidden relative">
          {/* Top Header Navigation */}
          <HeaderBar
            onOpenNewModal={() => setIsNewModalOpen(true)}
            onOpenCloudModal={() => setIsCloudModalOpen(true)}
            onOpenExportModal={() => setIsExportModalOpen(true)}
          />

          {/* Full-bleed Canvas Viewport with floating Tool Capsule & Inspector Drawer */}
          <div className="flex-1 flex overflow-hidden relative">
            <ToolBar />
            <CanvasArea />
            <InspectorPanel />
          </div>

          {/* Floating Bottom Animation Dock */}
          <AnimationTimeline />
        </div>
      )}

      {/* Global Dialog Modals */}
      <NewProjectModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
      />

      <CloudProjectsModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FluxProvider>
      <StudioRouter />
    </FluxProvider>
  );
}
