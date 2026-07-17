import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { BuildResult, Project } from '@/types';
import { validateProject } from './validators';

/**
 * Runs the "build" command: validates the project, and if there are no
 * blocking errors, packages every file into a ProjectName.concept archive
 * (a plain zip under the hood — index.html/style.css/script.js/assets/manifest.json).
 */
export async function buildProject(project: Project): Promise<BuildResult> {
  const issues = validateProject(project);
  const hasErrors = issues.some((i) => i.severity === 'error');

  if (hasErrors) {
    return { ok: false, issues };
  }

  const zip = new JSZip();
  for (const file of project.files) {
    if (file.kind === 'image' && file.content.startsWith('data:')) {
      const base64 = file.content.split(',')[1] ?? '';
      zip.file(file.path, base64, { base64: true });
    } else {
      zip.file(file.path, file.content);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const packageName = `${sanitizeName(project.name)}.concept`;

  return { ok: true, issues, packageName, blob };
}

export function downloadBuild(result: BuildResult): void {
  if (result.blob && result.packageName) {
    saveAs(result.blob, result.packageName);
  }
}

function sanitizeName(name: string): string {
  return name.trim().replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'project';
}
