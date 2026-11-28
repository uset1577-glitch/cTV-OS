import { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  LogIn,
  LogOut,
  Monitor,
  Power,
  Radio,
  Save,
  Send,
  Shield,
  ShieldAlert,
  Tv,
} from 'lucide-react';
import {
  ADMIN_EMAIL,
  isAuthorizedAdminUser,
  setGlobalLauncherStatus,
  signInCreatorWithGoogle,
  signOutCreator,
  subscribeToCreatorAuth,
  subscribeToLauncherStatus,
  testFirestoreConnection,
} from '../services/firebase';
import type { LauncherRemoteStatus } from '../types/launcher';

interface CreatorAdminPanelProps {
  onExit: () => void;
}

export function CreatorAdminPanel({ onExit }: CreatorAdminPanelProps) {
  const [authReady, setAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authErrorMsg, setAuthErrorMsg] = useState<string | null>(null);

  const [remoteStatus, setRemoteStatus] = useState<LauncherRemoteStatus>({
    maintenanceMode: false,
    appsOnlyMode: false,
    title: 'Mantenimiento · Próxima actualización',
    message:
      'El modo solo apps será activado mientras preparamos la próxima actualización de VORA TV OS.',
  });
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [saveWarning, setSaveWarning] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [titleInput, setTitleInput] = useState('');
  const [messageInput, setMessageInput] = useState('');

  const isAuthorized = isAuthorizedAdminUser(currentUser);

  useEffect(() => {
    const unsubAuth = subscribeToCreatorAuth((user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    void testFirestoreConnection().then((connected) => {
      setIsFirebaseConnected(connected);
    });

    const unsubscribe = subscribeToLauncherStatus((status) => {
      setRemoteStatus(status);
      setTitleInput((prev) => (prev ? prev : status.title));
      setMessageInput((prev) => (prev ? prev : status.message));
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleGoogleSignIn = async () => {
    setAuthBusy(true);
    setAuthErrorMsg(null);
    try {
      await signInCreatorWithGoogle();
    } catch (err) {
      setAuthErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo iniciar sesión con Google.'
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthErrorMsg(null);
    await signOutCreator();
  };

  const handleToggleMaintenance = async () => {
    if (!isAuthorized) return;
    const nextVal = !remoteStatus.maintenanceMode;
    setIsSaving(true);
    setSaveWarning(false);
    const ok = await setGlobalLauncherStatus({
      maintenanceMode: nextVal,
      appsOnlyMode: nextVal,
      title: (titleInput.trim() || remoteStatus.title).slice(0, 128),
      message: (messageInput.trim() || remoteStatus.message).slice(0, 512),
    });
    setIsSaving(false);
    if (ok) {
      setSavedSuccess(true);
      window.setTimeout(() => setSavedSuccess(false), 2400);
    } else {
      setSaveWarning(true);
      window.setTimeout(() => setSaveWarning(false), 3200);
    }
  };

  const handleSaveNotice = async () => {
    if (!isAuthorized) return;
    setIsSaving(true);
    setSaveWarning(false);
    const ok = await setGlobalLauncherStatus({
      title: (titleInput.trim() || remoteStatus.title).slice(0, 128),
      message: (messageInput.trim() || remoteStatus.message).slice(0, 512),
      maintenanceMode: true,
      appsOnlyMode: true,
    });
    setIsSaving(false);
    if (ok) {
      setSavedSuccess(true);
      window.setTimeout(() => setSavedSuccess(false), 2400);
    } else {
      setSaveWarning(true);
      window.setTimeout(() => setSaveWarning(false), 3200);
    }
  };

  const handleCopyAdminUrl = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('admin', 'true');
    navigator.clipboard?.writeText(url.toString()).then(() => {
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    });
  };

  if (!authReady || !isAuthorized) {
    const isWrongAccount = Boolean(authReady && currentUser && !isAuthorized);

    return (
      <div className="fixed inset-0 z-50 bg-[#090C12] text-zinc-100 flex flex-col items-center justify-center p-6 selection:bg-amber-500 selection:text-black">
        <div className="w-full max-w-md bg-[#111622] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600" />

          <div className="flex flex-col items-center text-center gap-3 mb-7">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/25 shadow-lg">
              {isWrongAccount ? (
                <ShieldAlert className="w-7 h-7 text-rose-400" />
              ) : (
                <Shield className="w-7 h-7" />
              )}
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-white">
              Panel del Creador (PC)
            </h1>
            <p className="text-xs text-zinc-400 leading-relaxed max-w-xs">
              {isWrongAccount
                ? `La cuenta ${currentUser?.email || 'actual'} no tiene permisos de administrador.`
                : 'Inicia sesión con tu cuenta de Google autorizada para gestionar el mantenimiento global en Firestore.'}
            </p>
          </div>

          <div className="space-y-4">
            {isWrongAccount && (
              <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3 text-xs text-rose-200 text-center">
                Acceso exclusivo para el propietario ({ADMIN_EMAIL}).
              </div>
            )}

            {authErrorMsg && (
              <p className="text-xs font-semibold text-rose-400 text-center">
                {authErrorMsg}
              </p>
            )}

            <button
              type="button"
              disabled={!authReady || authBusy}
              onClick={() => {
                if (isWrongAccount) {
                  void handleLogout().then(() => handleGoogleSignIn());
                } else {
                  void handleGoogleSignIn();
                }
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] disabled:opacity-60 text-zinc-950 font-bold text-sm transition-[background-color,transform] duration-150 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4 stroke-[2.5]" />
              <span>
                {!authReady
                  ? 'Verificando sesión...'
                  : authBusy
                    ? 'Conectando con Google...'
                    : isWrongAccount
                      ? 'Cambiar de cuenta de Google'
                      : 'Iniciar sesión con Google'}
              </span>
            </button>

            {isWrongAccount && (
              <button
                type="button"
                onClick={() => void handleLogout()}
                className="w-full py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-300 text-xs font-semibold transition-colors"
              >
                Cerrar sesión actual
              </button>
            )}
          </div>

          <div className="mt-6 pt-5 border-t border-white/8 flex items-center justify-between text-xs text-zinc-400">
            <button
              type="button"
              onClick={onExit}
              className="hover:text-white transition-colors"
            >
              ← Ver Launcher de TV
            </button>
            <span className="text-[11px] text-zinc-400">
              Protegido con Firebase Auth
            </span>
          </div>
        </div>
      </div>
    );
  }

  const isMaintActive = Boolean(
    remoteStatus.maintenanceMode || remoteStatus.appsOnlyMode
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#0A0D14] text-zinc-100 overflow-y-auto selection:bg-amber-500 selection:text-black flex flex-col font-sans">
      {/* Barra superior del panel */}
      <header className="sticky top-0 z-20 bg-[#0E121B]/98 border-b border-white/10 px-6 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-zinc-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
            <Shield className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display font-bold text-lg text-white">
                VORA TV OS · Panel de Control del Creador
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                ADMIN VERIFICADO
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              Sesión verificada: {currentUser?.email} · Sincronizado en tiempo real
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isFirebaseConnected === true
                  ? 'bg-emerald-400'
                  : isFirebaseConnected === false
                    ? 'bg-amber-400'
                    : 'bg-zinc-500'
              }`}
            />
            <span className="text-zinc-300 font-medium">
              {isFirebaseConnected === true
                ? 'Firebase en vivo'
                : isFirebaseConnected === false
                  ? 'Sin conexión al servidor'
                  : 'Conectando Firestore...'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleCopyAdminUrl}
            title="Copiar enlace directo de este panel para tu navegador de PC"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs font-semibold text-zinc-300 transition-colors"
          >
            {copiedUrl ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedUrl ? '¡Copiado!' : 'Copiar URL PC'}</span>
          </button>

          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-xs font-bold text-amber-300 transition-colors"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>Ver Launcher TV</span>
          </button>

          <button
            type="button"
            onClick={() => void handleLogout()}
            title="Cerrar sesión de creador"
            className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 lg:p-8 space-y-7">
        {/* Banner de aviso para el creador */}
        <div className="bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-purple-950/40 border border-blue-500/25 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-500/15 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/30">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold text-sm text-white">
                Control exclusivo de Mantenimiento Global
              </div>
              <p className="text-xs text-blue-200/80 mt-0.5">
                Protegido con reglas estrictas de Firestore: solo tu cuenta verificada puede emitir cambios a los televisores.
              </p>
            </div>
          </div>
          <div className="text-xs font-mono text-zinc-400 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
            Acceso PC: <strong>?admin=true</strong>
          </div>
        </div>

        {/* Sección principal: Interruptor Maestro de Mantenimiento */}
        <section
          className={`rounded-3xl border-2 p-6 md:p-8 transition-[background-color,border-color] duration-200 shadow-2xl relative overflow-hidden ${
            isMaintActive
              ? 'bg-amber-950/20 border-amber-500/60 shadow-amber-950/40'
              : 'bg-[#111622] border-white/10 shadow-black/60'
          }`}
        >
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/5 border border-white/10">
                <Radio
                  className={`w-3.5 h-3.5 ${isMaintActive ? 'text-amber-400' : 'text-zinc-500'}`}
                />
                <span>Estado Global de Mantenimiento</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
                {isMaintActive
                  ? '🔴 MANTENIMIENTO ACTIVO PARA TODOS'
                  : '🟢 LAUNCHER NORMAL (Sin Mantenimiento)'}
              </h2>
              <p className="text-xs md:text-sm text-zinc-300 leading-relaxed">
                {isMaintActive
                  ? 'Todos los televisores tienen activo el aviso de mantenimiento y el modo solo apps.'
                  : 'El launcher opera de forma libre con recomendaciones y En vivo.'}
              </p>
            </div>

            <div className="flex flex-col items-center gap-2 shrink-0 w-full lg:w-auto">
              <button
                type="button"
                disabled={isSaving}
                onClick={() => void handleToggleMaintenance()}
                className={`w-full lg:w-72 py-5 px-6 rounded-2xl font-bold text-base transition-[background-color,transform] duration-150 active:scale-95 shadow-xl flex items-center justify-center gap-3 ${
                  isMaintActive
                    ? 'bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white shadow-rose-600/30'
                    : 'bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 shadow-amber-500/30'
                }`}
              >
                <Power className="w-5 h-5 stroke-[2.5]" />
                <span>
                  {isSaving
                    ? 'Actualizando...'
                    : isMaintActive
                      ? 'DESACTIVAR MANTENIMIENTO'
                      : 'ACTIVAR MANTENIMIENTO'}
                </span>
              </button>
              <span className="text-[11px] text-zinc-400">
                {isMaintActive
                  ? 'Clic para devolver las TVs a modo normal'
                  : 'Clic para activar el mantenimiento en todas las TVs'}
              </span>
            </div>
          </div>
        </section>

        {/* Cuadrícula de 2 columnas: Personalización de Mensaje y Vista Previa */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          {/* Columna 1: Editor del Mensaje */}
          <section className="bg-[#111622] border border-white/10 rounded-3xl p-6 md:p-7 space-y-5 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Contenido del Cartel de Mantenimiento
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Personaliza el título y mensaje del aviso en los televisores
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <Send className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="notice-title"
                  className="block text-xs font-semibold text-zinc-300 mb-1.5"
                >
                  Título del Cartel (máx. 128)
                </label>
                <input
                  id="notice-title"
                  type="text"
                  maxLength={128}
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="ej: Mantenimiento · Próxima actualización"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#090C12] border border-white/12 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label
                  htmlFor="notice-msg"
                  className="block text-xs font-semibold text-zinc-300 mb-1.5"
                >
                  Mensaje del Cartel (máx. 512)
                </label>
                <textarea
                  id="notice-msg"
                  rows={3}
                  maxLength={512}
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  placeholder="ej: El modo solo apps será activado..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#090C12] border border-white/12 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleSaveNotice()}
                  className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.98] text-white font-bold text-xs transition-[background-color,transform] duration-150 flex items-center justify-center gap-2 border border-white/10"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSaving
                      ? 'Guardando...'
                      : 'Guardar y Emitir Mensaje a las TVs'}
                  </span>
                </button>
                {savedSuccess && (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>¡Emitido en vivo!</span>
                  </span>
                )}
                {saveWarning && !savedSuccess && (
                  <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 shrink-0">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Error al guardar en Firestore</span>
                  </span>
                )}
              </div>
            </div>

            {/* Plantillas rápidas */}
            <div className="pt-4 border-t border-white/8 space-y-2">
              <span className="text-xs font-semibold text-zinc-400">
                Plantillas rápidas:
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTitleInput('Mantenimiento · Próxima actualización');
                    setMessageInput(
                      'El modo solo apps será activado mientras preparamos la próxima actualización.'
                    );
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 transition-colors"
                >
                  Modo Solo Apps Obligatorio
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTitleInput('Servidores en Mantenimiento');
                    setMessageInput(
                      'Estamos mejorando los servidores de streaming y catálogo en vivo.'
                    );
                  }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 transition-colors"
                >
                  Mejora de Servidores
                </button>
              </div>
            </div>
          </section>

          {/* Columna 2: Vista Previa en Vivo */}
          <section className="bg-[#111622] border border-white/10 rounded-3xl p-6 md:p-7 space-y-4 shadow-xl flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg text-white">
                  Vista Previa en el Televisor
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Así se verá el cartel en las pantallas
                </p>
              </div>
              <span
                className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                  isMaintActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-zinc-800 text-zinc-400'
                }`}
              >
                {isMaintActive ? 'Mantenimiento Activo' : 'Normal'}
              </span>
            </div>

            {/* Marco de Televisor simulado */}
            <div className="flex-1 min-h-[220px] rounded-2xl bg-[#080A0F] border border-white/10 p-5 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-2 right-3 text-[10px] text-zinc-500 font-mono">
                Simulador Android TV
              </div>

              {isMaintActive ? (
                <div className="space-y-4 my-auto">
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 text-amber-300 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <div className="text-sm font-bold">
                        {titleInput || 'Mantenimiento · Próxima actualización'}
                      </div>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                        {messageInput || 'El modo solo apps será activado...'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-amber-400" />
                    <span>Bloqueo activo en modo solo apps</span>
                  </div>
                </div>
              ) : (
                <div className="my-auto text-center space-y-2 py-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <div className="text-sm font-semibold text-white">
                    Televisor en Funcionamiento Normal
                  </div>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Sin avisos de mantenimiento.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>VORA TV OS · Firebase Cloud</span>
                <span>En vivo</span>
              </div>
            </div>

            <div className="text-xs text-zinc-400 leading-relaxed bg-white/[0.03] p-3.5 rounded-xl border border-white/5">
              Solo tu cuenta verificada de Google puede modificar este estado en la nube.
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
