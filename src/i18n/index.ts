import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { AppState } from 'react-native';
import 'intl-pluralrules';

import en from './en.json';
import tr from './tr.json';

const resources = {
    en: { translation: en },
    tr: { translation: tr },
};

// Detect variable
const getLanguage = () => {
    try {
        const locales = Localization.getLocales();
        if (locales && locales.length > 0) {
            return locales[0].languageCode; // e.g., 'en', 'tr'
        }
    } catch (e) {
        console.warn("Could not detect locale", e);
    }
    return 'en';
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: getLanguage(), // Default to device language
        fallbackLng: 'en', // Fallback to English if language not found
        interpolation: {
            escapeValue: false, // react already safes from xss
        },
        compatibilityJSON: 'v3' // Required for Android
    });

// Handle language change if needed when app comes to foreground
AppState.addEventListener('change', (nextAppState) => {
    if (nextAppState === 'active') {
        const lang = getLanguage();
        if (lang && i18n.language !== lang) {
            i18n.changeLanguage(lang);
        }
    }
});

export default i18n;
