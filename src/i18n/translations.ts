import type { AppLanguage } from '../types/launcher';

export interface LanguageOption {
  code: AppLanguage;
  shortCode: string;
  nativeName: string;
  regionHint: string;
  locale: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: 'es',
    shortCode: 'ES',
    nativeName: 'Español',
    regionHint: 'Latinoamérica · España',
    locale: 'es-ES',
  },
  {
    code: 'en',
    shortCode: 'EN',
    nativeName: 'English',
    regionHint: 'United States · UK',
    locale: 'en-US',
  },
  {
    code: 'pt',
    shortCode: 'PT',
    nativeName: 'Português',
    regionHint: 'Brasil · Portugal',
    locale: 'pt-BR',
  },
  {
    code: 'fr',
    shortCode: 'FR',
    nativeName: 'Français',
    regionHint: 'France · Canada',
    locale: 'fr-FR',
  },
];

export function isValidAppLanguage(value: unknown): value is AppLanguage {
  return value === 'es' || value === 'en' || value === 'pt' || value === 'fr';
}

export function detectDeviceLanguage(): AppLanguage {
  if (typeof navigator === 'undefined') return 'es';
  const raw = (navigator.language || '').toLowerCase();
  if (raw.startsWith('en')) return 'en';
  if (raw.startsWith('pt')) return 'pt';
  if (raw.startsWith('fr')) return 'fr';
  return 'es';
}

export function getDateLocale(lang: AppLanguage): string {
  return SUPPORTED_LANGUAGES.find((item) => item.code === lang)?.locale || 'es-ES';
}

export function getLanguageLabel(lang: AppLanguage): string {
  return SUPPORTED_LANGUAGES.find((item) => item.code === lang)?.nativeName || 'Español';
}

export interface LauncherTranslations {
  languageSetup: {
    eyebrow: string;
    title: string;
    subtitle: string;
    selectCta: string;
    remoteHint: string;
  };
  topBar: {
    navAria: string;
    home: string;
    live: string;
    apps: string;
    searchAria: string;
    searchTitle: string;
    toLightAria: string;
    toDarkAria: string;
    lightTitle: string;
    darkTitle: string;
    screensaverAria: string;
    screensaverTitle: string;
    updateAria: string;
    updateTitle: string;
    updateLabel: string;
    settingsAria: string;
    settingsTitle: string;
  };
  home: {
    appsOnlySectionAria: string;
    appsOnlyTitle: string;
    appsOnlyHint: string;
    seeAll: string;
    allAppsHeading: (count: number) => string;
    maintenanceTitleFallback: string;
    maintenanceStatusPrefix: string;
    maintenanceMsgFallback: string;
    viewNotice: string;
    heroSectionAria: string;
    updatedPrefix: string;
    watchOn: (appName: string) => string;
    yourAppsTitle: string;
    yourAppsHint: string;
    moviesTitle: string;
    updatedToday: (time: string) => string;
    today: string;
    seriesSectionAria: string;
    seriesTitle: string;
    allPlatformsShort: string;
    noSeriesForPlatform: string;
  };
  live: {
    title: string;
    subtitle: string;
    refreshCatalog: string;
    allPlatforms: string;
    noValidForPlatform: string;
    showAllPlatforms: string;
    emptyInvalidSource: string;
    emptyNoSource: string;
    emptyInvalidSourceDesc: string;
    emptyNoSourceDesc: string;
    configureSource: string;
  };
  appsDrawer: {
    dialogAria: string;
    title: string;
    countNative: (count: number) => string;
    countWeb: (count: number) => string;
    pinModeActive: string;
    pinModeIdle: string;
    reload: string;
    closeAria: string;
    filterAll: string;
    filterTv: string;
    filterGames: string;
    pinInstruction: string;
    emptyCategory: string;
    seeAll: string;
    pinnedBadgeAria: string;
  };
  search: {
    dialogAria: string;
    placeholder: string;
    searchingCatalog: string;
    resultCount: (count: number) => string;
    keyboardBadge: string;
    clear: string;
    closeAria: string;
    tabAppsOnly: string;
    tabAll: string;
    tabApps: (count: number) => string;
    tabMedia: (count: number) => string;
    appsMatched: string;
    appsFrequent: string;
    kindGame: string;
    kindApp: string;
    mediaMatched: string;
    mediaTrending: string;
    kindSeries: string;
    kindMovie: string;
    directSearchHeading: string;
    noMatches: (query: string) => string;
    searchInYoutubeTitle: (q: string) => string;
    searchInYoutubeSubtitle: string;
    searchInAppTitle: (q: string, app: string) => string;
    searchInAppSubtitle: (app: string) => string;
    keyboard: {
      ariaLabel: string;
      backspaceAria: string;
      backspaceTitle: string;
      disableCaps: string;
      enableCaps: string;
      backToLetters: string;
      space: string;
      clearAria: string;
      submit: string;
      recentSearches: string;
    };
  };
  settings: {
    dialogAria: string;
    systemSettingsAria: string;
    systemSettingsTitle: string;
    notificationsAria: string;
    notificationsTitle: string;
    accountAria: string;
    accountTitle: string;
    tiles: {
      screensaver: string;
      inputs: string;
      picture: string;
      sound: string;
      wifi: string;
      bluetooth: string;
      timer: string;
      accessibility: string;
    };
    featured: {
      maintenanceTitle: string;
      maintenanceSubtitle: string;
      updateTitle: (version: string) => string;
      updateSubtitle: string;
      timerTitle: (mins: number) => string;
      timerSubtitle: string;
      prefsTitle: string;
      prefsSubtitle: (themeLabel: string, langLabel: string, version: string) => string;
    };
    languageCardTitle: string;
    languageCardSubtitle: (currentLang: string) => string;
    oledCardTitle: string;
    oledCardSubtitle: string;
    oledOn: string;
    oledOff: string;
    defaultLauncherTitle: string;
    defaultLauncherSubtitle: string;
    notificationsPanelTitle: string;
    newVersionLabel: (version: string) => string;
    checkUpdates: string;
    profilePanelTitle: string;
    languagePanelTitle: string;
    languagePanelHint: string;
    themeLabel: string;
    themeDark: string;
    themeLight: string;
    clockLabel: string;
    accountsTv: string;
    mainLauncher: string;
    appsOnly: string;
    yes: string;
    no: string;
    favoritesReset: string;
    checkOtaUpdates: string;
    footerSettings: string;
    presetNames: Record<string, string>;
  };
  updateModal: {
    title: string;
    currentVersion: (versionName: string, versionCode: number, isNative: boolean) => string;
    closeAria: string;
    checkingTitle: string;
    checkingDesc: string;
    upToDateTitle: string;
    upToDateDesc: (versionName: string) => string;
    availableBadge: string;
    optionalBadge: string;
    optionalNote: string;
    defaultNotes: string;
    openingInstaller: string;
    downloading: string;
    installPromptNote: string;
    permissionTitle: string;
    permissionDesc: string;
    downloadServer: string;
    repoLabel: string;
    save: string;
    openAndroidPermissions: string;
    updateNow: string;
    checkForUpdates: string;
    later: string;
    close: string;
  };
  maintenanceModal: {
    badge: string;
    defaultTitle: string;
    appsOnlyHeading: string;
    defaultMessage: string;
    explanation: string;
    acknowledgeBtn: string;
  };
  defaultLauncherModal: {
    badge: string;
    title: string;
    subtitle: (currentHomeName?: string) => string;
    steps: string[];
    openCurrentLauncherDetails: (currentHomeName?: string) => string;
    openTvAppsSettings: string;
    closeBtn: string;
  };
  screensaver: {
    nowPlayingPrefix: string;
  };
  app: {
    launchingExtended: string;
    launchingNormal: string;
    creatorAdminTitle: string;
    creatorAdminBtn: string;
    toast: {
      launchingWeb: (name: string, pkg: string) => string;
      notInstalled: (name: string, pkg: string) => string;
      openingSuggestionWeb: (title: string, app: string) => string;
      openingPlayStore: (app: string) => string;
      openFailed: (app: string) => string;
      favRemoved: (name: string) => string;
      favAdded: (name: string) => string;
      tvSectionNativeOnly: (label: string) => string;
      sleepTimerOff: string;
      sleepTimerSet: (mins: number) => string;
      downloadFailed: string;
      accessibilityNativeOnly: string;
      notificationsNativeOnly: string;
      languageChanged: (langName: string) => string;
      oledEnabled: string;
      oledDisabled: string;
      defaultLauncherAlready: string;
    };
    tvSections: Record<string, string>;
  };
}

