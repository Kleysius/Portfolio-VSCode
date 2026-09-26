/**
 * Bibliothèque d'icônes SVG inline.
 * - `appIcons` : icônes colorées des applications (style Fluent de Windows 11)
 * - `ui`       : pictogrammes monochromes (currentColor) pour la barre des tâches, flyouts…
 * - `fileIcon` : icônes de type de fichier pour l'explorateur de VS Code
 */

const svg = (viewBox, body, attrs = '') =>
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${attrs} aria-hidden="true" focusable="false">${body}</svg>`;

const stroke = (body, size = 24) =>
    svg(`0 0 ${size} ${size}`, body, 'fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"');

/* ------------------------------------------------------------------ */
/* Icônes d'applications                                               */
/* ------------------------------------------------------------------ */
export const appIcons = {
    start: svg('0 0 48 48', `
        <defs><linearGradient id="ico-start" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#6ccff6"/><stop offset="1" stop-color="#0a64d2"/></linearGradient></defs>
        <rect x="4" y="4" width="19" height="19" rx="1.5" fill="url(#ico-start)"/>
        <rect x="25" y="4" width="19" height="19" rx="1.5" fill="url(#ico-start)"/>
        <rect x="4" y="25" width="19" height="19" rx="1.5" fill="url(#ico-start)"/>
        <rect x="25" y="25" width="19" height="19" rx="1.5" fill="url(#ico-start)"/>`),

    vscode: svg('0 0 32 32', `
        <path d="M29.01 5.03 23.244 2.254a1.742 1.742 0 0 0-1.989.338L2.38 19.8a1.166 1.166 0 0 0-.08 1.647l.077.077 1.541 1.4a1.165 1.165 0 0 0 1.489.066L28.142 5.75A1.158 1.158 0 0 1 30 6.672v-.067a1.748 1.748 0 0 0-.99-1.575Z" fill="#0065a9"/>
        <path d="m29.01 26.97-5.766 2.777a1.745 1.745 0 0 1-1.989-.338L2.38 12.2a1.166 1.166 0 0 1-.08-1.647l.077-.077 1.541-1.4A1.165 1.165 0 0 1 5.41 9.01L28.142 26.25A1.158 1.158 0 0 0 30 25.328v.072a1.749 1.749 0 0 1-.99 1.57Z" fill="#007acc"/>
        <path d="M23.244 29.747a1.745 1.745 0 0 1-1.989-.338A1.025 1.025 0 0 0 23 28.684V3.316a1.024 1.024 0 0 0-1.749-.724 1.744 1.744 0 0 1 1.989-.339l5.765 2.772A1.748 1.748 0 0 1 30 6.6v18.8a1.748 1.748 0 0 1-.991 1.576Z" fill="#1f9cf0"/>`),

    explorer: svg('0 0 48 48', `
        <defs>
            <linearGradient id="ico-fe-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd35c"/><stop offset="1" stop-color="#f5b623"/></linearGradient>
            <linearGradient id="ico-fe-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2d8ae6"/><stop offset="1" stop-color="#57b4ff"/></linearGradient>
        </defs>
        <path d="M4 12a4 4 0 0 1 4-4h10.2a4 4 0 0 1 2.8 1.2L24 12h16a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#e8a52a"/>
        <path d="M4 18a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="url(#ico-fe-a)"/>
        <path d="M4 31h40v5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="url(#ico-fe-b)"/>`),

    folder: svg('0 0 48 48', `
        <defs><linearGradient id="ico-fold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd35c"/><stop offset="1" stop-color="#f3b21f"/></linearGradient></defs>
        <path d="M4 12a4 4 0 0 1 4-4h10.2a4 4 0 0 1 2.8 1.2L24 12h16a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#e3a21a"/>
        <path d="M4 18a4 4 0 0 1 4-4h32a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="url(#ico-fold)"/>`),

    terminal: svg('0 0 48 48', `
        <defs><linearGradient id="ico-term" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a4a4a"/><stop offset="1" stop-color="#1f1f1f"/></linearGradient></defs>
        <rect x="4" y="7" width="40" height="34" rx="5" fill="url(#ico-term)"/>
        <path d="M4 12a5 5 0 0 1 5-5h30a5 5 0 0 1 5 5v1H4Z" fill="#6b6b6b"/>
        <path d="m12 21 6 5-6 5" fill="none" stroke="#e8e8e8" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M22 32h12" stroke="#e8e8e8" stroke-width="2.6" stroke-linecap="round"/>`),

    edge: svg('0 0 48 48', `
        <defs>
            <linearGradient id="ico-edge-a" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#35c1f1"/><stop offset=".55" stop-color="#1b86d8"/><stop offset="1" stop-color="#0c59a4"/></linearGradient>
            <linearGradient id="ico-edge-b" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#2fd07d"/><stop offset="1" stop-color="#6ae36b"/></linearGradient>
        </defs>
        <circle cx="24" cy="24" r="20" fill="url(#ico-edge-a)"/>
        <path d="M8.5 30c2.5 7 9.5 11.5 16.5 11 8-.5 14.5-6.5 15.8-13.6-3.4 4-9.4 5.6-14.3 3.5C21.7 29 21 24.5 24 22c-6.5-.6-13.4 1.5-15.5 8Z" fill="url(#ico-edge-b)"/>
        <path d="M24 22c-3 2.5-2.3 7 2.5 8.9 4.9 2.1 10.9.5 14.3-3.5.2-1 .2-2.4 0-3.4C39.5 16 32.5 10 24.4 10 16 10 9.3 16.7 8.5 24.7c3.6-3.8 9.6-4.2 15.5-2.7Z" fill="#fff" opacity=".18"/>`),

    settings: svg('0 0 48 48', `
        <defs><linearGradient id="ico-set" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9aa6b2"/><stop offset="1" stop-color="#4f5b67"/></linearGradient></defs>
        <path d="M27.3 4.5 28.4 9a15.8 15.8 0 0 1 4.1 2.4l4.5-1.3a2 2 0 0 1 2.3.9l3.3 5.7a2 2 0 0 1-.4 2.5l-3.4 3.2a16 16 0 0 1 0 4.8l3.4 3.2a2 2 0 0 1 .4 2.5l-3.3 5.7a2 2 0 0 1-2.3.9l-4.5-1.3a15.8 15.8 0 0 1-4.1 2.4l-1.1 4.5a2 2 0 0 1-2 1.5h-6.6a2 2 0 0 1-2-1.5L19.6 39a15.8 15.8 0 0 1-4.1-2.4L11 37.9a2 2 0 0 1-2.3-.9l-3.3-5.7a2 2 0 0 1 .4-2.5l3.4-3.2a16 16 0 0 1 0-4.8l-3.4-3.2a2 2 0 0 1-.4-2.5L8.7 9.4A2 2 0 0 1 11 8.5l4.5 1.3A15.8 15.8 0 0 1 19.6 7.4l1.1-4.5A2 2 0 0 1 22.7 1.4h2.6a2 2 0 0 1 2 1.5Z" fill="url(#ico-set)" transform="translate(0 1.5)"/>
        <circle cx="24" cy="25.5" r="7" fill="#e6ecf2"/>`),

    notepad: svg('0 0 48 48', `
        <defs><linearGradient id="ico-np" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9f5ff"/><stop offset="1" stop-color="#c7e3fb"/></linearGradient></defs>
        <rect x="9" y="7" width="30" height="36" rx="3.5" fill="url(#ico-np)" stroke="#6aa9dc" stroke-width="1"/>
        <path d="M15 17h18M15 23h18M15 29h18M15 35h11" stroke="#2f7ed8" stroke-width="2" stroke-linecap="round"/>
        <path d="M16 4v6M24 4v6M32 4v6" stroke="#2f5b8a" stroke-width="2.4" stroke-linecap="round"/>`),

    photos: svg('0 0 48 48', `
        <defs><linearGradient id="ico-ph" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5ac8fa"/><stop offset="1" stop-color="#1c6fd1"/></linearGradient></defs>
        <rect x="5" y="8" width="38" height="32" rx="5" fill="url(#ico-ph)"/>
        <circle cx="33" cy="17" r="3.5" fill="#fff" opacity=".9"/>
        <path d="M5 34 17 22l9 9 5-5 12 12v2a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5Z" fill="#fff" opacity=".85"/>`),

    github: svg('0 0 48 48', `
        <circle cx="24" cy="24" r="21" fill="#1f2328"/>
        <path transform="translate(8 8) scale(2)" fill="#fff" d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"/>`),

    linkedin: svg('0 0 48 48', `
        <rect x="4" y="4" width="40" height="40" rx="7" fill="#0a66c2"/>
        <circle cx="15" cy="15" r="3.2" fill="#fff"/>
        <path d="M12.2 20.5h5.6V36h-5.6ZM21.5 20.5h5.3v2.2c.8-1.4 2.6-2.6 5.2-2.6 5 0 5.9 3.3 5.9 7.5V36h-5.5v-7.4c0-1.8 0-4-2.5-4s-2.9 1.9-2.9 3.9V36h-5.5Z" fill="#fff"/>`),

    recycle: svg('0 0 48 48', `
        <defs><linearGradient id="ico-bin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe3f5" stop-opacity=".9"/><stop offset=".5" stop-color="#f4f9ff" stop-opacity=".95"/><stop offset="1" stop-color="#b9d3ea" stop-opacity=".9"/></linearGradient></defs>
        <path d="M10 13h28l-2.6 27.4A3 3 0 0 1 32.4 43H15.6a3 3 0 0 1-3-2.6Z" fill="url(#ico-bin)" stroke="#8fb3d6" stroke-width="1"/>
        <ellipse cx="24" cy="13" rx="14" ry="3" fill="#e9f3fc" stroke="#8fb3d6" stroke-width="1"/>
        <path d="M17 20l1.5 17M24 20v17M31 20l-1.5 17" stroke="#9cbddd" stroke-width="1.2" stroke-linecap="round"/>`),

    recycleFull: svg('0 0 48 48', `
        <defs><linearGradient id="ico-binf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#cfe3f5" stop-opacity=".9"/><stop offset=".5" stop-color="#f4f9ff" stop-opacity=".95"/><stop offset="1" stop-color="#b9d3ea" stop-opacity=".9"/></linearGradient></defs>
        <path d="M14 7.5 22 4l3 7-8 3.4Z" fill="#fff" stroke="#9cbddd"/><path d="m24 6 9-1 1 8.5-9 1Z" fill="#ffe08a" stroke="#d9b24a"/><path d="M19 9h12v6H19z" fill="#8fd3ff" stroke="#5aa3d6"/>
        <path d="M10 13h28l-2.6 27.4A3 3 0 0 1 32.4 43H15.6a3 3 0 0 1-3-2.6Z" fill="url(#ico-binf)" stroke="#8fb3d6" stroke-width="1"/>
        <ellipse cx="24" cy="13" rx="14" ry="3" fill="#e9f3fc" stroke="#8fb3d6" stroke-width="1"/>
        <path d="M17 20l1.5 17M24 20v17M31 20l-1.5 17" stroke="#9cbddd" stroke-width="1.2" stroke-linecap="round"/>`),

    pc: svg('0 0 48 48', `
        <defs><linearGradient id="ico-pc" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3bb3ff"/><stop offset="1" stop-color="#0c62c9"/></linearGradient></defs>
        <rect x="5" y="8" width="38" height="25" rx="3" fill="#2b2f36"/>
        <rect x="7.5" y="10.5" width="33" height="20" rx="1.5" fill="url(#ico-pc)"/>
        <path d="M20 33h8l1.5 5h-11Z" fill="#8a929c"/><rect x="14" y="38" width="20" height="3" rx="1.5" fill="#6d747d"/>`),

    textfile: svg('0 0 48 48', `
        <path d="M11 4h18l10 10v28a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="#fbfbfb" stroke="#b7b7b7"/>
        <path d="M29 4v8a2 2 0 0 0 2 2h8" fill="#e6e6e6" stroke="#b7b7b7"/>
        <path d="M15 22h18M15 27h18M15 32h18M15 37h11" stroke="#8a8a8a" stroke-width="1.6" stroke-linecap="round"/>`),

    web: svg('0 0 48 48', `
        <path d="M11 4h18l10 10v28a2 2 0 0 1-2 2H11a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" fill="#fbfbfb" stroke="#b7b7b7"/>
        <circle cx="24" cy="29" r="9" fill="none" stroke="#1b86d8" stroke-width="1.8"/>
        <path d="M15 29h18M24 20c-3 3-3 15 0 18M24 20c3 3 3 15 0 18" fill="none" stroke="#1b86d8" stroke-width="1.5"/>`),

    user: svg('0 0 48 48', `
        <defs><linearGradient id="ico-user" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4cc2ff"/><stop offset="1" stop-color="#0063b1"/></linearGradient></defs>
        <circle cx="24" cy="24" r="22" fill="url(#ico-user)"/>
        <circle cx="24" cy="19" r="8" fill="#fff" opacity=".92"/>
        <path d="M9.5 38.5c2.8-6 8.3-9 14.5-9s11.7 3 14.5 9A21.9 21.9 0 0 1 24 46a21.9 21.9 0 0 1-14.5-7.5Z" fill="#fff" opacity=".92"/>`),

    store: svg('0 0 48 48', `
        <path d="M8 16h32l-2 25H10Z" fill="#1b86d8"/>
        <path d="M17 16v-3a7 7 0 0 1 14 0v3" fill="none" stroke="#1b86d8" stroke-width="3"/>
        <rect x="16" y="22" width="7" height="7" fill="#f35325"/><rect x="25" y="22" width="7" height="7" fill="#81bc06"/>
        <rect x="16" y="31" width="7" height="7" fill="#05a6f0"/><rect x="25" y="31" width="7" height="7" fill="#ffba08"/>`),
};

/* ------------------------------------------------------------------ */
/* Pictogrammes monochromes                                            */
/* ------------------------------------------------------------------ */
export const ui = {
    search: stroke('<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/>'),
    wifi: stroke('<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.5 12.2a9.5 9.5 0 0 1 13 0"/><path d="M8.6 15.4a5 5 0 0 1 6.8 0"/><circle cx="12" cy="18.6" r=".9" fill="currentColor"/>'),
    volume: stroke('<path d="M4 9.5h3l4.5-4v13L7 14.5H4z"/><path d="M15 9a4 4 0 0 1 0 6"/><path d="M17.5 6.5a7.5 7.5 0 0 1 0 11"/>'),
    volumeMute: stroke('<path d="M4 9.5h3l4.5-4v13L7 14.5H4z"/><path d="m15.5 9.5 5 5m0-5-5 5"/>'),
    battery: stroke('<rect x="2.5" y="7.5" width="17" height="9" rx="2"/><path d="M21.5 10.5v3"/><rect x="4.5" y="9.5" width="10" height="5" rx=".8" fill="currentColor" stroke="none"/>'),
    batteryCharging: stroke('<rect x="2.5" y="7.5" width="17" height="9" rx="2"/><path d="M21.5 10.5v3"/><path d="m11.5 9-2.5 3.2h3.5L10 15.5" stroke-width="1.3"/>'),
    bluetooth: stroke('<path d="m7 7.5 10 9-5 4.5V3l5 4.5-10 9"/>'),
    airplane: stroke('<path d="M10.5 20.5 12 17V13.5l-8 2V14l8-4.5V5a1.5 1.5 0 0 1 3 0v4.5l8 4.5v1.5l-8-2V17l1.5 3.5L13.5 20z" transform="translate(-1.5 0)"/>'),
    moon: stroke('<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5Z"/>'),
    sun: stroke('<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/>'),
    nightLight: stroke('<path d="M12 3v1.5M5.6 5.6l1 1M3 12h1.5"/><path d="M19.5 14A7.5 7.5 0 0 1 10 4.5a7.5 7.5 0 1 0 9.5 9.5Z"/>'),
    accessibility: stroke('<circle cx="12" cy="4.5" r="1.8"/><path d="M5 8.5 12 10l7-1.5M12 10v4.5m0 0-3 6m3-6 3 6"/>'),
    leaf: stroke('<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14"/><path d="M5 19c3-4 6-7 10-9"/>'),
    focus: stroke('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>'),
    power: stroke('<path d="M12 3v8"/><path d="M6.3 6.8a8 8 0 1 0 11.4 0"/>'),
    lock: stroke('<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>'),
    restart: stroke('<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4v4h4"/>'),
    sleep: stroke('<path d="M19 14.5A8 8 0 0 1 9.5 5a8 8 0 1 0 9.5 9.5Z"/>'),
    settings: stroke('<circle cx="12" cy="12" r="3"/><path d="M12 2.8l1.3 2.3 2.6-.6.8 2.5 2.5.8-.6 2.6 2.3 1.3-2.3 1.3.6 2.6-2.5.8-.8 2.5-2.6-.6L12 21.2l-1.3-2.3-2.6.6-.8-2.5-2.5-.8.6-2.6L3.1 12l2.3-1.3-.6-2.6 2.5-.8.8-2.5 2.6.6Z"/>'),
    chevronUp: stroke('<path d="m6 15 6-6 6 6"/>'),
    chevronDown: stroke('<path d="m6 9 6 6 6-6"/>'),
    chevronRight: stroke('<path d="m9 6 6 6-6 6"/>'),
    chevronLeft: stroke('<path d="m15 6-6 6 6 6"/>'),
    arrowLeft: stroke('<path d="M20 12H4m6-6-6 6 6 6"/>'),
    arrowRight: stroke('<path d="M4 12h16m-6-6 6 6-6 6"/>'),
    arrowUp: stroke('<path d="M12 20V4m-6 6 6-6 6 6"/>'),
    refresh: stroke('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v4h-4"/>'),
    bell: stroke('<path d="M6 16V10.5a6 6 0 0 1 12 0V16l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    bellOff: stroke('<path d="M6 16V10.5a6 6 0 0 1 9.5-4.9M18 10v6l1.5 2h-15"/><path d="M10 20.5a2 2 0 0 0 4 0M3.5 3.5l17 17"/>'),
    edit: stroke('<path d="M14.5 5.5 18.5 9.5 8 20H4v-4Z"/><path d="m13 7 4 4"/>'),
    widgets: svg('0 0 24 24', '<rect x="3" y="3" width="8" height="8" rx="2" fill="#4cc2ff"/><rect x="13" y="3" width="8" height="8" rx="2" fill="#0f6cbd"/><rect x="3" y="13" width="8" height="8" rx="2" fill="#0f6cbd"/><rect x="13" y="13" width="8" height="8" rx="2" fill="#4cc2ff"/>'),
    taskView: svg('0 0 24 24', '<rect x="2.5" y="5" width="11" height="14" rx="2" fill="#6b6b6b"/><rect x="10.5" y="5" width="11" height="14" rx="2" fill="#fff" stroke="#6b6b6b"/>'),
    close: stroke('<path d="m6 6 12 12M18 6 6 18"/>'),
    minimize: stroke('<path d="M5 12h14"/>', 24),
    maximize: stroke('<rect x="5.5" y="5.5" width="13" height="13" rx="2"/>'),
    restore: stroke('<rect x="5" y="8" width="11" height="11" rx="2"/><path d="M8 8V7a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-1"/>'),
    plus: stroke('<path d="M12 5v14M5 12h14"/>'),
    more: svg('0 0 24 24', '<circle cx="5.5" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="18.5" cy="12" r="1.5" fill="currentColor"/>'),
    grid: stroke('<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/>'),
    list: stroke('<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4.5" cy="6" r=".6" fill="currentColor"/><circle cx="4.5" cy="12" r=".6" fill="currentColor"/><circle cx="4.5" cy="18" r=".6" fill="currentColor"/>'),
    sort: stroke('<path d="M7 4v16m0 0-3-3m3 3 3-3M17 20V4m0 0-3 3m3-3 3 3"/>'),
    view: stroke('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M3.5 9.5h17"/>'),
    home: stroke('<path d="m4 11 8-7 8 7v8.5a1.5 1.5 0 0 1-1.5 1.5H14v-6h-4v6H5.5A1.5 1.5 0 0 1 4 19.5Z"/>'),
    desktop: stroke('<rect x="3" y="4.5" width="18" height="12" rx="1.5"/><path d="M9 20.5h6M12 16.5v4"/>'),
    documents: stroke('<path d="M7 3.5h7l4.5 4.5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1Z"/><path d="M14 3.5V8h4.5M9 13h6M9 16.5h6"/>'),
    pictures: stroke('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="15.5" cy="9.5" r="1.5"/><path d="m3.5 17 5-5 4 4 2.5-2.5 5.5 5"/>'),
    downloads: stroke('<path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5M5 19.5h14"/>'),
    music: stroke('<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'),
    cut: stroke('<circle cx="6.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/><path d="M8.5 15.8 18 4M15.5 15.8 6 4"/>'),
    copy: stroke('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'),
    paste: stroke('<rect x="5.5" y="5" width="13" height="16" rx="2"/><path d="M9 5a3 3 0 0 1 6 0M9 11h6M9 15h4"/>'),
    rename: stroke('<path d="M4 7h10M4 12h7M4 17h5"/><path d="m18 9 2.5 2.5L14 18h-2.5v-2.5Z"/>'),
    share: stroke('<path d="M14 5h5v5M19 5l-8 8"/><path d="M17 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 4 18.5v-10A1.5 1.5 0 0 1 5.5 7H10"/>'),
    trash: stroke('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
    open: stroke('<path d="M4 7.5V18a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 18V10a1.5 1.5 0 0 0-1.5-1.5H12L10 6H5.5A1.5 1.5 0 0 0 4 7.5Z"/>'),
    terminal: stroke('<rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="m7 9.5 3 2.5-3 2.5M12.5 15h4.5"/>'),
    palette: stroke('<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 1.8-1.2 1.2-2.2-.7-1.2 0-2.6 1.4-2.6H17a3.5 3.5 0 0 0 3.5-3.5c0-4.9-3.8-8.7-8.5-8.7Z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="10" cy="7.5" r="1" fill="currentColor"/><circle cx="14.5" cy="7.5" r="1" fill="currentColor"/>'),
    image: stroke('<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="9.5" r="1.5"/><path d="m20.5 15.5-5-5-9.5 9"/>'),
    info: stroke('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><circle cx="12" cy="7.8" r=".6" fill="currentColor"/>'),
    check: stroke('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
    star: stroke('<path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8Z"/>'),
    heart: stroke('<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>'),
    mail: stroke('<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="m3.5 7 8.5 6 8.5-6"/>'),
    location: stroke('<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z"/><circle cx="12" cy="10" r="2.3"/>'),
    shield: stroke('<path d="M12 3 5 6v5.5c0 4.5 3 8 7 9.5 4-1.5 7-5 7-9.5V6Z"/><path d="m9 12 2.2 2.2L15.5 10"/>'),
    update: stroke('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4v4h-4"/><path d="M12 8.5V12l2.5 1.5"/>'),
    apps: stroke('<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.2"/><path d="m14.5 7.2 2.3-2.3 2.3 2.3-2.3 2.3Z"/>'),
    clock: stroke('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'),
    game: stroke('<path d="M7.5 8.5h9a4.5 4.5 0 0 1 4.3 5.8l-.9 3a2.3 2.3 0 0 1-3.8.9L14 16.2h-4l-2.1 2a2.3 2.3 0 0 1-3.8-.9l-.9-3a4.5 4.5 0 0 1 4.3-5.8Z"/><path d="M8 11.5v3M6.5 13h3"/><circle cx="15.5" cy="12" r=".7" fill="currentColor"/><circle cx="17" cy="14" r=".7" fill="currentColor"/>'),
    code: stroke('<path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 5l-3 14"/>'),
    external: stroke('<path d="M14 4.5h5.5V10M19.5 4.5 11 13"/><path d="M17.5 14v4.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1H10"/>'),
    person: stroke('<circle cx="12" cy="8" r="4"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>'),
    globe: stroke('<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c-2.8 2.5-2.8 14.5 0 17M12 3.5c2.8 2.5 2.8 14.5 0 17"/>'),
    snapLayouts: stroke('<rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M12 5v14"/>'),
};

/* ------------------------------------------------------------------ */
/* Icônes de fichiers (thème d'icônes façon « Material Icon Theme »)   */
/* ------------------------------------------------------------------ */
const badge = (color, text, fg = '#fff', size = 7) => svg('0 0 16 16',
    `<rect x="1" y="2" width="14" height="12" rx="2" fill="${color}"/><text x="8" y="10.6" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="700" font-size="${size}" fill="${fg}">${text}</text>`);

export const fileIcons = {
    html: svg('0 0 16 16', '<path d="M2 1.5h12l-1.1 12L8 15l-4.9-1.5Z" fill="#e44d26"/><path d="M8 2.5v11.3l3.9-1.1.9-10.2Z" fill="#f16529"/><path d="M5 5h6l-.2 1.6H6.6l.1 1.5h3.9l-.3 3.3L8 12l-2.2-.6-.2-1.8h1.4l.1.8.9.3.9-.3.1-1.2H5.4Z" fill="#fff"/>'),
    css: svg('0 0 16 16', '<path d="M2 1.5h12l-1.1 12L8 15l-4.9-1.5Z" fill="#1572b6"/><path d="M8 2.5v11.3l3.9-1.1.9-10.2Z" fill="#33a9dc"/><path d="M5 5h6l-.2 1.6H6.6l.1 1.5h3.9l-.3 3.3L8 12l-2.2-.6-.2-1.8h1.4l.1.8.9.3.9-.3.1-1.2H5.4Z" fill="#fff"/>'),
    js: badge('#f7df1e', 'JS', '#1f1f1f'),
    ts: badge('#3178c6', 'TS'),
    json: svg('0 0 16 16', '<path d="M5.5 2.5C4 2.5 4 3.5 4 4.5v2c0 1-.8 1.5-1.8 1.5 1 0 1.8.5 1.8 1.5v2c0 1 0 2 1.5 2M10.5 2.5c1.5 0 1.5 1 1.5 2v2c0 1 .8 1.5 1.8 1.5-1 0-1.8.5-1.8 1.5v2c0 1 0 2-1.5 2" fill="none" stroke="#f5c518" stroke-width="1.5" stroke-linecap="round"/>'),
    md: svg('0 0 16 16', '<rect x="1" y="3" width="14" height="10" rx="1.5" fill="none" stroke="#42a5f5" stroke-width="1.3"/><path d="M3.5 10.5v-5l2 2.5 2-2.5v5M11 5.5v4.5m-1.8-1.8L11 10l1.8-1.8" fill="none" stroke="#42a5f5" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round"/>'),
    twig: badge('#8bc34a', 'T'),
    tsx: svg('0 0 16 16', '<g fill="none" stroke="#00bcd4" stroke-width="1"><ellipse cx="8" cy="8" rx="6.5" ry="2.6"/><ellipse cx="8" cy="8" rx="6.5" ry="2.6" transform="rotate(60 8 8)"/><ellipse cx="8" cy="8" rx="6.5" ry="2.6" transform="rotate(120 8 8)"/></g><circle cx="8" cy="8" r="1.3" fill="#00bcd4"/>'),
    git: svg('0 0 16 16', '<path d="M15 7.3 8.7 1a1 1 0 0 0-1.4 0L6 2.3l1.7 1.7a1.2 1.2 0 0 1 1.5 1.5l1.6 1.6a1.2 1.2 0 1 1-.7.7L8.6 6.3v4a1.2 1.2 0 1 1-1-.1V6.2a1.2 1.2 0 0 1-.6-1.6L5.3 2.9 1 7.3a1 1 0 0 0 0 1.4L7.3 15a1 1 0 0 0 1.4 0L15 8.7a1 1 0 0 0 0-1.4Z" fill="#e64a19"/>'),
    npm: svg('0 0 16 16', '<rect x="1" y="4" width="14" height="8" fill="#cb3837"/><path d="M2.5 10.5v-5h4v5H5.3V6.7h-.8v3.8ZM7 5.5h4v3.8H9.5v1.2H7Zm1.3 1.2v1.4h1.1V6.7ZM11.5 5.5h2.5v5h-.9V6.7h-.4v3.8h-.8V6.7h-.4v3.8Z" fill="#fff"/>'),
    settings: svg('0 0 16 16', '<path d="M8 1.5 9 3.2l1.9-.4.5 1.9 1.9.5-.4 1.9L14.5 8l-1.6 1 .4 1.9-1.9.5-.5 1.9-1.9-.4L8 14.5l-1-1.6-1.9.4-.5-1.9-1.9-.5.4-1.9L1.5 8l1.6-1-.4-1.9 1.9-.5.5-1.9 1.9.4Z" fill="#42a5f5"/><circle cx="8" cy="8" r="2.2" fill="#1f1f1f"/>'),
    vscode: svg('0 0 16 16', '<path d="M11.6 1.2 5.3 7 2.4 4.8l-1 .5v5.4l1 .5L5.3 9l6.3 5.8 2.9-1.4V2.6Z" fill="#2196f3"/><path d="M11.6 4.8 7.6 8l4 3.2Z" fill="#1f1f1f"/>'),
    license: svg('0 0 16 16', '<rect x="3" y="1.5" width="10" height="13" rx="1" fill="#ffca28"/><path d="M5.5 5h5M5.5 7.5h5M5.5 10h3" stroke="#1f1f1f" stroke-width="1.1"/>'),
    image: svg('0 0 16 16', '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="#26a69a"/><circle cx="10.5" cy="6" r="1.3" fill="#fff"/><path d="m1.5 12 4-4 3 3 2-2 4 4v.5h-13Z" fill="#fff" opacity=".9"/>'),
    txt: svg('0 0 16 16', '<path d="M3.5 1.5h6l3 3v10h-9Z" fill="#90a4ae"/><path d="M5.5 7h5M5.5 9.5h5M5.5 12h3" stroke="#263238" stroke-width="1"/>'),
    file: svg('0 0 16 16', '<path d="M3.5 1.5h6l3 3v10h-9Z" fill="none" stroke="#90a4ae" stroke-width="1.2"/>'),
    folder: svg('0 0 16 16', '<path d="M1.5 3.5a1 1 0 0 1 1-1h4l1.5 1.5h5.5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" fill="#90a4ae"/>'),
    folderOpen: svg('0 0 16 16', '<path d="M1.5 3.5a1 1 0 0 1 1-1h4l1.5 1.5h5a1 1 0 0 1 1 1V6H4.2a1 1 0 0 0-.95.7L1.5 12Z" fill="#90a4ae"/><path d="M3.3 6.7a1 1 0 0 1 .95-.7H15l-2 6.8a1 1 0 0 1-1 .7H1.5Z" fill="#b0bec5"/>'),
    folderSrc: svg('0 0 16 16', '<path d="M1.5 3.5a1 1 0 0 1 1-1h4l1.5 1.5h5.5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" fill="#4caf50"/><path d="m6.5 7.5-1.5 1.5 1.5 1.5M9.5 7.5l1.5 1.5-1.5 1.5" stroke="#fff" fill="none" stroke-width="1"/>'),
    folderVscode: svg('0 0 16 16', '<path d="M1.5 3.5a1 1 0 0 1 1-1h4l1.5 1.5h5.5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" fill="#2196f3"/><path d="m10.2 6.3-2.7 2.4-1.3-1-.5.3v2l.5.3 1.3-1 2.7 2.4 1.3-.7V7Z" fill="#fff"/>'),
    folderPublic: svg('0 0 16 16', '<path d="M1.5 3.5a1 1 0 0 1 1-1h4l1.5 1.5h5.5a1 1 0 0 1 1 1v7.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" fill="#039be5"/><circle cx="8" cy="9" r="2.6" fill="none" stroke="#fff" stroke-width=".9"/><path d="M5.4 9h5.2M8 6.4c-.9.8-.9 4.4 0 5.2M8 6.4c.9.8.9 4.4 0 5.2" stroke="#fff" stroke-width=".7" fill="none"/>'),
    extension: svg('0 0 16 16', '<path d="M2 5h3.5V3.5a1.5 1.5 0 0 1 3 0V5H12v3.5h-1.5a1.5 1.5 0 0 0 0 3H12V14H2Z" fill="#7e57c2"/>'),
    welcome: svg('0 0 16 16', '<path d="M11.6 1.2 5.3 7 2.4 4.8l-1 .5v5.4l1 .5L5.3 9l6.3 5.8 2.9-1.4V2.6Z" fill="#2196f3"/><path d="M11.6 4.8 7.6 8l4 3.2Z" fill="#1f1f1f"/>'),
    preview: svg('0 0 16 16', '<rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="#42a5f5" stroke-width="1.3"/><path d="M8 2.5v11" stroke="#42a5f5" stroke-width="1.3"/><path d="M3.5 6h2.5M3.5 8.5h2.5M10 6h2.5" stroke="#42a5f5"/>'),
    settingsUi: svg('0 0 16 16', '<path d="M3 4h10M3 8h10M3 12h10" stroke="#9e9e9e" stroke-width="1.4"/><circle cx="6" cy="4" r="1.4" fill="#9e9e9e"/><circle cx="10.5" cy="8" r="1.4" fill="#9e9e9e"/><circle cx="5" cy="12" r="1.4" fill="#9e9e9e"/>'),
};

/** Retourne l'icône associée à un nom de fichier. */
export function fileIcon(name, { folder = false, open = false } = {}) {
    if (folder) {
        if (name === 'src') return fileIcons.folderSrc;
        if (name === '.vscode') return fileIcons.folderVscode;
        if (name === 'public') return fileIcons.folderPublic;
        return open ? fileIcons.folderOpen : fileIcons.folder;
    }
    const lower = name.toLowerCase();
    if (lower === 'package.json') return fileIcons.npm;
    if (lower === '.gitignore') return fileIcons.git;
    if (lower === 'license') return fileIcons.license;
    if (lower === 'settings.json' || lower === 'extensions.json') return fileIcons.vscode;
    const ext = lower.split('.').pop();
    return fileIcons[{ htm: 'html', mjs: 'js', jsx: 'tsx', markdown: 'md', png: 'image', jpg: 'image', webp: 'image', svg: 'image' }[ext] ?? ext] ?? fileIcons.file;
}

/** Icône d'application sous forme d'<img> (les dégradés SVG restent isolés dans leur document). */
const iconUrlCache = new Map();
export function appIconUrl(name) {
    if (!iconUrlCache.has(name)) {
        const source = appIcons[name] ?? appIcons.textfile;
        iconUrlCache.set(name, `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source.replace(' aria-hidden="true" focusable="false"', ''))}`);
    }
    return iconUrlCache.get(name);
}
export const appIcon = (name, className = 'app-icon') =>
    `<img class="${className}" src="${appIconUrl(name)}" alt="" draggable="false">`;

/** Icône codicon (police de VS Code). */
export const codicon = (name, extra = '') => `<i class="codicon codicon-${name} ${extra}" aria-hidden="true"></i>`;
