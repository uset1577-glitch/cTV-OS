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

export function subscribeToLauncherStatus(
  onUpdate: (status: LauncherRemoteStatus) => void,
  onError?: (err: Error) => void
): () => void {
  return onSnapshot(
    STATUS_DOC_REF,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onUpdate({
          maintenanceMode: Boolean(data.maintenanceMode),
          appsOnlyMode: Boolean(data.appsOnlyMode),
          title: data.title || DEFAULT_STATUS.title,
          message: data.message || DEFAULT_STATUS.message,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || '',
        });
      } else {
        onUpdate(DEFAULT_STATUS);
      }
    },
    (err) => {
      if (onError) onError(err);
    }
  );
}

export async function setGlobalLauncherStatus(patch: Partial<LauncherRemoteStatus>): Promise<boolean> {
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
    return true;
  } catch {
    return false;
  }
}
