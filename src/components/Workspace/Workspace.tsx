import { useCallback, useEffect, useRef, useState } from 'react';
import type { Project } from '@/types';
import { storage } from '@/services/storage';
import * as pm from '@/project-manager/projectManager';
import FileExplorer from './FileExplorer';
import EditorPane from '@/components/Editor/EditorPane';
import TerminalPanel from '@/components/Terminal/TerminalPanel';
import PreviewPanel from '@/components/Preview/PreviewPanel';
import GitHubPanel from '@/components/Community/GitHubPanel';
import CommunityHub from '@/components/Community/CommunityHub';
import './Workspace.css';

type MobileTab = 'files' | 'editor' | 'preview' | 'terminal';
type RightView = 'preview' | 'github' | 'community';

export default function Workspace({
  initialProject,
  onExit
}: {
  initialProject: Project;
  onExit: () => void;
}) {
  const [project, setProject] = useState<Project>(initialProject);
  const [mobileTab, setMobileTab] = useState<MobileTab>('editor');
  const [rightView, setRightView] = useState<RightView>('preview');
  const [previewNonce, setPreviewNonce] = useState(0);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const saveTimer = useRef<number | null>(null);

  // Auto-save with a short debounce whenever the project changes.
  useEffect(() => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      storage.saveProject(project);
    }, 400);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [project]);

  const updateProject = useCallback((updater: (p: Project) => Project) => {
    setProject((prev) => updater(prev));
  }, []);

  const handleFileContentChange = useCallback(
    (content: string) => {
      updateProject((p) => pm.updateFileContent(p, p.activeFilePath, content));
    },
    [updateProject]
  );

  const handleSelectFile = useCallback(
    (path: string) => {
      updateProject((p) => pm.setActiveFile(p, path));
      setMobileTab('editor');
    },
    [updateProject]
  );

  const runPreview = useCallback(() => {
    setPreviewNonce((n) => n + 1);
    setRightView('preview');
    setMobileTab('preview');
  }, []);

  const activeFile = pm.getFile(project, project.activeFilePath);

  return (
    <div className="workspace">
      <WorkspaceTopBar
        project={project}
        onExit={onExit}
        onRename={(name) => updateProject((p) => ({ ...p, name, updatedAt: Date.now() }))}
        rightView={rightView}
        onRightViewChange={setRightView}
      />

      <div className="workspace-body">
        <div className={`workspace-explorer ${mobileTab === 'files' ? 'mobile-visible' : ''}`}>
          <FileExplorer
            project={project}
            onSelectFile={handleSelectFile}
            onUpdateProject={updateProject}
            onCreateFile={(path) =>
              updateProject((p) => {
                try {
                  return pm.createFile(p, path);
                } catch (e) {
                  alert(e instanceof Error ? e.message : String(e));
                  return p;
                }
              })
            }
            onDeleteFile={(path) =>
              updateProject((p) => {
                try {
                  return pm.deleteFile(p, path);
                } catch (e) {
                  alert(e instanceof Error ? e.message : String(e));
                  return p;
                }
              })
            }
            onRenameFile={(oldPath, newPath) =>
              updateProject((p) => {
                try {
                  return pm.renameFile(p, oldPath, newPath);
                } catch (e) {
                  alert(e instanceof Error ? e.message : String(e));
                  return p;
                }
              })
            }
          />
        </div>

        <div className={`workspace-editor-col ${mobileTab === 'editor' ? 'mobile-visible' : ''}`}>
          <EditorPane file={activeFile} onChange={handleFileContentChange} />
        </div>

        <div className={`workspace-right-col ${mobileTab === 'preview' ? 'mobile-visible' : ''}`}>
          <div className="right-view-tabs">
            <button className={rightView === 'preview' ? 'active' : ''} onClick={() => setRightView('preview')}>
              Preview
            </button>
            <button className={rightView === 'github' ? 'active' : ''} onClick={() => setRightView('github')}>
              GitHub
            </button>
            <button className={rightView === 'community' ? 'active' : ''} onClick={() => setRightView('community')}>
              Community
            </button>
          </div>
          {rightView === 'preview' && <PreviewPanel project={project} refreshNonce={previewNonce} />}
          {rightView === 'github' && <GitHubPanel project={project} />}
          {rightView === 'community' && <CommunityHub />}
        </div>
      </div>

      <div className={`workspace-terminal-wrap ${mobileTab === 'terminal' ? 'mobile-visible' : ''} ${terminalOpen ? '' : 'collapsed'}`}>
        <TerminalPanel
          project={project}
          onUpdateProject={updateProject}
          onRunPreview={runPreview}
          onOpenProjectRequest={() => alert('Use "Back to Dashboard" to switch projects, or open a different one from Home.')}
          collapsed={!terminalOpen}
          onToggleCollapsed={() => setTerminalOpen((v) => !v)}
        />
      </div>

      <MobileTabBar active={mobileTab} onChange={setMobileTab} />
    </div>
  );
}

function WorkspaceTopBar({
  project,
  onExit,
  onRename,
  rightView,
  onRightViewChange
}: {
  project: Project;
  onExit: () => void;
  onRename: (name: string) => void;
  rightView: RightView;
  onRightViewChange: (v: RightView) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(project.name);

  useEffect(() => setDraftName(project.name), [project.name]);

  return (
    <div className="workspace-topbar">
      <button className="btn btn-ghost" onClick={onExit} title="Back to Dashboard">
        ← Home
      </button>
      {editingName ? (
        <input
          className="workspace-name-input"
          value={draftName}
          autoFocus
          onChange={(e) => setDraftName(e.target.value)}
          onBlur={() => {
            setEditingName(false);
            onRename(draftName.trim() || project.name);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
        />
      ) : (
        <button className="workspace-name" onClick={() => setEditingName(true)} title="Rename project">
          {project.name}
        </button>
      )}
      <span className="workspace-autosave-indicator">Autosaved</span>
      <div className="workspace-topbar-spacer" />
      <select
        className="workspace-view-select-mobile"
        value={rightView}
        onChange={(e) => onRightViewChange(e.target.value as RightView)}
        aria-label="Right panel view"
      >
        <option value="preview">Preview</option>
        <option value="github">GitHub</option>
        <option value="community">Community</option>
      </select>
    </div>
  );
}

function MobileTabBar({ active, onChange }: { active: MobileTab; onChange: (t: MobileTab) => void }) {
  const tabs: { id: MobileTab; label: string; icon: string }[] = [
    { id: 'files', label: 'Files', icon: '📁' },
    { id: 'editor', label: 'Editor', icon: '{ }' },
    { id: 'preview', label: 'Preview', icon: '▶' },
    { id: 'terminal', label: 'Terminal', icon: '>_' }
  ];
  return (
    <nav className="mobile-tab-bar">
      {tabs.map((t) => (
        <button key={t.id} className={active === t.id ? 'active' : ''} onClick={() => onChange(t.id)}>
          <span className="mobile-tab-icon">{t.icon}</span>
          <span className="mobile-tab-label">{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
