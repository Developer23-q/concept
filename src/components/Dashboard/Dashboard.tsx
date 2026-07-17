import { useEffect, useRef, useState } from 'react';
import type { Project, TemplateId } from '@/types';
import { storage } from '@/services/storage';
import { createProject } from '@/project-manager/projectManager';
import { TEMPLATES } from '@/project-manager/templates';
import { importProjectFromZip } from '@/services/importService';
import NewProjectModal from './NewProjectModal';
import './Dashboard.css';

export default function Dashboard({ onOpenProject }: { onOpenProject: (id: string) => void }) {
  const [recents, setRecents] = useState<Project[]>([]);
  const [showNewModal, setShowNewModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    refreshRecents();
  }, []);

  async function refreshRecents() {
    const list = await storage.listRecent(8);
    setRecents(list);
  }

  async function handleCreate(name: string, templateId: TemplateId) {
    const project = createProject(name, templateId);
    await storage.saveProject(project);
    setShowNewModal(false);
    onOpenProject(project.id);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm('Delete this project? This can\'t be undone.')) return;
    await storage.deleteProject(id);
    refreshRecents();
  }

  async function handleImportClick() {
    fileInputRef.current?.click();
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    try {
      const project = await importProjectFromZip(file);
      await storage.saveProject(project);
      onOpenProject(project.id);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-hero">
        <div className="dashboard-hero-mark">{'</>'}</div>
        <h1>Concept</h1>
        <p className="dashboard-tagline">
          Turn AI-generated HTML, CSS, and JavaScript into a real, installable app.
          No Android Studio. No Gradle. No SDK setup.
        </p>
        <div className="dashboard-hero-actions">
          <button className="btn btn-primary btn-lg" onClick={() => setShowNewModal(true)}>
            + New project
          </button>
          <button className="btn btn-lg" onClick={handleImportClick} disabled={importing}>
            {importing ? 'Importing…' : '⇧ Import folder / .zip / .concept'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.concept"
            hidden
            onChange={handleFileSelected}
          />
        </div>
        {importError && <p className="dashboard-import-error">{importError}</p>}
      </header>

      <section className="dashboard-section">
        <h2>Recent projects</h2>
        {recents.length === 0 ? (
          <div className="dashboard-empty card">
            <p>No projects yet. Create one to see it here.</p>
          </div>
        ) : (
          <div className="project-grid">
            {recents.map((p) => (
              <button key={p.id} className="project-card card" onClick={() => onOpenProject(p.id)}>
                <div className="project-card-icon">{'</>'}</div>
                <div className="project-card-body">
                  <span className="project-card-name">{p.name}</span>
                  <span className="project-card-meta">
                    {p.files.length} files · updated {timeAgo(p.updatedAt)}
                  </span>
                </div>
                <button
                  className="btn btn-ghost btn-danger project-card-delete"
                  onClick={(e) => handleDelete(p.id, e)}
                  aria-label={`Delete ${p.name}`}
                  title="Delete project"
                >
                  ✕
                </button>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="dashboard-section">
        <h2>Start from a template</h2>
        <div className="template-grid">
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              className="template-card card"
              onClick={() => handleCreate(t.name, t.id)}
            >
              <span className="template-card-name">{t.name}</span>
              <span className="template-card-desc">{t.description}</span>
            </button>
          ))}
        </div>
      </section>

      {showNewModal && (
        <NewProjectModal onCreate={handleCreate} onClose={() => setShowNewModal(false)} />
      )}
    </div>
  );
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
