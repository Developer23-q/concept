import { useEffect, useRef, useState } from 'react';
import type { Project, TerminalLine } from '@/types';
import { runCommand } from '@/services/terminalCommands';
import './TerminalPanel.css';

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export default function TerminalPanel({
  project,
  onUpdateProject,
  onRunPreview,
  onOpenProjectRequest,
  collapsed,
  onToggleCollapsed
}: {
  project: Project;
  onUpdateProject: (updater: (p: Project) => Project) => void;
  onRunPreview: () => void;
  onOpenProjectRequest: (name: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: uid(), type: 'info', text: 'Concept Terminal — type "help" to see available commands.', timestamp: Date.now() }
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  async function submit() {
    const value = input;
    if (!value.trim()) return;

    setLines((prev) => [...prev, { id: uid(), type: 'input', text: value, timestamp: Date.now() }]);
    setHistory((prev) => [...prev, value]);
    setHistoryIndex(null);
    setInput('');

    const outcome = await runCommand(value, {
      project,
      updateProject: onUpdateProject,
      runPreview: onRunPreview,
      requestOpenProject: onOpenProjectRequest
    });

    if (outcome.lines.some((l) => l.text === '__CLEAR__')) {
      setLines([]);
      return;
    }

    setLines((prev) => [
      ...prev,
      ...outcome.lines.map((l) => ({ ...l, id: uid(), timestamp: Date.now() }))
    ]);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      submit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length === 0) return;
      const nextIndex = historyIndex === null ? history.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIndex);
      setInput(history[nextIndex]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex === null) return;
      const nextIndex = historyIndex + 1;
      if (nextIndex >= history.length) {
        setHistoryIndex(null);
        setInput('');
      } else {
        setHistoryIndex(nextIndex);
        setInput(history[nextIndex]);
      }
    }
  }

  return (
    <div className="terminal-panel">
      <div className="terminal-header" onClick={onToggleCollapsed}>
        <span>Terminal</span>
        <span className="terminal-collapse-hint">{collapsed ? 'Show ▲' : 'Hide ▼'}</span>
      </div>
      {!collapsed && (
        <>
          <div className="terminal-output" ref={scrollRef} onClick={() => inputRef.current?.focus()}>
            {lines.map((line) => (
              <div key={line.id} className={`terminal-line type-${line.type}`}>
                {line.type === 'input' ? (
                  <span><span className="terminal-prompt">concept&gt;</span> {line.text}</span>
                ) : (
                  <pre>{line.text}</pre>
                )}
              </div>
            ))}
          </div>
          <div className="terminal-input-row">
            <span className="terminal-prompt">concept&gt;</span>
            <input
              ref={inputRef}
              className="terminal-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a command… try 'help'"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </>
      )}
    </div>
  );
}
