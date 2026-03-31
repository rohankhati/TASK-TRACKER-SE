import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot,
  serverTimestamp,
  getDocFromServer
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, Project, Task } from './types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}

export const getUserProfile = async (uid: string): Promise<UserProfile | null> => {
  const path = `users/${uid}`;
  try {
    const userDoc = await getDoc(doc(db, path));
    return userDoc.exists() ? userDoc.data() as UserProfile : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    return null;
  }
};

export const createUserProfile = async (profile: UserProfile) => {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, path), {
      ...profile,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateUserRole = async (uid: string, role: string) => {
  const path = `users/${uid}`;
  try {
    await updateDoc(doc(db, path), { role });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const getAllUsers = async (): Promise<UserProfile[]> => {
  const path = 'users';
  try {
    const usersSnapshot = await getDocs(collection(db, path));
    return usersSnapshot.docs.map(doc => doc.data() as UserProfile);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
};

export const createProject = async (project: Omit<Project, 'id' | 'createdAt'>) => {
  const path = 'projects';
  try {
    const newDoc = doc(collection(db, path));
    await setDoc(newDoc, {
      ...project,
      id: newDoc.id,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const getAllProjects = (callback: (projects: Project[]) => void) => {
  const path = 'projects';
  return onSnapshot(collection(db, path), (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as Project));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const createTask = async (task: Omit<Task, 'id' | 'createdAt'>) => {
  const path = 'tasks';
  try {
    const newDoc = doc(collection(db, path));
    await setDoc(newDoc, {
      ...task,
      id: newDoc.id,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
};

export const updateTask = async (taskId: string, updates: Partial<Task>) => {
  const path = `tasks/${taskId}`;
  try {
    await updateDoc(doc(db, path), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
};

export const deleteTask = async (taskId: string) => {
  const path = `tasks/${taskId}`;
  try {
    await deleteDoc(doc(db, path));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const getDailyTasks = (date: string, callback: (tasks: Task[]) => void) => {
  const path = 'tasks';
  const q = query(collection(db, path), where('date', '==', date));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as Task));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};

export const getMyTasks = (uid: string, callback: (tasks: Task[]) => void) => {
  const path = 'tasks';
  const q = query(collection(db, path), where('assignedTo', '==', uid));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(doc => doc.data() as Task));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
};
