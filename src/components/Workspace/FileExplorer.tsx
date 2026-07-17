import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Project } from '@/types';
import { uploadAssets, setAppIcon } from '@/services/assetUploadService';
import './FileExplorer.css';

const ICONS: Record<string, string> = {
  html: '◈',
  css: '◆',
  js: '◇',
  json: '{}',
  image: '▧',
  text: '▫'
};

interface TreeNode {
  name: string;
  path: string;
  isFolder: boolean;
  children: TreeNode[];
}

function buildTree(paths: string[]): TreeNode {
  const root: TreeNode = { name: '', path: '', isFolder: true, children: [] };
  for (const path of paths) {
    const parts = path.split('/');
    let current = root;
    let accPath = '';
    parts.forEach((part, i) => {
      accPath = accPath ? `${accPath}/${part}` : part;
      const isLast = i === parts.length - 1;
      let child = current.children.find((c) => c.name === part);
      if (!child) {
        child = { name: part, path: accPath, isFolder: !isLast, children: [] };
        current.children.push(child);
      }
      current = child;
    });
  }
  return root;
}

export default function FileExplorer({
  project,
  onSelectFile,
  onCreateFile,
  onDeleteFile,
  onRenameFile,
  onUpdateProject
}: {
  project: Project;
  onSelectFile: (path: string) => void;
  onCreateFile: (path: string) => void;
  onDeleteFile: (path: string) => void;
  onRenameFile: (oldPath: string, newPath: string) => void;
  onUpdateProject: (updater: (p: Project) => Project) => void;
}) {
  const [creating, setCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [uploading, setUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const tree = buildTree(project.files.map((f) => f.path));

  function submitCreate() {
    const name = newFileName.trim();
    if (name) onCreateFile(name);
    setNewFileName('');
    setCreating(false);
  }

  function submitRename(oldPath: string) {
    const name = renameValue.trim();
    if (name && name !== oldPath) onRenameFile(oldPath, name);
    setRenaming(null);
  }

  async function handleUploadSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const result = await uploadAssets(project, files);
      onUpdateProject(() => result.project);
      if (result.addedPaths.length === 1) onSelectFile(result.addedPaths[0]);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleSetAsIcon(path: string) {
    onUpdateProject((p) => setAppIcon(p, path));
    alert(`Set "${path}" as the app icon in manifest.json.`);
  }

  function renderNode(node: TreeNode, depth: number): ReactNode {
    if (node.path === '') {
      return node.children.map((c) => renderNode(c, depth));
    }
    if (node.isFolder) {
      return (
        <div key={node.path} className="explorer-folder">
          <div className="explorer-row explorer-folder-row" style={{ paddingLeft: 8 + depth * 14 }}>
            <span className="explorer-icon">▸</span>
            <span className="explorer-label">{node.name}</span>
          </div>
          {node.children.map((c) => renderNode(c, depth + 1))}
        </div>
      );
    }

    const file = project.files.find((f) => f.path === node.path);
    const isActive = project.activeFilePath === node.path;
    const isRenaming = renaming === node.path;

    return (
      <div
        key={node.path}
        className={`explorer-row explorer-file-row ${isActive ? 'active' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => !isRenaming && onSelectFile(node.path)}
      >
        <span className="explorer-icon">{file ? ICONS[file.kind] ?? '▫' : '▫'}</span>
        {isRenaming ? (
          <input
            className="explorer-rename-input"
            autoFocus
            value={renameValue}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={() => submitRename(node.path)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitRename(node.path);
              if (e.key === 'Escape') setRenaming(null);
            }}
          />
        ) : (
          <span className="explorer-label">{node.name}</span>
        )}
        <span className="explorer-row-actions">
          {file?.kind === 'image' && (
            <button
              className="explorer-action-btn"
              title="Set as app icon"
              onClick={(e) => {
                e.stopPropagation();
                handleSetAsIcon(node.path);
              }}
            >
              ◎
            </button>
          )}
          <button
            className="explorer-action-btn"
            title="Rename"
            onClick={(e) => {
              e.stopPropagation();
              setRenaming(node.path);
              setRenameValue(node.path);
            }}
          >
            ✎
          </button>
          <button
            className="explorer-action-btn"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Delete "${node.path}"?`)) onDeleteFile(node.path);
            }}
          >
            ✕
          </button>
        </span>
      </div>
    );
  }

  return (
    <div className="file-explorer">
      <div className="explorer-header">
        <span>Explorer</span>
        <span className="explorer-header-actions">
          <button
            className="btn btn-ghost explorer-new-btn"
            onClick={() => uploadInputRef.current?.click()}
            title="Upload logo / image"
            disabled={uploading}
          >
            {uploading ? '⏳' : '⇧'}
          </button>
          <button className="btn btn-ghost explorer-new-btn" onClick={() => setCreating(true)} title="New file">
            +
          </button>
        </span>
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleUploadSelected}
        />
      </div>
      <div className="explorer-tree">
        {renderNode(tree, 0)}
        {creating && (
          <div className="explorer-row" style={{ paddingLeft: 8 }}>
            <span className="explorer-icon">▫</span>
            <input
              className="explorer-rename-input"
              autoFocus
              placeholder="file-name.js"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={submitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitCreate();
                if (e.key === 'Escape') setCreating(false);
              }}
            />
          </div>
        )}
      </div>
      <div className="explorer-footer-hint">
        Upload a logo or image — it's added to <code>assets/</code> and can be set as your app icon.
      </div>
    </div>
  );
}
