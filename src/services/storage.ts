import { openDB, type IDBPDatabase } from 'idb';
import type { Project } from '@/types';

const DB_NAME = 'concept-db';
const DB_VERSION = 1;
const PROJECTS_STORE = 'projects';
const RECENTS_STORE = 'recents'; // key: projectId, value: timestamp

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db: IDBPDatabase) {
        if (!db.objectStoreNames.contains(PROJECTS_STORE)) {
          db.createObjectStore(PROJECTS_STORE, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(RECENTS_STORE)) {
          db.createObjectStore(RECENTS_STORE);
        }
      }
    });
  }
  return dbPromise;
}

export const storage = {
  async saveProject(project: Project): Promise<void> {
    const db = await getDb();
    await db.put(PROJECTS_STORE, project);
    await db.put(RECENTS_STORE, Date.now(), project.id);
  },

  async getProject(id: string): Promise<Project | undefined> {
    const db = await getDb();
    return db.get(PROJECTS_STORE, id);
  },

  async deleteProject(id: string): Promise<void> {
    const db = await getDb();
    await db.delete(PROJECTS_STORE, id);
    await db.delete(RECENTS_STORE, id);
  },

  async listProjects(): Promise<Project[]> {
    const db = await getDb();
    return db.getAll(PROJECTS_STORE);
  },

  /** Projects sorted by most-recently-touched first. */
  async listRecent(limit = 8): Promise<Project[]> {
    const db = await getDb();
    const all: Project[] = await db.getAll(PROJECTS_STORE);
    return all.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, limit);
  }
};
