import { useEffect, useState } from 'react';
import type { CommunityApp } from '@/types';
import { communityService } from '@/services/communityService';
import { githubService } from '@/github/githubService';
import './CommunityHub.css';

export default function CommunityHub() {
  const [apps, setApps] = useState<CommunityApp[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [selected, setSelected] = useState<CommunityApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    communityService.categories().then(setCategories);
  }, []);

  useEffect(() => {
    setLoading(true);
    communityService.listApps(query, category || undefined).then((list) => {
      setApps(list);
      setLoading(false);
    });
  }, [query, category]);

  async function handleStar(slug: string) {
    await githubService.starApp(slug);
    const list = await communityService.listApps(query, category || undefined);
    setApps(list);
    setSelected((prev) => (prev ? list.find((a) => a.slug === prev.slug) ?? prev : prev));
  }

  async function handleDownload(app: CommunityApp) {
    setDownloading(app.slug);
    try {
      await communityService.downloadApp(app);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloading(null);
    }
  }

  if (selected) {
    return (
      <div className="community-hub">
        <button className="btn btn-ghost" onClick={() => setSelected(null)}>← Back to Community</button>
        <div className="app-detail card">
          <div className="app-detail-header">
            <div className="app-detail-icon">{'</>'}</div>
            <div>
              <h2>{selected.name}</h2>
              <p className="app-detail-creator">by {selected.owner}</p>
            </div>
          </div>
          <p className="app-detail-desc">{selected.description}</p>
          <div className="app-detail-tags">
            <span className="chip">{selected.category}</span>
            {selected.tags.map((t) => <span key={t} className="chip">{t}</span>)}
          </div>
          <div className="app-detail-stats">
            <span>⭐ {selected.stars} stars</span>
            <span>⬇ {selected.downloads} downloads</span>
            <span>Updated {new Date(selected.updatedAt).toLocaleDateString()}</span>
          </div>
          <div className="app-detail-actions">
            <button 
              className="btn btn-primary" 
              onClick={() => handleDownload(selected)}
              disabled={downloading === selected.slug}
              title="Download as .concept package"
            >
              {downloading === selected.slug ? 'Downloading…' : '⬇ Download'}
            </button>
            <button className="btn" onClick={() => handleStar(selected.slug)} title="Star this app">
              ⭐ Star
            </button>
          </div>
          <div className="app-detail-note">
            <small>Downloaded .concept packages can be imported into a new project from the Dashboard.</small>
          </div>
        </div>
      </div>
    );
  }

  const topApps = apps.slice(0, 3);

  return (
    <div className="community-hub">
      <div className="community-header">
        <h2>Concept Community Gallery</h2>
        <p>Download and explore apps built by the community with Concept.</p>
      </div>

      <div className="community-search-row">
        <input
          className="community-search"
          placeholder="Search apps or tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {!query && !category && topApps.length > 0 && (
        <div className="community-featured">
          <h3>Featured Apps</h3>
          <div className="community-featured-grid">
            {topApps.map((app) => (
              <div key={app.slug} className="community-featured-card card" onClick={() => setSelected(app)}>
                <div className="featured-icon">{'</>'}</div>
                <h4>{app.name}</h4>
                <p className="featured-creator">by {app.owner}</p>
                <p className="featured-desc">{app.description}</p>
                <div className="featured-stats">⭐ {app.stars} stars · ⬇ {app.downloads} downloads</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="community-loading">Loading apps…</p>
      ) : apps.length === 0 ? (
        <p className="community-loading">No apps match your search.</p>
      ) : (
        <>
          <div className="community-gallery-header">
            <h3>{query || category ? 'Search Results' : 'All Apps'}</h3>
            <span className="community-app-count">{apps.length} apps</span>
          </div>
          <div className="community-gallery">
            <div className="community-grid">
              {apps.map((app) => (
                <div key={app.slug} className="community-card card">
                  <button className="community-card-content" onClick={() => setSelected(app)}>
                    <div className="community-card-icon">{'</>'}</div>
                    <div className="community-card-name">{app.name}</div>
                    <div className="community-card-creator">by {app.owner}</div>
                    <div className="community-card-desc">{app.description}</div>
                    <div className="community-card-tags">
                      {app.tags.slice(0, 2).map((t) => <span key={t} className="chip">{t}</span>)}
                    </div>
                    <div className="community-card-stats">⭐ {app.stars} · ⬇ {app.downloads}</div>
                  </button>
                  <div className="community-card-actions">
                    <button
                      className="btn btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(app);
                      }}
                      disabled={downloading === app.slug}
                      title="Download this app"
                    >
                      {downloading === app.slug ? '⏳' : '⬇'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
