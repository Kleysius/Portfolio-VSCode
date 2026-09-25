/**
 * Envoi du formulaire de contact via EmailJS (SDK chargé uniquement au premier envoi).
 */
const SDK = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
const PUBLIC_KEY = 'pW9FzYAPEEO9U2BWf';
const SERVICE_ID = 'service_0b9ot4g';
const TEMPLATE_ID = 'template_oy5c70a';

let sdk = null;

function loadSdk() {
    sdk ??= new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SDK;
        script.async = true;
        script.onload = () => {
            window.emailjs.init(PUBLIC_KEY);
            resolve(window.emailjs);
        };
        script.onerror = () => {
            sdk = null;
            reject(new Error('EmailJS indisponible'));
        };
        document.head.append(script);
    });
    return sdk;
}

/** @param {{ name: string, email: string, subject: string, message: string }} params */
export async function sendMail(params) {
    const emailjs = await loadSdk();
    const response = await emailjs.send(SERVICE_ID, TEMPLATE_ID, params);
    if (response.status !== 200) throw new Error(`EmailJS ${response.status}`);
    return response;
}
