import { useState } from 'react';
import type { TemplateId } from '@/types';
import { TEMPLATES } from '@/project-manager/templates';
import './NewProjectModal.css';

export default function NewProjectModal({
  onCreate,
  onClose
}: {
  onCreate: (name: string, templateId: TemplateId) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [templateId, setTemplateId] = useState<TemplateId>('blank');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onCreate(name.trim() || 'Untitled Project', templateId);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal card" onClick={(e) => e.stopPropagation()}>
        <h2>New project</h2>
        <form onSubmit={handleSubmit}>
          <label className="modal-label" htmlFor="project-name">
            Project name
          </label>
          <input
            id="project-name"
            className="modal-input"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My Cool App"
          />

          <label className="modal-label">Starting point</label>
          <div className="modal-template-list">
            {TEMPLATES.map((t) => (
              <label key={t.id} className={`modal-template-option ${templateId === t.id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="template"
                  value={t.id}
                  checked={templateId === t.id}
                  onChange={() => setTemplateId(t.id)}
                />
                <span className="modal-template-name">{t.name}</span>
                <span className="modal-template-desc">{t.description}</span>
              </label>
            ))}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
