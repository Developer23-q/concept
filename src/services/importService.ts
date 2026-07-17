import JSZip from 'jszip';
import type { Project, ProjectFile } from '@/types';
import { detectKind } from '@/project-manager/projectManager';

const TEXT_KINDS = new Set(['html', 'css', 'js', 'json', 'text']);

function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/**
 * Imports a .zip (exported .concept package, or any zipped HTML/CSS/JS
 * project) into a new Project. Handles a common case gracefully: if
 * everything in the zip lives under one wrapper folder (e.g. because the
 * user zipped a folder rather than its contents), that wrapper is stripped.
 */
export async function importProjectFromZip(file: File): Promise<Project> {
  const zip = await JSZip.loadAsync(file);
  const entries = Object.values(zip.files).filter((f) => !f.dir);

  if (entries.length === 0) {
    throw new Error('That zip file appears to be empty.');
  }

  const commonPrefix = findCommonFolderPrefix(entries.map((e) => e.name));

  const files: ProjectFile[] = [];
  for (const entry of entries) {
    const path = commonPrefix ? entry.name.slice(commonPrefix.length) : entry.name;
    if (!path || path.startsWith('__MACOSX') || path.endsWith('.DS_Store')) continue;

    const kind = detectKind(path);
    let content: string;
    if (TEXT_KINDS.has(kind)) {
      content = await entry.async('string');
    } else {
      const base64 = await entry.async('base64');
      content = `data:${guessMime(path)};base64,${base64}`;
    }

    files.push({ id: uid(), path, kind, content, updatedAt: Date.now() });
  }

  if (!files.some((f) => f.path === 'index.html')) {
    throw new Error('No index.html was found in this zip. Concept projects need an index.html at the root.');
  }

  const name = file.name.replace(/\.(zip|concept)$/i, '');
  const now = Date.now();

  return {
    id: uid(),
    name,
    createdAt: now,
    updatedAt: now,
    files,
    activeFilePath: 'index.html'
  };
}

function findCommonFolderPrefix(names: string[]): string | null {
  const first = names[0];
  const slashIndex = first.indexOf('/');
  if (slashIndex === -1) return null;
  const candidate = first.slice(0, slashIndex + 1);
  const allShare = names.every((n) => n.startsWith(candidate));
  return allShare ? candidate : null;
}

function guessMime(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'png': return 'image/png';
    case 'jpg': case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'svg': return 'image/svg+xml';
    case 'webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}
