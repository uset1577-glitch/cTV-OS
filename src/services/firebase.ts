import { initializeApp } from 'firebase/app';
import {
  doc,
  getDoc,
  getFirestore,
  onSnapshot,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type { LauncherRemoteStatus } from '../types/launcher';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const STATUS_DOC_REF = doc(db, 'launcherStatus', 'global');

const DEFAULT_STATUS: LauncherRemoteStatus = {
  maintenanceMode: false,
  appsOnlyMode: false,
  title: 'Mantenimiento · Próxima actualización',
  message: 'El modo solo apps será activado mientras preparamos la próxima actualización de VORA TV OS.',
};

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    const snap = await getDoc(STATUS_DOC_REF);
    if (!snap.exists()) {
      // Inicializar documento por defecto si no existe
      await setDoc(STATUS_DOC_REF, {
        ...DEFAULT_STATUS,
        updatedAt: Timestamp.now(),
      });
    }
    return true;
  } catch {
    return false;
  }
}

const CACHE_KEY = 'cgamestv_remote_status_cache';

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
  onError?: (err: Error) => void
): () => void {
  // Primero notificar con estado en caché para respuesta instantánea
  const cached = getCachedLauncherStatus();
  onUpdate(cached);

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
      } catch {}
    }
  };

  window.addEventListener('voraStatusChanged', handleCustomEvent);
  window.addEventListener('storage', handleStorageEvent);

  const unsubFirestore = onSnapshot(
    STATUS_DOC_REF,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const updated: LauncherRemoteStatus = {
          maintenanceMode: Boolean(data.maintenanceMode),
          appsOnlyMode: Boolean(data.appsOnlyMode),
          title: data.title || DEFAULT_STATUS.title,
          message: data.message || DEFAULT_STATUS.message,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        };
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(updated));
        } catch {}
        onUpdate(updated);
      } else {
        onUpdate(DEFAULT_STATUS);
      }
    },
    (err) => {
      console.warn('Firestore subscription fallback to cache:', err);
      if (onError) onError(err);
    }
  );

  return () => {
    unsubFirestore();
    window.removeEventListener('voraStatusChanged', handleCustomEvent);
    window.removeEventListener('storage', handleStorageEvent);
  };
}

export async function setGlobalLauncherStatus(patch: Partial<LauncherRemoteStatus>): Promise<boolean> {
  // 1. Sincronizar inmediatamente en localStorage y eventos para actualización instantánea
  try {
    const currentCached = getCachedLauncherStatus();
    const merged: LauncherRemoteStatus = {
      ...currentCached,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new CustomEvent('voraStatusChanged', { detail: merged }));
  } catch (err) {
    console.warn('Cache write warning:', err);
  }

  // 2. Transmitir a Firebase Firestore a todos los dispositivos en la nube
  try {
    const snap = await getDoc(STATUS_DOC_REF);
    const current = snap.exists() ? snap.data() : DEFAULT_STATUS;
    await setDoc(
      STATUS_DOC_REF,
      {
        ...current,
        ...patch,
        updatedAt: Timestamp.now(),
      },
      { merge: true }
    );
    console.log('Firebase status broadcast SUCCESSFUL:', patch);
    return true;
  } catch (err) {
    console.error('Error writing to Firestore:', err);
    return false;
  }
}