export const TRANSLATIONS: Record<AppLanguage, LauncherTranslations> = {
  es: {
    languageSetup: {
      eyebrow: 'Configuración inicial · VORA TV OS',
      title: 'Elige tu idioma',
      subtitle: 'Selecciona el idioma principal de la interfaz. Podrás cambiarlo más tarde en Ajustes.',
      selectCta: 'Pulsa OK para continuar',
      remoteHint: 'Usa las flechas del control remoto y pulsa OK para confirmar',
    },
    topBar: {
      navAria: 'Navegación principal',
      home: 'Inicio',
      live: 'En vivo',
      apps: 'Aplicaciones',
      searchAria: 'Buscar aplicaciones y contenido',
      searchTitle: 'Buscar',
      toLightAria: 'Cambiar a modo día',
      toDarkAria: 'Cambiar a modo noche',
      lightTitle: 'Modo día',
      darkTitle: 'Modo noche',
      screensaverAria: 'Activar salvapantallas',
      screensaverTitle: 'Salvapantallas',
      updateAria: 'Nueva versión disponible para instalar',
      updateTitle: 'Nueva versión disponible',
      updateLabel: 'Actualizar',
      settingsAria: 'Ajustes del launcher',
      settingsTitle: 'Ajustes',
    },
    home: {
      appsOnlySectionAria: 'Tus aplicaciones fijadas',
      appsOnlyTitle: 'Modo solo apps',
      appsOnlyHint: 'Acceso directo a tus aplicaciones · Mantén pulsado OK con el mando para fijar favoritas',
      seeAll: 'Ver todas',
      allAppsHeading: (count) => `Todas tus aplicaciones (${count})`,
      maintenanceTitleFallback: 'Mantenimiento · Próxima actualización',
      maintenanceStatusPrefix: 'El modo solo apps está activado ·',
      maintenanceMsgFallback: 'Preparando la próxima actualización de VORA TV OS.',
      viewNotice: 'Ver aviso',
      heroSectionAria: 'Destacado de hoy',
      updatedPrefix: 'Actualizado',
      watchOn: (appName) => `Ver en ${appName}`,
      yourAppsTitle: 'Tus aplicaciones',
      yourAppsHint: 'Mantén pulsado OK con el mando para fijar o quitar de esta fila',
      moviesTitle: 'Estrenos y películas populares',
      updatedToday: (time) => `Actualizado hoy · ${time}`,
      today: 'Hoy',
      seriesSectionAria: 'En tus plataformas',
      seriesTitle: 'Series y emisiones en tus plataformas',
      allPlatformsShort: 'Todas',
      noSeriesForPlatform: 'Sin emisiones para esta plataforma · Ver todas',
    },
    live: {
      title: 'En vivo y emisiones',
      subtitle: 'Catálogo conectado a tu fuente externa o puente nativo para abrir directo en la app',
      refreshCatalog: 'Actualizar catálogo',
      allPlatforms: 'Todas las plataformas',
      noValidForPlatform: 'No hay emisiones válidas para esta plataforma en este momento.',
      showAllPlatforms: 'Ver todas las plataformas',
      emptyInvalidSource: 'Sin emisiones válidas en la fuente externa',
      emptyNoSource: 'Fuente de emisiones sin configurar',
      emptyInvalidSourceDesc: 'No se recibieron elementos con imagen válida desde la URL configurada.',
      emptyNoSourceDesc: 'Conecta una URL JSON/API o el puente nativo en Ajustes para mostrar emisiones aquí.',
      configureSource: 'Configurar fuente',
    },
    appsDrawer: {
      dialogAria: 'Todas las aplicaciones',
      title: 'Tus aplicaciones',
      countNative: (count) =>
        `${count} aplicaciones · Instaladas en tu TV · Mantén pulsado OK con el mando para fijar en Inicio`,
      countWeb: (count) =>
        `${count} aplicaciones · Mantén pulsado OK con el mando para fijar en Inicio`,
      pinModeActive: 'Terminar de fijar',
      pinModeIdle: 'Fijar en Inicio',
      reload: 'Recargar',
      closeAria: 'Volver al inicio',
      filterAll: 'Todas',
      filterTv: 'TV y Streaming',
      filterGames: 'Juegos',
      pinInstruction: 'Pulsa OK en cualquier icono para fijarlo o quitarlo de Inicio',
      emptyCategory: 'No hay aplicaciones en esta categoría',
      seeAll: 'Ver todas',
      pinnedBadgeAria: 'Fijada en Inicio',
    },
    search: {
      dialogAria: 'Buscador universal VORA',
      placeholder: 'Busca aplicaciones, películas, series o lo que quieras...',
      searchingCatalog: 'Buscando en catálogo...',
      resultCount: (count) => `${count} ${count === 1 ? 'resultado' : 'resultados'}`,
      keyboardBadge: 'Teclado VORA',
      clear: 'Limpiar',
      closeAria: 'Cerrar buscador',
      tabAppsOnly: 'Aplicaciones',
      tabAll: 'Todo',
      tabApps: (count) => `Apps (${count})`,
      tabMedia: (count) => `Películas y Series (${count})`,
      appsMatched: 'Aplicaciones y juegos',
      appsFrequent: 'Aplicaciones frecuentes',
      kindGame: 'Juego',
      kindApp: 'Aplicación',
      mediaMatched: 'Películas y series',
      mediaTrending: 'Tendencias de hoy',
      kindSeries: 'Serie',
      kindMovie: 'Película',
      directSearchHeading: 'Buscar directamente en',
      noMatches: (q) => `No hay coincidencias para "${q}" en esta pestaña.`,
      searchInYoutubeTitle: (q) => `Buscar "${q}" en YouTube`,
      searchInYoutubeSubtitle: 'Videos, trailers, música y directos en YouTube TV',
      searchInAppTitle: (q, app) => `Buscar "${q}" en ${app}`,
      searchInAppSubtitle: (app) => `Abrir búsqueda dentro de ${app}`,
      keyboard: {
        ariaLabel: 'Teclado en pantalla VORA',
        backspaceAria: 'Borrar carácter (mantén pulsado para limpiar)',
        backspaceTitle: 'Borrar (mantén OK para limpiar todo)',
        disableCaps: 'Desactivar mayúsculas',
        enableCaps: 'Activar mayúsculas',
        backToLetters: 'Volver a letras',
        space: 'Espacio',
        clearAria: 'Limpiar búsqueda',
        submit: 'Ir',
        recentSearches: 'Búsquedas recientes',
      },
    },
    settings: {
      dialogAria: 'Panel de configuración rápida de VORA TV OS',
      systemSettingsAria: 'Ajustes del sistema',
      systemSettingsTitle: 'Ajustes',
      notificationsAria: 'Notificaciones',
      notificationsTitle: 'Notificaciones',
      accountAria: 'Cuenta y perfil',
      accountTitle: 'Cuenta y perfil',
      tiles: {
        screensaver: 'Salvapantallas',
        inputs: 'Entradas',
        picture: 'Imagen',
        sound: 'Sonido',
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        timer: 'Temporizador',
        accessibility: 'Accesibilidad',
      },
      featured: {
        maintenanceTitle: 'Aviso de mantenimiento activo',
        maintenanceSubtitle: 'Modo solo apps habilitado temporalmente',
        updateTitle: (version) => `Actualización v${version}`.trim(),
        updateSubtitle: 'Nueva versión lista para instalar',
        timerTitle: (mins) => `Reposo programado · ${mins} min`,
        timerSubtitle: 'Salvapantallas automático al finalizar',
        prefsTitle: 'Preferencias de VORA TV OS',
        prefsSubtitle: (themeLabel, langLabel, version) =>
          `Tema ${themeLabel} · ${langLabel} · v${version}`,
      },
      languageCardTitle: 'Idioma · Language',
      languageCardSubtitle: (currentLang) => `Actual: ${currentLang} · Cambiar idioma del sistema`,
      oledCardTitle: 'Modo OLED',
      oledCardSubtitle: 'Negro puro #000000 para TV no-OLED · Atenúa grises',
      oledOn: 'Activado',
      oledOff: 'Desactivado',
      defaultLauncherTitle: 'Launcher predeterminado',
      defaultLauncherSubtitle: 'Fijar VORA TV OS como pantalla de inicio',
      notificationsPanelTitle: 'Avisos y estado del sistema',
      newVersionLabel: (version) => `Nueva versión v${version}`.trim(),
      checkUpdates: 'Buscar actualizaciones',
      profilePanelTitle: 'Perfil y apariencia',
      languagePanelTitle: 'Idioma de la interfaz',
      languagePanelHint: 'El cambio se aplica al instante en toda la pantalla',
      themeLabel: 'Tema',
      themeDark: 'Noche',
      themeLight: 'Día',
      clockLabel: 'Reloj',
      accountsTv: 'Cuentas TV',
      mainLauncher: 'Launcher principal',
      appsOnly: 'Solo apps',
      yes: 'Sí',
      no: 'No',
      favoritesReset: 'Favoritos',
      checkOtaUpdates: 'Buscar actualizaciones OTA',
      footerSettings: 'Ajustes',
      presetNames: {
        'gtv-cinema': 'Google TV Día / Cine',
        'gtv-midnight': 'Azul Sereno',
        'pure-oled': 'Negro OLED / Piedra',
        'warm-graphite': 'Grafito / Arena Mate',
        'emerald-slate': 'Pizarra / Salvia Mineral',
        'cobalt-night': 'Horizonte Cobalto',
      },
    },
    updateModal: {
      title: 'Actualización de la app',
      currentVersion: (versionName, versionCode, isNative) =>
        `Versión actual: v${versionName} (Build ${versionCode}) ${isNative ? '· Android TV' : '· Web'}`,
      closeAria: 'Cerrar ventana',
      checkingTitle: 'Comprobando versión...',
      checkingDesc: 'Buscando si hay una nueva versión disponible para tu TV',
      upToDateTitle: 'Tu aplicación está actualizada',
      upToDateDesc: (versionName) => `Tienes instalada la versión más reciente (v${versionName}).`,
      availableBadge: 'Nueva actualización disponible',
      optionalBadge: 'No es obligatoria',
      optionalNote:
        'Actualización opcional: puedes omitirla si prefieres, pero esto podría mejorar tu calidad del launcher.',
      defaultNotes:
        '• Mejoras de fluidez y estabilidad en Android TV.\n• Corrección de errores y nueva experiencia en tu televisor.',
      openingInstaller: 'Abriendo instalador del sistema...',
      downloading: 'Descargando actualización...',
      installPromptNote:
        'Al finalizar la descarga se abrirá el instalador de Android TV automáticamente.',
      permissionTitle: 'Permiso necesario en Android TV',
      permissionDesc:
        'Para instalar la actualización, activa el permiso "Instalar aplicaciones desconocidas" para VORA TV OS en los ajustes de tu TV.',
      downloadServer: 'Servidor de descargas',
      repoLabel: 'Repositorio o servidor de compilación (opcional):',
      save: 'Guardar',
      openAndroidPermissions: 'Abrir permisos de Android',
      updateNow: 'Actualizar ahora',
      checkForUpdates: 'Buscar actualizaciones',
      later: 'Más tarde',
      close: 'Cerrar',
    },
    maintenanceModal: {
      badge: 'Aviso obligatorio del sistema',
      defaultTitle: 'Mantenimiento · Próxima actualización',
      appsOnlyHeading: 'El modo solo apps será activado',
      defaultMessage:
        'El modo solo apps será activado mientras preparamos la próxima actualización de VORA TV OS.',
      explanation:
        'Durante este periodo permanecerán visibles únicamente tus aplicaciones instaladas, búsqueda y ajustes. Cuando termine el mantenimiento, las recomendaciones volverán automáticamente.',
      acknowledgeBtn: 'Entendido · Activar modo solo apps',
    },
    defaultLauncherModal: {
      badge: 'Pantalla de inicio · Android TV',
      title: 'Fijar VORA TV OS como launcher predeterminado',
      subtitle: (currentHomeName) =>
        currentHomeName
          ? `Tu televisor usa actualmente "${currentHomeName}" como inicio y bloquea el cambio automático.`
          : 'Tu televisor bloquea el selector directo de inicio. Sigue estos pasos sin salir de VORA:',
      steps: [
        '1. Abre Ajustes de aplicaciones o los detalles del launcher actual.',
        '2. Entra en "Abrir de forma predeterminada" y pulsa "Borrar valores predeterminados".',
        '3. Pulsa el botón Inicio (Home) del control y elige "VORA TV OS · Siempre".',
      ],
      openCurrentLauncherDetails: (currentHomeName) =>
        currentHomeName ? `Ajustes de ${currentHomeName}` : 'Detalles del launcher actual',
      openTvAppsSettings: 'Abrir Ajustes de aplicaciones',
      closeBtn: 'Volver a VORA TV OS',
    },
    screensaver: {
      nowPlayingPrefix: 'Estás escuchando:',
    },
    app: {
      launchingExtended: 'Cargando aplicación, espera un momento...',
      launchingNormal: 'Abriendo aplicación...',
      creatorAdminTitle: 'Panel de Control del Creador (Solo PC - Atajo: Ctrl+Shift+A)',
      creatorAdminBtn: 'Panel Creador (PC)',
      toast: {
        launchingWeb: (name, pkg) => `Iniciando ${name} (${pkg}) en Android TV`,
        notInstalled: (name, pkg) => `${name} (${pkg}) no está instalada en este TV.`,
        openingSuggestionWeb: (title, app) => `Abriendo "${title}" en ${app}`,
        openingPlayStore: (app) => `Abriendo Play Store para instalar ${app}`,
        openFailed: (app) => `No se pudo abrir ${app}`,
        favRemoved: (name) => `${name} quitada de Tus aplicaciones`,
        favAdded: (name) => `${name} fijada en Tus aplicaciones`,
        tvSectionNativeOnly: (label) => `${label} · Disponible en Android TV`,
        sleepTimerOff: 'Temporizador desactivado',
        sleepTimerSet: (mins) => `Temporizador: ${mins} min para reposo`,
        downloadFailed: 'Falló la descarga o instalación de la app.',
        accessibilityNativeOnly: 'Accesibilidad · Disponible en Android TV',
        notificationsNativeOnly: 'Notificaciones · Disponible en Android TV',
        languageChanged: (langName) => `Idioma actualizado a ${langName}`,
        oledEnabled: 'Modo OLED activado · Negro puro #000000',
        oledDisabled: 'Modo OLED desactivado',
        defaultLauncherAlready: 'VORA TV OS ya está fijado como launcher predeterminado',
      },
      tvSections: {
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        display: 'Imagen y pantalla',
        sound: 'Sonido',
        inputs: 'Entradas HDMI / TV',
        accessibility: 'Accesibilidad',
        account: 'Cuenta y perfil',
        screensaver: 'Salvapantallas del sistema',
        home: 'Selector de launcher predeterminado',
        apps: 'Aplicaciones del sistema',
        app_details: 'Detalles de aplicación',
        unknown_sources: 'Orígenes desconocidos',
        settings: 'Ajustes de Android TV',
      },
    },
  },

  en: {
    languageSetup: {
      eyebrow: 'Initial setup · VORA TV OS',
      title: 'Choose your language',
      subtitle: 'Select the primary interface language. You can change it later in Settings.',
      selectCta: 'Press OK to continue',
      remoteHint: 'Use the remote arrows and press OK to confirm',
    },
    topBar: {
      navAria: 'Main navigation',
      home: 'Home',
      live: 'Live',
      apps: 'Apps',
      searchAria: 'Search apps and content',
      searchTitle: 'Search',
      toLightAria: 'Switch to light mode',
      toDarkAria: 'Switch to dark mode',
      lightTitle: 'Light mode',
      darkTitle: 'Dark mode',
      screensaverAria: 'Start screensaver',
      screensaverTitle: 'Screensaver',
      updateAria: 'New version available to install',
      updateTitle: 'New version available',
      updateLabel: 'Update',
      settingsAria: 'Launcher settings',
      settingsTitle: 'Settings',
    },
    home: {
      appsOnlySectionAria: 'Your pinned apps',
      appsOnlyTitle: 'Apps only mode',
      appsOnlyHint: 'Direct access to your apps · Hold OK on your remote to pin favorites',
      seeAll: 'See all',
      allAppsHeading: (count) => `All your apps (${count})`,
      maintenanceTitleFallback: 'Maintenance · Upcoming update',
      maintenanceStatusPrefix: 'Apps only mode is active ·',
      maintenanceMsgFallback: 'Preparing the next VORA TV OS update.',
      viewNotice: 'View notice',
      heroSectionAria: 'Featured today',
      updatedPrefix: 'Updated',
      watchOn: (appName) => `Watch on ${appName}`,
      yourAppsTitle: 'Your apps',
      yourAppsHint: 'Hold OK on your remote to pin or unpin from this row',
      moviesTitle: 'New releases & popular movies',
      updatedToday: (time) => `Updated today · ${time}`,
      today: 'Today',
      seriesSectionAria: 'On your platforms',
      seriesTitle: 'Series & shows across your platforms',
      allPlatformsShort: 'All',
      noSeriesForPlatform: 'No shows for this platform · See all',
    },
    live: {
      title: 'Live & broadcasts',
      subtitle: 'Catalog connected to your external feed or native bridge to open straight in the app',
      refreshCatalog: 'Refresh catalog',
      allPlatforms: 'All platforms',
      noValidForPlatform: 'No valid broadcasts available for this platform right now.',
      showAllPlatforms: 'Show all platforms',
      emptyInvalidSource: 'No valid broadcasts in external feed',
      emptyNoSource: 'Broadcast feed not configured',
      emptyInvalidSourceDesc: 'No items with valid artwork were received from the configured URL.',
      emptyNoSourceDesc: 'Connect a JSON/API URL or the native bridge in Settings to show broadcasts here.',
      configureSource: 'Configure feed',
    },
    appsDrawer: {
      dialogAria: 'All apps',
      title: 'Your apps',
      countNative: (count) =>
        `${count} apps · Installed on your TV · Hold OK on your remote to pin to Home`,
      countWeb: (count) =>
        `${count} apps · Hold OK on your remote to pin to Home`,
      pinModeActive: 'Done pinning',
      pinModeIdle: 'Pin to Home',
      reload: 'Reload',
      closeAria: 'Back to home',
      filterAll: 'All',
      filterTv: 'TV & Streaming',
      filterGames: 'Games',
      pinInstruction: 'Press OK on any icon to pin or remove it from Home',
      emptyCategory: 'No apps in this category',
      seeAll: 'See all',
      pinnedBadgeAria: 'Pinned to Home',
    },
    search: {
      dialogAria: 'VORA universal search',
      placeholder: 'Search apps, movies, series, or anything...',
      searchingCatalog: 'Searching catalog...',
      resultCount: (count) => `${count} ${count === 1 ? 'result' : 'results'}`,
      keyboardBadge: 'VORA Keyboard',
      clear: 'Clear',
      closeAria: 'Close search',
      tabAppsOnly: 'Apps',
      tabAll: 'All',
      tabApps: (count) => `Apps (${count})`,
      tabMedia: (count) => `Movies & Series (${count})`,
      appsMatched: 'Apps & games',
      appsFrequent: 'Frequent apps',
      kindGame: 'Game',
      kindApp: 'App',
      mediaMatched: 'Movies & series',
      mediaTrending: 'Trending today',
      kindSeries: 'Series',
      kindMovie: 'Movie',
      directSearchHeading: 'Search directly on',
      noMatches: (q) => `No matches for "${q}" in this tab.`,
      searchInYoutubeTitle: (q) => `Search "${q}" on YouTube`,
      searchInYoutubeSubtitle: 'Videos, trailers, music & live streams on YouTube TV',
      searchInAppTitle: (q, app) => `Search "${q}" on ${app}`,
      searchInAppSubtitle: (app) => `Open search inside ${app}`,
      keyboard: {
        ariaLabel: 'VORA on-screen keyboard',
        backspaceAria: 'Delete character (hold to clear all)',
        backspaceTitle: 'Delete (hold OK to clear all)',
        disableCaps: 'Turn off uppercase',
        enableCaps: 'Turn on uppercase',
        backToLetters: 'Back to letters',
        space: 'Space',
        clearAria: 'Clear search',
        submit: 'Go',
        recentSearches: 'Recent searches',
      },
    },
    settings: {
      dialogAria: 'VORA TV OS quick settings panel',
      systemSettingsAria: 'System settings',
      systemSettingsTitle: 'Settings',
      notificationsAria: 'Notifications',
      notificationsTitle: 'Notifications',
      accountAria: 'Account & profile',
      accountTitle: 'Account & profile',
      tiles: {
        screensaver: 'Screensaver',
        inputs: 'Inputs',
        picture: 'Picture',
        sound: 'Sound',
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        timer: 'Sleep timer',
        accessibility: 'Accessibility',
      },
      featured: {
        maintenanceTitle: 'Maintenance notice active',
        maintenanceSubtitle: 'Apps only mode temporarily enabled',
        updateTitle: (version) => `Update v${version}`.trim(),
        updateSubtitle: 'New version ready to install',
        timerTitle: (mins) => `Sleep timer · ${mins} min`,
        timerSubtitle: 'Screensaver starts automatically when finished',
        prefsTitle: 'VORA TV OS Preferences',
        prefsSubtitle: (themeLabel, langLabel, version) =>
          `${themeLabel} theme · ${langLabel} · v${version}`,
      },
      languageCardTitle: 'Language · Idioma',
      languageCardSubtitle: (currentLang) => `Current: ${currentLang} · Change interface language`,
      oledCardTitle: 'OLED Mode',
      oledCardSubtitle: 'Pure black #000000 for non-OLED TVs · Dims grays',
      oledOn: 'On',
      oledOff: 'Off',
      defaultLauncherTitle: 'Default launcher',
      defaultLauncherSubtitle: 'Set VORA TV OS as your home screen',
      notificationsPanelTitle: 'System notices & status',
      newVersionLabel: (version) => `New version v${version}`.trim(),
      checkUpdates: 'Check for updates',
      profilePanelTitle: 'Profile & appearance',
      languagePanelTitle: 'Interface language',
      languagePanelHint: 'Changes apply immediately across the entire interface',
      themeLabel: 'Theme',
      themeDark: 'Dark',
      themeLight: 'Light',
      clockLabel: 'Clock',
      accountsTv: 'TV Accounts',
      mainLauncher: 'Home launcher',
      appsOnly: 'Apps only',
      yes: 'Yes',
      no: 'No',
      favoritesReset: 'Favorites',
      checkOtaUpdates: 'Check OTA updates',
      footerSettings: 'Settings',
      presetNames: {
        'gtv-cinema': 'Cinema / Daylight',
        'gtv-midnight': 'Serene Blue',
        'pure-oled': 'OLED Black / Stone',
        'warm-graphite': 'Graphite / Matte Sand',
        'emerald-slate': 'Slate / Mineral Sage',
        'cobalt-night': 'Cobalt Horizon',
      },
    },
    updateModal: {
      title: 'App update',
      currentVersion: (versionName, versionCode, isNative) =>
        `Current version: v${versionName} (Build ${versionCode}) ${isNative ? '· Android TV' : '· Web'}`,
      closeAria: 'Close window',
      checkingTitle: 'Checking version...',
      checkingDesc: 'Looking for a newer release available for your TV',
      upToDateTitle: 'Your app is up to date',
      upToDateDesc: (versionName) => `You already have the latest version installed (v${versionName}).`,
      availableBadge: 'New update available',
      optionalBadge: 'Optional',
      optionalNote:
        'Optional update: you can skip it if you prefer, though updating can improve launcher performance.',
      defaultNotes:
        '• Smoother animations and stability improvements on Android TV.\n• Bug fixes and refinements for your television.',
      openingInstaller: 'Opening system installer...',
      downloading: 'Downloading update...',
      installPromptNote:
        'Once the download finishes, the Android TV installer will open automatically.',
      permissionTitle: 'Permission needed on Android TV',
      permissionDesc:
        'To install updates, enable "Install unknown apps" for VORA TV OS in your TV settings.',
      downloadServer: 'Download server',
      repoLabel: 'Repository or build server (optional):',
      save: 'Save',
      openAndroidPermissions: 'Open Android permissions',
      updateNow: 'Update now',
      checkForUpdates: 'Check for updates',
      later: 'Later',
      close: 'Close',
    },
    maintenanceModal: {
      badge: 'Mandatory system notice',
      defaultTitle: 'Maintenance · Upcoming update',
      appsOnlyHeading: 'Apps only mode will be enabled',
      defaultMessage:
        'Apps only mode will be enabled while we prepare the next VORA TV OS update.',
      explanation:
        'During this time only your installed apps, search, and settings will remain visible. Recommendations will automatically return once maintenance finishes.',
      acknowledgeBtn: 'Got it · Enable apps only mode',
    },
    defaultLauncherModal: {
      badge: 'Home screen · Android TV',
      title: 'Set VORA TV OS as default launcher',
      subtitle: (currentHomeName) =>
        currentHomeName
          ? `Your TV currently uses "${currentHomeName}" as Home and restricts automatic switching.`
          : 'Your TV restricts the direct Home picker. Follow these steps without leaving VORA:',
      steps: [
        '1. Open Apps settings or the current launcher app details.',
        '2. Go to "Open by default" and select "Clear defaults".',
        '3. Press the Home button on your remote and choose "VORA TV OS · Always".',
      ],
      openCurrentLauncherDetails: (currentHomeName) =>
        currentHomeName ? `${currentHomeName} app info` : 'Current launcher app info',
      openTvAppsSettings: 'Open TV Apps settings',
      closeBtn: 'Back to VORA TV OS',
    },
    screensaver: {
      nowPlayingPrefix: 'Now playing:',
    },
    app: {
      launchingExtended: 'Loading app, please wait a moment...',
      launchingNormal: 'Opening app...',
      creatorAdminTitle: 'Creator Control Panel (PC Only - Shortcut: Ctrl+Shift+A)',
      creatorAdminBtn: 'Creator Panel (PC)',
      toast: {
        launchingWeb: (name, pkg) => `Launching ${name} (${pkg}) on Android TV`,
        notInstalled: (name, pkg) => `${name} (${pkg}) is not installed on this TV.`,
        openingSuggestionWeb: (title, app) => `Opening "${title}" in ${app}`,
        openingPlayStore: (app) => `Opening Play Store to install ${app}`,
        openFailed: (app) => `Could not open ${app}`,
        favRemoved: (name) => `${name} removed from Your apps`,
        favAdded: (name) => `${name} pinned to Your apps`,
        tvSectionNativeOnly: (label) => `${label} · Available on Android TV`,
        sleepTimerOff: 'Sleep timer off',
        sleepTimerSet: (mins) => `Sleep timer: ${mins} min`,
        downloadFailed: 'App download or installation failed.',
        accessibilityNativeOnly: 'Accessibility · Available on Android TV',
        notificationsNativeOnly: 'Notifications · Available on Android TV',
        languageChanged: (langName) => `Language changed to ${langName}`,
        oledEnabled: 'OLED Mode enabled · Pure black #000000',
        oledDisabled: 'OLED Mode disabled',
        defaultLauncherAlready: 'VORA TV OS is already your default launcher',
      },
      tvSections: {
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        display: 'Picture & display',
        sound: 'Sound',
        inputs: 'HDMI / TV inputs',
        accessibility: 'Accessibility',
        account: 'Account & profile',
        screensaver: 'System screensaver',
        home: 'Default launcher picker',
        apps: 'System apps',
        app_details: 'App info',
        unknown_sources: 'Unknown sources',
        settings: 'Android TV settings',
      },
    },
  },

  pt: {
    languageSetup: {
      eyebrow: 'Configuração inicial · VORA TV OS',
      title: 'Escolha seu idioma',
      subtitle: 'Selecione o idioma principal da interface. Você poderá alterá-lo depois nas Configurações.',
      selectCta: 'Pressione OK para continuar',
      remoteHint: 'Use as setas do controle remoto e pressione OK para confirmar',
    },
    topBar: {
      navAria: 'Navegação principal',
      home: 'Início',
      live: 'Ao vivo',
      apps: 'Aplicativos',
      searchAria: 'Buscar aplicativos e conteúdo',
      searchTitle: 'Buscar',
      toLightAria: 'Mudar para modo claro',
      toDarkAria: 'Mudar para modo escuro',
      lightTitle: 'Modo claro',
      darkTitle: 'Modo escuro',
      screensaverAria: 'Ativar protetor de tela',
      screensaverTitle: 'Protetor de tela',
      updateAria: 'Nova versão disponível para instalar',
      updateTitle: 'Nova versão disponível',
      updateLabel: 'Atualizar',
      settingsAria: 'Configurações do launcher',
      settingsTitle: 'Configurações',
    },
    home: {
      appsOnlySectionAria: 'Seus aplicativos fixados',
      appsOnlyTitle: 'Modo apenas apps',
      appsOnlyHint: 'Acesso direto aos seus apps · Segure OK no controle para fixar favoritos',
      seeAll: 'Ver todos',
      allAppsHeading: (count) => `Todos os seus aplicativos (${count})`,
      maintenanceTitleFallback: 'Manutenção · Próxima atualização',
      maintenanceStatusPrefix: 'O modo apenas apps está ativado ·',
      maintenanceMsgFallback: 'Preparando a próxima atualização do VORA TV OS.',
      viewNotice: 'Ver aviso',
      heroSectionAria: 'Destaque de hoje',
      updatedPrefix: 'Atualizado',
      watchOn: (appName) => `Assistir no ${appName}`,
      yourAppsTitle: 'Seus aplicativos',
      yourAppsHint: 'Segure OK no controle para fixar ou remover desta fila',
      moviesTitle: 'Estreias e filmes populares',
      updatedToday: (time) => `Atualizado hoje · ${time}`,
      today: 'Hoje',
      seriesSectionAria: 'Nas suas plataformas',
      seriesTitle: 'Séries e programas nas suas plataformas',
      allPlatformsShort: 'Todas',
      noSeriesForPlatform: 'Sem transmissões para esta plataforma · Ver todas',
    },
    live: {
      title: 'Ao vivo e transmissões',
      subtitle: 'Catálogo conectado à sua fonte externa ou ponte nativa para abrir direto no app',
      refreshCatalog: 'Atualizar catálogo',
      allPlatforms: 'Todas as plataformas',
      noValidForPlatform: 'Não há transmissões válidas para esta plataforma no momento.',
      showAllPlatforms: 'Ver todas as plataformas',
      emptyInvalidSource: 'Sem transmissões válidas na fonte externa',
      emptyNoSource: 'Fonte de transmissões não configurada',
      emptyInvalidSourceDesc: 'Nenhum item com imagem válida foi recebido da URL configurada.',
      emptyNoSourceDesc: 'Conecte uma URL JSON/API ou a ponte nativa em Configurações para exibir aqui.',
      configureSource: 'Configurar fonte',
    },
    appsDrawer: {
      dialogAria: 'Todos os aplicativos',
      title: 'Seus aplicativos',
      countNative: (count) =>
        `${count} aplicativos · Instalados na sua TV · Segure OK no controle para fixar no Início`,
      countWeb: (count) =>
        `${count} aplicativos · Segure OK no controle para fixar no Início`,
      pinModeActive: 'Concluir fixação',
      pinModeIdle: 'Fixar no Início',
      reload: 'Recarregar',
      closeAria: 'Voltar ao início',
      filterAll: 'Todos',
      filterTv: 'TV e Streaming',
      filterGames: 'Jogos',
      pinInstruction: 'Pressione OK em qualquer ícone para fixar ou remover do Início',
      emptyCategory: 'Não há aplicativos nesta categoria',
      seeAll: 'Ver todos',
      pinnedBadgeAria: 'Fixado no Início',
    },
    search: {
      dialogAria: 'Busca universal VORA',
      placeholder: 'Busque aplicativos, filmes, séries ou o que quiser...',
      searchingCatalog: 'Buscando no catálogo...',
      resultCount: (count) => `${count} ${count === 1 ? 'resultado' : 'resultados'}`,
      keyboardBadge: 'Teclado VORA',
      clear: 'Limpar',
      closeAria: 'Fechar busca',
      tabAppsOnly: 'Aplicativos',
      tabAll: 'Tudo',
      tabApps: (count) => `Apps (${count})`,
      tabMedia: (count) => `Filmes e Séries (${count})`,
      appsMatched: 'Aplicativos e jogos',
      appsFrequent: 'Aplicativos frequentes',
      kindGame: 'Jogo',
      kindApp: 'Aplicativo',
      mediaMatched: 'Filmes e séries',
      mediaTrending: 'Em alta hoje',
      kindSeries: 'Série',
      kindMovie: 'Filme',
      directSearchHeading: 'Buscar diretamente em',
      noMatches: (q) => `Nenhum resultado para "${q}" nesta aba.`,
      searchInYoutubeTitle: (q) => `Buscar "${q}" no YouTube`,
      searchInYoutubeSubtitle: 'Vídeos, trailers, músicas e transmissões no YouTube TV',
      searchInAppTitle: (q, app) => `Buscar "${q}" no ${app}`,
      searchInAppSubtitle: (app) => `Abrir busca dentro de ${app}`,
      keyboard: {
        ariaLabel: 'Teclado na tela VORA',
        backspaceAria: 'Apagar caractere (segure para limpar tudo)',
        backspaceTitle: 'Apagar (segure OK para limpar tudo)',
        disableCaps: 'Desativar maiúsculas',
        enableCaps: 'Ativar maiúsculas',
        backToLetters: 'Voltar para letras',
        space: 'Espaço',
        clearAria: 'Limpar busca',
        submit: 'Ir',
        recentSearches: 'Buscas recentes',
      },
    },
    settings: {
      dialogAria: 'Painel de configurações rápidas do VORA TV OS',
      systemSettingsAria: 'Configurações do sistema',
      systemSettingsTitle: 'Configurações',
      notificationsAria: 'Notificações',
      notificationsTitle: 'Notificações',
      accountAria: 'Conta e perfil',
      accountTitle: 'Conta e perfil',
      tiles: {
        screensaver: 'Protetor',
        inputs: 'Entradas',
        picture: 'Imagem',
        sound: 'Som',
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        timer: 'Temporizador',
        accessibility: 'Acessibilidade',
      },
      featured: {
        maintenanceTitle: 'Aviso de manutenção ativo',
        maintenanceSubtitle: 'Modo apenas apps ativado temporariamente',
        updateTitle: (version) => `Atualização v${version}`.trim(),
        updateSubtitle: 'Nova versão pronta para instalar',
        timerTitle: (mins) => `Repouso agendado · ${mins} min`,
        timerSubtitle: 'Protetor de tela automático ao finalizar',
        prefsTitle: 'Preferências do VORA TV OS',
        prefsSubtitle: (themeLabel, langLabel, version) =>
          `Tema ${themeLabel} · ${langLabel} · v${version}`,
      },
      languageCardTitle: 'Idioma · Language',
      languageCardSubtitle: (currentLang) => `Atual: ${currentLang} · Alterar idioma da interface`,
      oledCardTitle: 'Modo OLED',
      oledCardSubtitle: 'Preto puro #000000 para TV não-OLED · Atenua cinzas',
      oledOn: 'Ativado',
      oledOff: 'Desativado',
      defaultLauncherTitle: 'Launcher padrão',
      defaultLauncherSubtitle: 'Definir VORA TV OS como tela inicial',
      notificationsPanelTitle: 'Avisos e status do sistema',
      newVersionLabel: (version) => `Nova versão v${version}`.trim(),
      checkUpdates: 'Buscar atualizações',
      profilePanelTitle: 'Perfil e aparência',
      languagePanelTitle: 'Idioma da interface',
      languagePanelHint: 'A alteração é aplicada imediatamente em toda a tela',
      themeLabel: 'Tema',
      themeDark: 'Escuro',
      themeLight: 'Claro',
      clockLabel: 'Relógio',
      accountsTv: 'Contas da TV',
      mainLauncher: 'Launcher principal',
      appsOnly: 'Apenas apps',
      yes: 'Sim',
      no: 'Não',
      favoritesReset: 'Favoritos',
      checkOtaUpdates: 'Buscar atualizações OTA',
      footerSettings: 'Configurações',
      presetNames: {
        'gtv-cinema': 'Cinema / Dia',
        'gtv-midnight': 'Azul Sereno',
        'pure-oled': 'Preto OLED / Pedra',
        'warm-graphite': 'Grafite / Areia Fosca',
        'emerald-slate': 'Ardósia / Sálvia Mineral',
        'cobalt-night': 'Horizonte Cobalto',
      },
    },
    updateModal: {
      title: 'Atualização do app',
      currentVersion: (versionName, versionCode, isNative) =>
        `Versão atual: v${versionName} (Build ${versionCode}) ${isNative ? '· Android TV' : '· Web'}`,
      closeAria: 'Fechar janela',
      checkingTitle: 'Verificando versão...',
      checkingDesc: 'Procurando uma nova versão disponível para sua TV',
      upToDateTitle: 'Seu aplicativo está atualizado',
      upToDateDesc: (versionName) => `Você já possui a versão mais recente (v${versionName}).`,
      availableBadge: 'Nova atualização disponível',
      optionalBadge: 'Opcional',
      optionalNote:
        'Atualização opcional: você pode pular se preferir, mas ela pode melhorar a fluidez do launcher.',
      defaultNotes:
        '• Melhorias de fluidez e estabilidade na Android TV.\n• Correções de erros e nova experiência na sua TV.',
      openingInstaller: 'Abrindo instalador do sistema...',
      downloading: 'Baixando atualização...',
      installPromptNote:
        'Ao terminar o download, o instalador da Android TV será aberto automaticamente.',
      permissionTitle: 'Permissão necessária na Android TV',
      permissionDesc:
        'Para instalar a atualização, ative a permissão "Instalar apps desconhecidos" para o VORA TV OS nas configurações da TV.',
      downloadServer: 'Servidor de downloads',
      repoLabel: 'Repositório ou servidor de compilação (opcional):',
      save: 'Salvar',
      openAndroidPermissions: 'Abrir permissões do Android',
      updateNow: 'Atualizar agora',
      checkForUpdates: 'Buscar atualizações',
      later: 'Mais tarde',
      close: 'Fechar',
    },
    maintenanceModal: {
      badge: 'Aviso obrigatório do sistema',
      defaultTitle: 'Manutenção · Próxima atualização',
      appsOnlyHeading: 'O modo apenas apps será ativado',
      defaultMessage:
        'O modo apenas apps será ativado enquanto preparamos a próxima atualização do VORA TV OS.',
      explanation:
        'Durante esse período permanecerão visíveis apenas seus aplicativos instalados, busca e configurações. Quando a manutenção terminar, as recomendações voltarão automaticamente.',
      acknowledgeBtn: 'Entendi · Ativar modo apenas apps',
    },
    defaultLauncherModal: {
      badge: 'Tela inicial · Android TV',
      title: 'Definir VORA TV OS como launcher padrão',
      subtitle: (currentHomeName) =>
        currentHomeName
          ? `Sua TV usa atualmente "${currentHomeName}" como tela inicial e bloqueia a troca automática.`
          : 'Sua TV bloqueia o seletor direto. Siga estes passos sem sair do VORA:',
      steps: [
        '1. Abra Configurações de aplicativos ou detalhes do launcher atual.',
        '2. Entre em "Abrir por padrão" e toque em "Limpar padrões".',
        '3. Pressione o botão Início (Home) do controle e escolha "VORA TV OS · Sempre".',
      ],
      openCurrentLauncherDetails: (currentHomeName) =>
        currentHomeName ? `Detalhes de ${currentHomeName}` : 'Detalhes do launcher atual',
      openTvAppsSettings: 'Abrir Configurações de apps',
      closeBtn: 'Voltar ao VORA TV OS',
    },
    screensaver: {
      nowPlayingPrefix: 'Tocando agora:',
    },
    app: {
      launchingExtended: 'Carregando aplicativo, aguarde um momento...',
      launchingNormal: 'Abrindo aplicativo...',
      creatorAdminTitle: 'Painel de Controle do Criador (Somente PC - Atalho: Ctrl+Shift+A)',
      creatorAdminBtn: 'Painel Criador (PC)',
      toast: {
        launchingWeb: (name, pkg) => `Iniciando ${name} (${pkg}) na Android TV`,
        notInstalled: (name, pkg) => `${name} (${pkg}) não está instalado nesta TV.`,
        openingSuggestionWeb: (title, app) => `Abrindo "${title}" no ${app}`,
        openingPlayStore: (app) => `Abrindo Play Store para instalar ${app}`,
        openFailed: (app) => `Não foi possível abrir ${app}`,
        favRemoved: (name) => `${name} removido de Seus aplicativos`,
        favAdded: (name) => `${name} fixado em Seus aplicativos`,
        tvSectionNativeOnly: (label) => `${label} · Disponível na Android TV`,
        sleepTimerOff: 'Temporizador desativado',
        sleepTimerSet: (mins) => `Temporizador: ${mins} min para repouso`,
        downloadFailed: 'Falha no download ou instalação do app.',
        accessibilityNativeOnly: 'Acessibilidade · Disponível na Android TV',
        notificationsNativeOnly: 'Notificações · Disponível na Android TV',
        languageChanged: (langName) => `Idioma alterado para ${langName}`,
        oledEnabled: 'Modo OLED ativado · Preto puro #000000',
        oledDisabled: 'Modo OLED desativado',
        defaultLauncherAlready: 'VORA TV OS já está definido como launcher padrão',
      },
      tvSections: {
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        display: 'Imagem e tela',
        sound: 'Som',
        inputs: 'Entradas HDMI / TV',
        accessibility: 'Acessibilidade',
        account: 'Conta e perfil',
        screensaver: 'Protetor de tela do sistema',
        home: 'Seletor de launcher padrão',
        apps: 'Aplicativos do sistema',
        app_details: 'Detalhes do aplicativo',
        unknown_sources: 'Fontes desconhecidas',
        settings: 'Configurações da Android TV',
      },
    },
  },

  fr: {
    languageSetup: {
      eyebrow: 'Configuration initiale · VORA TV OS',
      title: 'Choisissez votre langue',
      subtitle: 'Sélectionnez la langue principale de l’interface. Vous pourrez la modifier dans les Paramètres.',
      selectCta: 'Appuyez sur OK pour continuer',
      remoteHint: 'Utilisez les flèches de la télécommande et appuyez sur OK pour confirmer',
    },
    topBar: {
      navAria: 'Navigation principale',
      home: 'Accueil',
      live: 'En direct',
      apps: 'Applications',
      searchAria: 'Rechercher des applications et du contenu',
      searchTitle: 'Rechercher',
      toLightAria: 'Passer en mode jour',
      toDarkAria: 'Passer en mode nuit',
      lightTitle: 'Mode jour',
      darkTitle: 'Mode nuit',
      screensaverAria: 'Lancer l’écran de veille',
      screensaverTitle: 'Écran de veille',
      updateAria: 'Nouvelle version disponible à installer',
      updateTitle: 'Nouvelle version disponible',
      updateLabel: 'Mettre à jour',
      settingsAria: 'Paramètres du lanceur',
      settingsTitle: 'Paramètres',
    },
    home: {
      appsOnlySectionAria: 'Vos applications épinglées',
      appsOnlyTitle: 'Mode applications uniquement',
      appsOnlyHint: 'Accès direct à vos apps · Maintenez OK sur la télécommande pour épingler',
      seeAll: 'Tout voir',
      allAppsHeading: (count) => `Toutes vos applications (${count})`,
      maintenanceTitleFallback: 'Maintenance · Prochaine mise à jour',
      maintenanceStatusPrefix: 'Le mode applications uniquement est activé ·',
      maintenanceMsgFallback: 'Préparation de la prochaine mise à jour de VORA TV OS.',
      viewNotice: 'Voir l’avis',
      heroSectionAria: 'À la une aujourd’hui',
      updatedPrefix: 'Mis à jour',
      watchOn: (appName) => `Regarder sur ${appName}`,
      yourAppsTitle: 'Vos applications',
      yourAppsHint: 'Maintenez OK sur la télécommande pour épingler ou retirer de cette ligne',
      moviesTitle: 'Sorties et films populaires',
      updatedToday: (time) => `Mis à jour aujourd’hui · ${time}`,
      today: 'Aujourd’hui',
      seriesSectionAria: 'Sur vos plateformes',
      seriesTitle: 'Séries et programmes sur vos plateformes',
      allPlatformsShort: 'Toutes',
      noSeriesForPlatform: 'Aucune émission pour cette plateforme · Tout voir',
    },
    live: {
      title: 'En direct et programmes',
      subtitle: 'Catalogue connecté à votre source externe ou passerelle native pour ouvrir dans l’app',
      refreshCatalog: 'Actualiser le catalogue',
      allPlatforms: 'Toutes les plateformes',
      noValidForPlatform: 'Aucun programme valide disponible pour cette plateforme pour le moment.',
      showAllPlatforms: 'Voir toutes les plateformes',
      emptyInvalidSource: 'Aucun programme valide dans la source externe',
      emptyNoSource: 'Source de programmes non configurée',
      emptyInvalidSourceDesc: 'Aucun élément avec image valide reçu depuis l’URL configurée.',
      emptyNoSourceDesc: 'Connectez une URL JSON/API ou la passerelle native dans Paramètres pour afficher ici.',
      configureSource: 'Configurer la source',
    },
    appsDrawer: {
      dialogAria: 'Toutes les applications',
      title: 'Vos applications',
      countNative: (count) =>
        `${count} applications · Installées sur votre TV · Maintenez OK pour épingler à l’Accueil`,
      countWeb: (count) =>
        `${count} applications · Maintenez OK pour épingler à l’Accueil`,
      pinModeActive: 'Terminer',
      pinModeIdle: 'Épingler à l’Accueil',
      reload: 'Recharger',
      closeAria: 'Retour à l’accueil',
      filterAll: 'Toutes',
      filterTv: 'TV & Streaming',
      filterGames: 'Jeux',
      pinInstruction: 'Appuyez sur OK sur une icône pour l’épingler ou la retirer de l’Accueil',
      emptyCategory: 'Aucune application dans cette catégorie',
      seeAll: 'Tout voir',
      pinnedBadgeAria: 'Épinglée à l’Accueil',
    },
    search: {
      dialogAria: 'Recherche universelle VORA',
      placeholder: 'Recherchez des applications, films, séries ou autres...',
      searchingCatalog: 'Recherche dans le catalogue...',
      resultCount: (count) => `${count} ${count === 1 ? 'résultat' : 'résultats'}`,
      keyboardBadge: 'Clavier VORA',
      clear: 'Effacer',
      closeAria: 'Fermer la recherche',
      tabAppsOnly: 'Applications',
      tabAll: 'Tout',
      tabApps: (count) => `Apps (${count})`,
      tabMedia: (count) => `Films & Séries (${count})`,
      appsMatched: 'Applications et jeux',
      appsFrequent: 'Applications fréquentes',
      kindGame: 'Jeu',
      kindApp: 'Application',
      mediaMatched: 'Films et séries',
      mediaTrending: 'Tendances du jour',
      kindSeries: 'Série',
      kindMovie: 'Film',
      directSearchHeading: 'Rechercher directement sur',
      noMatches: (q) => `Aucun résultat pour « ${q} » dans cet onglet.`,
      searchInYoutubeTitle: (q) => `Rechercher « ${q} » sur YouTube`,
      searchInYoutubeSubtitle: 'Vidéos, bandes-annonces, musique et directs sur YouTube TV',
      searchInAppTitle: (q, app) => `Rechercher « ${q} » sur ${app}`,
      searchInAppSubtitle: (app) => `Ouvrir la recherche dans ${app}`,
      keyboard: {
        ariaLabel: 'Clavier à l’écran VORA',
        backspaceAria: 'Effacer le caractère (maintenir pour tout effacer)',
        backspaceTitle: 'Effacer (maintenir OK pour tout effacer)',
        disableCaps: 'Désactiver les majuscules',
        enableCaps: 'Activer les majuscules',
        backToLetters: 'Retour aux lettres',
        space: 'Espace',
        clearAria: 'Effacer la recherche',
        submit: 'OK',
        recentSearches: 'Recherches récentes',
      },
    },
    settings: {
      dialogAria: 'Panneau de paramètres rapides VORA TV OS',
      systemSettingsAria: 'Paramètres système',
      systemSettingsTitle: 'Paramètres',
      notificationsAria: 'Notifications',
      notificationsTitle: 'Notifications',
      accountAria: 'Compte et profil',
      accountTitle: 'Compte et profil',
      tiles: {
        screensaver: 'Veille',
        inputs: 'Entrées',
        picture: 'Image',
        sound: 'Son',
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        timer: 'Minuteur',
        accessibility: 'Accessibilité',
      },
      featured: {
        maintenanceTitle: 'Avis de maintenance actif',
        maintenanceSubtitle: 'Mode applications uniquement activé temporairement',
        updateTitle: (version) => `Mise à jour v${version}`.trim(),
        updateSubtitle: 'Nouvelle version prête à installer',
        timerTitle: (mins) => `Veille programmée · ${mins} min`,
        timerSubtitle: 'Écran de veille automatique à la fin',
        prefsTitle: 'Préférences VORA TV OS',
        prefsSubtitle: (themeLabel, langLabel, version) =>
          `Thème ${themeLabel} · ${langLabel} · v${version}`,
      },
      languageCardTitle: 'Langue · Language',
      languageCardSubtitle: (currentLang) => `Actuelle : ${currentLang} · Changer la langue`,
      oledCardTitle: 'Mode OLED',
      oledCardSubtitle: 'Noir pur #000000 pour TV non-OLED · Atténue les gris',
      oledOn: 'Activé',
      oledOff: 'Désactivé',
      defaultLauncherTitle: 'Lanceur par défaut',
      defaultLauncherSubtitle: 'Définir VORA TV OS comme écran d’accueil',
      notificationsPanelTitle: 'Avis et état du système',
      newVersionLabel: (version) => `Nouvelle version v${version}`.trim(),
      checkUpdates: 'Rechercher des mises à jour',
      profilePanelTitle: 'Profil et apparence',
      languagePanelTitle: 'Langue de l’interface',
      languagePanelHint: 'Le changement s’applique instantanément à tout l’écran',
      themeLabel: 'Thème',
      themeDark: 'Nuit',
      themeLight: 'Jour',
      clockLabel: 'Horloge',
      accountsTv: 'Comptes TV',
      mainLauncher: 'Lanceur d’accueil',
      appsOnly: 'Apps seules',
      yes: 'Oui',
      no: 'Non',
      favoritesReset: 'Favoris',
      checkOtaUpdates: 'Vérifier les mises à jour OTA',
      footerSettings: 'Paramètres',
      presetNames: {
        'gtv-cinema': 'Cinéma / Jour',
        'gtv-midnight': 'Bleu Serein',
        'pure-oled': 'Noir OLED / Pierre',
        'warm-graphite': 'Graphite / Sable Mat',
        'emerald-slate': 'Ardoise / Sauge Minérale',
        'cobalt-night': 'Horizon Cobalt',
      },
    },
    updateModal: {
      title: 'Mise à jour de l’application',
      currentVersion: (versionName, versionCode, isNative) =>
        `Version actuelle : v${versionName} (Build ${versionCode}) ${isNative ? '· Android TV' : '· Web'}`,
      closeAria: 'Fermer la fenêtre',
      checkingTitle: 'Vérification de la version...',
      checkingDesc: 'Recherche d’une nouvelle version disponible pour votre TV',
      upToDateTitle: 'Votre application est à jour',
      upToDateDesc: (versionName) => `Vous disposez déjà de la dernière version (v${versionName}).`,
      availableBadge: 'Nouvelle mise à jour disponible',
      optionalBadge: 'Optionnelle',
      optionalNote:
        'Mise à jour optionnelle : vous pouvez l’ignorer si vous le souhaitez, mais elle améliore la fluidité.',
      defaultNotes:
        '• Améliorations de fluidité et de stabilité sur Android TV.\n• Corrections et expérience affinée sur votre téléviseur.',
      openingInstaller: 'Ouverture de l’installateur système...',
      downloading: 'Téléchargement de la mise à jour...',
      installPromptNote:
        'À la fin du téléchargement, l’installateur Android TV s’ouvrira automatiquement.',
      permissionTitle: 'Autorisation requise sur Android TV',
      permissionDesc:
        'Pour installer la mise à jour, activez « Installer des applis inconnues » pour VORA TV OS dans les paramètres de votre TV.',
      downloadServer: 'Serveur de téléchargement',
      repoLabel: 'Dépôt ou serveur de compilation (optionnel) :',
      save: 'Enregistrer',
      openAndroidPermissions: 'Ouvrir les autorisations Android',
      updateNow: 'Mettre à jour',
      checkForUpdates: 'Vérifier les mises à jour',
      later: 'Plus tard',
      close: 'Fermer',
    },
    maintenanceModal: {
      badge: 'Avis obligatoire du système',
      defaultTitle: 'Maintenance · Prochaine mise à jour',
      appsOnlyHeading: 'Le mode applications uniquement va être activé',
      defaultMessage:
        'Le mode applications uniquement sera activé pendant la préparation de la prochaine mise à jour de VORA TV OS.',
      explanation:
        'Pendant cette période, seules vos applications installées, la recherche et les paramètres resteront visibles. Les recommandations reviendront automatiquement ensuite.',
      acknowledgeBtn: 'Compris · Activer le mode apps seules',
    },
    defaultLauncherModal: {
      badge: 'Écran d’accueil · Android TV',
      title: 'Définir VORA TV OS comme lanceur par défaut',
      subtitle: (currentHomeName) =>
        currentHomeName
          ? `Votre TV utilise actuellement « ${currentHomeName} » comme accueil et bloque le changement automatique.`
          : 'Votre TV bloque le sélecteur direct. Suivez ces étapes sans quitter VORA :',
      steps: [
        '1. Ouvrez les paramètres d’applications ou les détails du lanceur actuel.',
        '2. Ouvrez « Ouvrir par défaut » puis cliquez sur « Effacer les actions par défaut ».',
        '3. Appuyez sur le bouton Accueil (Home) et choisissez « VORA TV OS · Toujours ».',
      ],
      openCurrentLauncherDetails: (currentHomeName) =>
        currentHomeName ? `Détails de ${currentHomeName}` : 'Détails du lanceur actuel',
      openTvAppsSettings: 'Ouvrir les paramètres des apps',
      closeBtn: 'Retour à VORA TV OS',
    },
    screensaver: {
      nowPlayingPrefix: 'En écoute :',
    },
    app: {
      launchingExtended: 'Chargement de l’application, veuillez patienter...',
      launchingNormal: 'Ouverture de l’application...',
      creatorAdminTitle: 'Panneau Créateur (PC uniquement - Raccourci : Ctrl+Shift+A)',
      creatorAdminBtn: 'Panneau Créateur (PC)',
      toast: {
        launchingWeb: (name, pkg) => `Lancement de ${name} (${pkg}) sur Android TV`,
        notInstalled: (name, pkg) => `${name} (${pkg}) n’est pas installée sur cette TV.`,
        openingSuggestionWeb: (title, app) => `Ouverture de « ${title} » sur ${app}`,
        openingPlayStore: (app) => `Ouverture du Play Store pour installer ${app}`,
        openFailed: (app) => `Impossible d’ouvrir ${app}`,
        favRemoved: (name) => `${name} retirée de Vos applications`,
        favAdded: (name) => `${name} épinglée à Vos applications`,
        tvSectionNativeOnly: (label) => `${label} · Disponible sur Android TV`,
        sleepTimerOff: 'Minuteur désactivé',
        sleepTimerSet: (mins) => `Minuteur : ${mins} min avant veille`,
        downloadFailed: 'Échec du téléchargement ou de l’installation.',
        accessibilityNativeOnly: 'Accessibilité · Disponible sur Android TV',
        notificationsNativeOnly: 'Notifications · Disponible sur Android TV',
        languageChanged: (langName) => `Langue définie sur ${langName}`,
        oledEnabled: 'Mode OLED activé · Noir pur #000000',
        oledDisabled: 'Mode OLED désactivé',
        defaultLauncherAlready: 'VORA TV OS est déjà votre lanceur par défaut',
      },
      tvSections: {
        wifi: 'Wi-Fi',
        bluetooth: 'Bluetooth',
        display: 'Image et affichage',
        sound: 'Son',
        inputs: 'Entrées HDMI / TV',
        accessibility: 'Accessibilité',
        account: 'Compte et profil',
        screensaver: 'Écran de veille système',
        home: 'Sélecteur de lanceur par défaut',
        apps: 'Applications système',
        app_details: 'Détails de l’application',
        unknown_sources: 'Sources inconnues',
        settings: 'Paramètres Android TV',
      },
    },
  },
};

export function getTranslations(lang: AppLanguage): LauncherTranslations {
  return TRANSLATIONS[lang] || TRANSLATIONS.es;
}
