import { useCallback, useEffect, useState } from 'react';
import type { Project } from '@/types';
import { storage } from '@/services/storage';
import Dashboard from '@/components/Dashboard/Dashboard';
import Workspace from '@/components/Workspace/Workspace';
import InstallPrompt from '@/components/common/InstallPrompt';
import './App.css';

type View = { screen: 'dashboard' } | { screen: 'workspace'; projectId: string };

export default function App() {
  const [view, setView] = useState<View>({ screen: 'dashboard' });
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    // Nothing to await on boot right now, but this is the seam for
    // "restore last session" if we want it later.
    setBooting(false);
  }, []);

  const openProject = useCallback((projectId: string) => {
    setView({ screen: 'workspace', projectId });
  }, []);

  const goHome = useCallback(() => {
    setView({ screen: 'dashboard' });
  }, []);

  if (booting) return null;

  return (
    <div className="app-root">
      {view.screen === 'dashboard' && <Dashboard onOpenProject={openProject} />}
      {view.screen === 'workspace' && (
        <WorkspaceLoader projectId={view.projectId} onExit={goHome} />
      )}
      <InstallPrompt />
    </div>
  );
}

function WorkspaceLoader({ projectId, onExit }: { projectId: string; onExit: () => void }) {
  const [project, setProject] = useState<Project | null | 'not-found'>(null);

  useEffect(() => {
    let cancelled = false;
    storage.getProject(projectId).then((p) => {
      if (!cancelled) setProject(p ?? 'not-found');
    });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (project === null) {
    return <div className="loading-screen">Loading project…</div>;
  }
  if (project === 'not-found') {
    return (
      <div className="loading-screen">
        <p>That project couldn't be found.</p>
        <button className="btn btn-primary" onClick={onExit}>Back to Dashboard</button>
      </div>
    );
  }
  return <Workspace initialProject={project} onExit={onExit} />;
}
