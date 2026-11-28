import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { LauncherRemoteStatus } from '../types/launcher';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const ADMIN_EMAIL = 'cristhianmateopenabravo@gmail.com';
const STATUS_PATH = 'launcherStatus/global';
const STATUS_DOC_REF = doc(db, 'launcherStatus', 'global');

const DEFAULT_STATUS: LauncherRemoteStatus = {
  maintenanceMode: false,
  appsOnlyMode: false,
  title: 'Mantenimiento · Próxima actualización',
  message:
    'El modo solo apps será activado mientras preparamos la próxima actualización de VORA TV OS.',
};

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isAuthorizedAdminUser(user: User | null | undefined): boolean {
  if (!user) return false;
  return Boolean(
    user.emailVerified && user.email?.trim().toLowerCase() === ADMIN_EMAIL
  );
}

export function subscribeToCreatorAuth(
  onChange: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, onChange);
}

export async function signInCreatorWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function signOutCreator(): Promise<void> {
  await signOut(auth);
}

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(STATUS_DOC_REF);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

const CACHE_KEY = 'vora_remote_status_cache';

export function clearCachedLauncherStatus(): void {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Ignorar
  }
}

export function getCachedLauncherStatus(): LauncherRemoteStatus {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // Ignorar error de parsing
  }
  return DEFAULT_STATUS;
}

export function subscribeToLauncherStatus(
  onUpdate: (status: LauncherRemoteStatus) => void,
  onError?: (err: Error) => void,
  options?: { ignoreInitialMaintenance?: boolean }
): () => void {
  const ignoreInitial = Boolean(options?.ignoreInitialMaintenance);

  // En arranque/vista previa iniciar siempre limpio (sin mantenimiento bloqueado en caché)
  if (ignoreInitial) {
    clearCachedLauncherStatus();
    onUpdate(DEFAULT_STATUS);
  } else {
    onUpdate(getCachedLauncherStatus());
  }

  let isFirstSnapshot = true;
  let lastSnapshotUpdatedAt = '';

  const handleCustomEvent = (e: Event) => {
    const custom = e as CustomEvent<LauncherRemoteStatus>;
    if (custom.detail) {
      onUpdate(custom.detail);
    }
  };

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === CACHE_KEY && e.newValue) {
      try {
        onUpdate(JSON.parse(e.newValue));
      } catch {
        // Ignorar JSON inválido
      }
    }
  };

  window.addEventListener('voraStatusChanged', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  const unsubFirestore = onSnapshot(
    STATUS_DOC_REF,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const remoteUpdatedAt = data.updatedAt?.toDate?.()?.toISOString() || '';
        const updated: LauncherRemoteStatus = {
          maintenanceMode: Boolean(data.maintenanceMode),
          appsOnlyMode: Boolean(data.appsOnlyMode),
          title: data.title || DEFAULT_STATUS.title,
          message: data.message || DEFAULT_STATUS.message,
          updatedAt: remoteUpdatedAt || new Date().toISOString(),
        };

        if (ignoreInitial && isFirstSnapshot) {
          isFirstSnapshot = false;
          lastSnapshotUpdatedAt = remoteUpdatedAt;
          if (updated.maintenanceMode || updated.appsOnlyMode) {
            onUpdate({
              ...updated,
              maintenanceMode: false,
              appsOnlyMode: false,
            });
            return;
          }
        } else {
          isFirstSnapshot = false;
          if (
            ignoreInitial &&
            remoteUpdatedAt &&
            remoteUpdatedAt === lastSnapshotUpdatedAt
          ) {
            return;
          }
          lastSnapshotUpdatedAt = remoteUpdatedAt;
        }

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        } catch {
          // Ignorar almacenamiento lleno
        }
        onUpdate(updated);
      } else {
        isFirstSnapshot = false;
        onUpdate(DEFAULT_STATUS);
      }
    },
    (err) => {
      console.warn('Firestore subscription fallback:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubFirestore();
    window.removeEventListener('voraStatusChanged', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

function sanitizeTextField(raw: unknown, fallback: string, maxLen: number): string {
  const str = typeof raw === 'string' ? raw.trim() : '';
  const nonEmpty = str.length > 0 ? str : fallback;
  return nonEmpty.slice(0, maxLen);
}

export async function setGlobalLauncherStatus(
  patch: Partial<LauncherRemoteStatus>
): Promise<boolean> {
  if (!isAuthorizedAdminUser(auth.currentUser)) {
    return false;
  }

  let existingData: Partial<LauncherRemoteStatus> = DEFAULT_STATUS;
  try {
    const snap = await getDoc(STATUS_DOC_REF);
    if (snap.exists()) {
      existingData = snap.data() as Partial<LauncherRemoteStatus>;
    }
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.GET, STATUS_PATH);
    } catch {
      return false;
    }
  }

  const nextMaintenance = Boolean(
    patch.maintenanceMode !== undefined
      ? patch.maintenanceMode
      : existingData.maintenanceMode
  );
  const nextAppsOnly = Boolean(
    patch.appsOnlyMode !== undefined ? patch.appsOnlyMode : existingData.appsOnlyMode
  );
  const nextTitle = sanitizeTextField(
    patch.title ?? existingData.title,
    DEFAULT_STATUS.title,
    128
  );
  const nextMessage = sanitizeTextField(
    patch.message ?? existingData.message,
    DEFAULT_STATUS.message,
    512
  );

  try {
    await setDoc(STATUS_DOC_REF, {
      maintenanceMode: nextMaintenance,
      appsOnlyMode: nextAppsOnly,
      title: nextTitle,
      message: nextMessage,
      updatedAt: serverTimestamp(),
    });

    try {
      const mergedLocal: LauncherRemoteStatus = {
        maintenanceMode: nextMaintenance,
        appsOnlyMode: nextAppsOnly,
        title: nextTitle,
        message: nextMessage,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(mergedLocal));
      window.dispatchEvent(
        new CustomEvent('voraStatusChanged', { detail: mergedLocal })
      );
    } catch {
      // Ignorar
    }

    return true;
  } catch (err) {
    try {
      handleFirestoreError(err, OperationType.WRITE, STATUS_PATH);
    } catch {
      return false;
    }
  }
}
