import type { FileKind, Project, ProjectFile, TemplateId } from '@/types';
import { getTemplate } from './templates';

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function detectKind(path: string): FileKind {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'html' || ext === 'htm') return 'html';
  if (ext === 'css') return 'css';
  if (ext === 'js') return 'js';
  if (ext === 'json') return 'json';
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) return 'image';
  return 'text';
}

export function createProject(name: string, templateId: TemplateId = 'blank'): Project {
  const template = getTemplate(templateId);
  const now = Date.now();
  const files: ProjectFile[] = template.files.map((f) => ({
    ...f,
    id: uid(),
    updatedAt: now
  }));
  return {
    id: uid(),
    name: name.trim() || 'Untitled Project',
    createdAt: now,
    updatedAt: now,
    files,
    activeFilePath: 'index.html'
  };
}

export function touch(project: Project): Project {
  return { ...project, updatedAt: Date.now() };
}

export function updateFileContent(project: Project, path: string, content: string): Project {
  const files = project.files.map((f) => (f.path === path ? { ...f, content, updatedAt: Date.now() } : f));
  return touch({ ...project, files });
}

export function createFile(project: Project, path: string, content = ''): Project {
  if (project.files.some((f) => f.path === path)) {
    throw new Error(`A file named "${path}" already exists.`);
  }
  const file: ProjectFile = {
    id: uid(),
    path,
    kind: detectKind(path),
    content,
    updatedAt: Date.now()
  };
  return touch({ ...project, files: [...project.files, file], activeFilePath: path });
}

/**
 * Creates a file at `path`, or overwrites it in place if one already exists.
 * Used for uploads (e.g. a logo re-uploaded to replace the old one) where
 * silently replacing is friendlier than making the user delete-then-add.
 */
export function upsertFile(project: Project, path: string, content: string): Project {
  const existing = project.files.find((f) => f.path === path);
  if (existing) {
    const files = project.files.map((f) => (f.path === path ? { ...f, content, updatedAt: Date.now() } : f));
    return touch({ ...project, files });
  }
  const file: ProjectFile = {
    id: uid(),
    path,
    kind: detectKind(path),
    content,
    updatedAt: Date.now()
  };
  return touch({ ...project, files: [...project.files, file] });
}

/** Returns `path` unchanged if free, otherwise `name-1.ext`, `name-2.ext`, etc. */
export function uniqueAssetPath(project: Project, path: string): string {
  if (!project.files.some((f) => f.path === path)) return path;
  const lastDot = path.lastIndexOf('.');
  const base = lastDot === -1 ? path : path.slice(0, lastDot);
  const ext = lastDot === -1 ? '' : path.slice(lastDot);
  let i = 1;
  let candidate = `${base}-${i}${ext}`;
  while (project.files.some((f) => f.path === candidate)) {
    i += 1;
    candidate = `${base}-${i}${ext}`;
  }
  return candidate;
}

export function deleteFile(project: Project, path: string): Project {
  const protectedFiles = ['index.html', 'style.css', 'script.js'];
  if (protectedFiles.includes(path)) {
    throw new Error(`"${path}" is a core file and can't be deleted. You can still clear its contents.`);
  }
  const files = project.files.filter((f) => f.path !== path);
  const activeFilePath = project.activeFilePath === path ? 'index.html' : project.activeFilePath;
  return touch({ ...project, files, activeFilePath });
}

export function renameFile(project: Project, oldPath: string, newPath: string): Project {
  if (project.files.some((f) => f.path === newPath)) {
    throw new Error(`A file named "${newPath}" already exists.`);
  }
  const files = project.files.map((f) =>
    f.path === oldPath ? { ...f, path: newPath, kind: detectKind(newPath), updatedAt: Date.now() } : f
  );
  const activeFilePath = project.activeFilePath === oldPath ? newPath : project.activeFilePath;
  return touch({ ...project, files, activeFilePath });
}

export function setActiveFile(project: Project, path: string): Project {
  return { ...project, activeFilePath: path };
}

export function getFile(project: Project, path: string): ProjectFile | undefined {
  return project.files.find((f) => f.path === path);
}
