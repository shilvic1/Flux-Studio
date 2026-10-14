import { Project } from '../types/flux';

const DB_NAME = 'flux_studio_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const ACTIVE_KEY = 'active_project_id';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save project to local IndexedDB
 */
export async function saveProjectLocally(project: Project): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.put(project);

      req.onsuccess = () => {
        try {
          localStorage.setItem(ACTIVE_KEY, project.id);
        } catch {
          // ignore localStorage quota errors
        }
        resolve();
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Failed to save project locally to IndexedDB:', err);
  }
}

/**
 * Load project by ID or load last active project
 */
export async function loadLastActiveProject(): Promise<Project | null> {
  try {
    const activeId = localStorage.getItem(ACTIVE_KEY);
    const db = await openDatabase();

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);

      if (activeId) {
        const req = store.get(activeId);
        req.onsuccess = () => {
          if (req.result) {
            resolve(req.result as Project);
            return;
          }
          // If active not found, get first available
          loadAnyProject(store, resolve);
        };
        req.onerror = () => loadAnyProject(store, resolve);
      } else {
        loadAnyProject(store, resolve);
      }
    });
  } catch (err) {
    console.warn('Could not load local project from IndexedDB:', err);
    return null;
  }
}

function loadAnyProject(store: IDBObjectStore, resolve: (val: Project | null) => void) {
  const allReq = store.getAll(undefined, 1);
  allReq.onsuccess = () => {
    if (allReq.result && allReq.result.length > 0) {
      resolve(allReq.result[0] as Project);
    } else {
      resolve(null);
    }
  };
  allReq.onerror = () => resolve(null);
}

/**
 * Get all projects from local storage
 */
export async function getAllLocalProjects(): Promise<Project[]> {
  try {
    const db = await openDatabase();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result as Project[]) || [];
        list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        resolve(list);
      };
      req.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error('Error getting all local projects:', err);
    return [];
  }
}

/**
 * Delete a project from local storage
 */
export async function deleteProjectLocally(projectId: string): Promise<void> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.delete(projectId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('Error deleting local project:', err);
  }
}
