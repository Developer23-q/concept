import type { Project, TerminalLine } from '@/types';
import * as pm from '@/project-manager/projectManager';
import { buildProject, downloadBuild } from '@/services/buildService';
import { openPreviewInNewTab } from '@/runtime/previewRuntime';

export interface CommandContext {
  project: Project;
  updateProject: (updater: (p: Project) => Project) => void;
  runPreview: () => void;
  requestOpenProject: (name: string) => void;
}

export interface CommandOutcome {
  lines: Omit<TerminalLine, 'id' | 'timestamp'>[];
}

const HELP_TEXT = [
  'Available commands:',
  '  mkdir <name>     Create a new file (e.g. mkdir about.html)',
  '  open <project>   Reminder of how to switch projects',
  '  preview          Run the live preview (in the Preview panel)',
  '  preview --tab    Open the live preview in a full new browser tab',
  '  build            Validate the project and create a .concept package',
  '  ls               List files in this project',
  '  clear            Clear the terminal',
  '  help             Show this list of commands'
];

export async function runCommand(raw: string, ctx: CommandContext): Promise<CommandOutcome> {
  const trimmed = raw.trim();
  if (!trimmed) return { lines: [] };

  const [command, ...args] = trimmed.split(/\s+/);
  const arg = args.join(' ');

  switch (command) {
    case 'help':
      return { lines: HELP_TEXT.map((text) => ({ type: 'output', text })) };

    case 'clear':
      return { lines: [{ type: 'info', text: '__CLEAR__' }] };

    case 'ls': {
      const files = ctx.project.files.map((f) => f.path);
      return { lines: [{ type: 'output', text: files.join('\n') }] };
    }

    case 'mkdir': {
      if (!arg) {
        return { lines: [{ type: 'error', text: 'Usage: mkdir <filename>  (e.g. mkdir about.html)' }] };
      }
      try {
        ctx.updateProject((p) => pm.createFile(p, arg));
        return { lines: [{ type: 'success', text: `Created "${arg}".` }] };
      } catch (e) {
        return { lines: [{ type: 'error', text: e instanceof Error ? e.message : String(e) }] };
      }
    }

    case 'open': {
      if (!arg) {
        return { lines: [{ type: 'error', text: 'Usage: open <project-name>' }] };
      }
      ctx.requestOpenProject(arg);
      return { lines: [{ type: 'info', text: `To open a different project, go back to Home and select "${arg}" from Recent Projects.` }] };
    }

    case 'preview':
      if (args[0] === '--tab' || args[0] === '-t') {
        try {
          openPreviewInNewTab(ctx.project);
          return { lines: [{ type: 'success', text: 'Opened preview in a new tab.' }] };
        } catch (e) {
          return { lines: [{ type: 'error', text: e instanceof Error ? e.message : String(e) }] };
        }
      }
      ctx.runPreview();
      return { lines: [{ type: 'success', text: 'Preview started. Check the Preview panel → (or run "preview --tab" for a full new tab)' }] };

    case 'build': {
      const result = await buildProject(ctx.project);
      const lines: Omit<TerminalLine, 'id' | 'timestamp'>[] = [];
      if (result.issues.length === 0) {
        lines.push({ type: 'success', text: 'No issues found.' });
      } else {
        for (const issue of result.issues) {
          lines.push({
            type: issue.severity === 'error' ? 'error' : 'output',
            text: `[${issue.severity.toUpperCase()}] ${issue.file ? issue.file + ': ' : ''}${issue.message}`
          });
        }
      }
      if (result.ok) {
        lines.push({ type: 'success', text: `Build succeeded → ${result.packageName}` });
        downloadBuild(result);
      } else {
        lines.push({ type: 'error', text: 'Build failed. Fix the errors above and run "build" again.' });
      }
      return { lines };
    }

    default:
      return {
        lines: [
          { type: 'error', text: `Unknown command: "${command}". Type "help" to see available commands.` }
        ]
      };
  }
}
