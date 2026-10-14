import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './config';
import { Frame, Project, ProjectMetadata } from '../types/flux';

/**
 * Save or sync user profile document to /users/{userId}
 */
export async function syncUserProfile(): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const userPath = `users/${user.uid}`;
  try {
    const userRef = doc(db, 'users', user.uid);
    const existing = await getDoc(userRef);

    if (!existing.exists()) {
      await setDoc(userRef, {
        id: user.uid,
        displayName: (user.displayName || 'FLUX Artist').slice(0, 100),
        email: (user.email || '').slice(0, 150),
        photoURL: (user.photoURL || '').slice(0, 500),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(
        userRef,
        {
          displayName: (user.displayName || 'FLUX Artist').slice(0, 100),
          photoURL: (user.photoURL || '').slice(0, 500),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

/**
 * Save complete animation project to Firebase Firestore
 */
export async function saveProjectToCloud(
  project: Project,
  thumbnailBase64?: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be logged in to sync to Cloud');

  const projectPath = `projects/${project.id}`;

  try {
    const projectRef = doc(db, 'projects', project.id);
    const existingSnap = await getDoc(projectRef);

    const isNew = !existingSnap.exists();
    const nowTimestamp = serverTimestamp();

    // Prepare project metadata
    const projectPayload: Record<string, unknown> = {
      id: project.id,
      ownerId: user.uid,
      title: project.title.slice(0, 100),
      width: project.width,
      height: project.height,
      fps: project.fps,
      frameCount: project.frames.length,
      layerCount: project.frames[0]?.layers.length || 1,
      updatedAt: nowTimestamp,
    };

    if (thumbnailBase64) {
      // Limit thumbnail length to avoid exceeding firestore field limits
      projectPayload.thumbnail = thumbnailBase64.slice(0, 140000);
    }

    if (isNew) {
      projectPayload.createdAt = nowTimestamp;
    }

    await setDoc(projectRef, projectPayload, { merge: true });

    // Save individual frames to subcollection /projects/{projectId}/frames/{frameId}
    const batch = writeBatch(db);
    for (let i = 0; i < project.frames.length; i++) {
      const frame = project.frames[i];
      const frameRef = doc(db, `projects/${project.id}/frames`, frame.id);

      // Serialize frame layers
      const frameJson = JSON.stringify({
        layers: frame.layers.map(l => ({
          id: l.id,
          name: l.name,
          visible: l.visible,
          locked: l.locked,
          opacity: l.opacity,
          blendMode: l.blendMode,
          alphaLock: l.alphaLock,
          dataUrl: l.dataUrl || '',
        })),
      });

      // Truncate or ensure size fits in 750,000 char budget
      const payloadSafe = frameJson.slice(0, 740000);

      batch.set(frameRef, {
        id: frame.id,
        projectId: project.id,
        frameIndex: i,
        duration: frame.duration || 1,
        payload: payloadSafe,
        updatedAt: nowTimestamp,
      });
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, projectPath);
  }
}

/**
 * List all cloud projects belonging to current user
 */
export async function listUserCloudProjects(): Promise<ProjectMetadata[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const projectsPath = 'projects';
  try {
    const q = query(collection(db, projectsPath), where('ownerId', '==', user.uid));
    const querySnapshot = await getDocs(q);

    const list: ProjectMetadata[] = [];
    querySnapshot.forEach(docSnap => {
      const data = docSnap.data();
      list.push({
        id: data.id || docSnap.id,
        ownerId: data.ownerId,
        title: data.title || 'Untitled Project',
        description: data.description || '',
        width: data.width || 800,
        height: data.height || 600,
        fps: data.fps || 12,
        frameCount: data.frameCount || 1,
        layerCount: data.layerCount || 1,
        thumbnail: data.thumbnail || '',
        createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
      });
    });

    // Sort by recent update first
    list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, projectsPath);
  }
}

/**
 * Load complete animation project from Cloud by ID
 */
export async function loadProjectFromCloud(projectId: string): Promise<Project | null> {
  const projectPath = `projects/${projectId}`;
  try {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);

    if (!projectSnap.exists()) return null;
    const projectData = projectSnap.data();

    // Fetch frames
    const framesRef = collection(db, `projects/${projectId}/frames`);
    const framesSnap = await getDocs(framesRef);

    const rawFrames: Array<{ frameIndex: number; frame: Frame }> = [];

    framesSnap.forEach(fSnap => {
      const fData = fSnap.data();
      let layers = [];
      try {
        if (fData.payload) {
          const parsed = JSON.parse(fData.payload);
          layers = parsed.layers || [];
        }
      } catch (e) {
        console.warn('Failed parsing frame payload:', e);
      }

      rawFrames.push({
        frameIndex: fData.frameIndex ?? 0,
        frame: {
          id: fData.id || fSnap.id,
          duration: fData.duration || 1,
          layers,
        },
      });
    });

    rawFrames.sort((a, b) => a.frameIndex - b.frameIndex);
    const frames = rawFrames.map(rf => rf.frame);

    return {
      version: projectData.version || 1,
      id: projectId,
      ownerId: projectData.ownerId,
      title: projectData.title || 'Untitled Animation',
      width: projectData.width || 800,
      height: projectData.height || 600,
      fps: projectData.fps || 12,
      backgroundColor: projectData.backgroundColor || '#ffffff',
      frames: frames.length > 0 ? frames : [
        {
          id: 'frame_1',
          duration: 1,
          layers: [
            {
              id: 'layer_1',
              name: 'Background',
              visible: true,
              locked: false,
              opacity: 1,
              blendMode: 'source-over',
              alphaLock: false,
            },
          ],
        },
      ],
      createdAt: projectData.createdAt?.toDate ? projectData.createdAt.toDate().getTime() : Date.now(),
      updatedAt: projectData.updatedAt?.toDate ? projectData.updatedAt.toDate().getTime() : Date.now(),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, projectPath);
  }
}

/**
 * Delete a project from Firestore
 */
export async function deleteProjectFromCloud(projectId: string): Promise<void> {
  const projectPath = `projects/${projectId}`;
  try {
    // Delete all frame docs
    const framesRef = collection(db, `projects/${projectId}/frames`);
    const framesSnap = await getDocs(framesRef);
    const batch = writeBatch(db);

    framesSnap.forEach(f => batch.delete(f.ref));
    batch.delete(doc(db, 'projects', projectId));

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, projectPath);
  }
}
