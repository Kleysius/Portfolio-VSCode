/**
 * Météo en direct (Open-Meteo, sans clé d'API) pour Marseille, avec repli statique.
 */
import { session } from '../core/store.js';

const URL = 'https://api.open-meteo.com/v1/forecast?latitude=43.2965&longitude=5.3698'
    + '&current=temperature_2m,weather_code,is_day,relative_humidity_2m,wind_speed_10m'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=Europe%2FParis&forecast_days=5';

const CODES = [
    [[0], 'Ensoleillé', '☀️', '🌙'],
    [[1], 'Plutôt ensoleillé', '🌤️', '🌙'],
    [[2], 'Partiellement nuageux', '⛅', '☁️'],
    [[3], 'Couvert', '☁️', '☁️'],
    [[45, 48], 'Brouillard', '🌫️', '🌫️'],
    [[51, 53, 55, 56, 57], 'Bruine', '🌦️', '🌧️'],
    [[61, 63, 65, 66, 67, 80, 81, 82], 'Pluie', '🌧️', '🌧️'],
    [[71, 73, 75, 77, 85, 86], 'Neige', '🌨️', '🌨️'],
    [[95, 96, 99], 'Orage', '⛈️', '⛈️'],
];

export function describe(code, isDay = true) {
    const entry = CODES.find(([codes]) => codes.includes(code)) ?? CODES[0];
    return { label: entry[1], emoji: isDay ? entry[2] : entry[3] };
}

const FALLBACK = {
    city: 'Marseille',
    temperature: 25,
    humidity: 55,
    wind: 12,
    ...describe(0),
    daily: [],
    live: false,
};

let promise = null;

export function getWeather() {
    if (promise) return promise;
    const cached = session.get('weather');
    if (cached && Date.now() - cached.time < 15 * 60 * 1000) return (promise = Promise.resolve(cached.data));

    promise = fetch(URL)
        .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
        .then((json) => {
            const { current, daily } = json;
            const data = {
                city: 'Marseille',
                temperature: Math.round(current.temperature_2m),
                humidity: current.relative_humidity_2m,
                wind: Math.round(current.wind_speed_10m),
                ...describe(current.weather_code, current.is_day === 1),
                daily: daily.time.map((day, i) => ({
                    day: new Date(day).toLocaleDateString('fr-FR', { weekday: 'short' }),
                    max: Math.round(daily.temperature_2m_max[i]),
                    min: Math.round(daily.temperature_2m_min[i]),
                    ...describe(daily.weather_code[i]),
                })),
                live: true,
            };
            session.set('weather', { time: Date.now(), data });
            return data;
        })
        .catch(() => FALLBACK);
    return promise;
}
