// Keys for LocalStorage
const TOPAZ_API_KEY_STORAGE_KEY = 'mythos_topaz_v2';
const HF_API_KEY_STORAGE_KEY = 'mythos_hf_v2';
const GEMINI_API_KEY_STORAGE_KEY = 'mythos_gemini_v2';
const VOICE_LAB_URL_STORAGE_KEY = 'mythos_voicelab_url_v1';

/**
 * Helper to get value from Env (Vite or Process) or Null
 */
const getEnvValue = (key: string): string | null => {
    // Check Vite Env
    if ((import.meta as any).env && (import.meta as any).env[key]) {
        return (import.meta as any).env[key];
    }
    // Check Process Env (injected via define or server)
    if (typeof process !== 'undefined' && process.env && process.env[key]) {
        return process.env[key];
    }
    // Check window.process polyfill
    if ((window as any).process && (window as any).process.env && (window as any).process.env[key]) {
        return (window as any).process.env[key];
    }
    return null;
};

// --- GEMINI ---
export const saveGeminiApiKey = (key: string): void => {
    try {
        if (!key) {
            localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
        } else {
            localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, key.trim());
        }
    } catch (error) {
        console.error("Persistence Failure (Gemini):", error);
    }
};

export const getGeminiApiKey = (): string | null => {
    // 1. Priority: Environment Variables
    const envKey = getEnvValue('VITE_GEMINI_API_KEY') || getEnvValue('GEMINI_API_KEY') || getEnvValue('API_KEY');
    if (envKey) return envKey;

    // 2. Fallback: LocalStorage
    try {
        return localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY);
    } catch (error) {
        return null;
    }
};

// --- TOPAZ ---
export const saveTopazApiKey = (key: string): void => {
    try {
        if (!key) {
            localStorage.removeItem(TOPAZ_API_KEY_STORAGE_KEY);
        } else {
            localStorage.setItem(TOPAZ_API_KEY_STORAGE_KEY, key.trim());
        }
    } catch (error) {
        console.error("Persistence Failure (Topaz):", error);
    }
};

export const getTopazApiKey = (): string | null => {
    const envKey = getEnvValue('VITE_TOPAZ_API_KEY') || getEnvValue('TOPAZ_API_KEY');
    if (envKey) return envKey;

    try {
        return localStorage.getItem(TOPAZ_API_KEY_STORAGE_KEY);
    } catch (error) {
        return null;
    }
};

// --- HUGGING FACE ---
export const saveHfApiKey = (key: string): void => {
    try {
        if (!key) {
            localStorage.removeItem(HF_API_KEY_STORAGE_KEY);
        } else {
            localStorage.setItem(HF_API_KEY_STORAGE_KEY, key.trim());
        }
    } catch (error) {
        console.error("Persistence Failure (HF):", error);
    }
};

export const getHfApiKey = (): string | null => {
    const envKey = getEnvValue('VITE_HF_API_KEY') || getEnvValue('HF_API_KEY');
    if (envKey) return envKey;

    try {
        return localStorage.getItem(HF_API_KEY_STORAGE_KEY);
    } catch (error) {
        return null;
    }
};

// --- VOICE LAB (CHATTERBOX) ---
export const saveVoiceLabUrl = (url: string): void => {
    try {
        if (!url) {
            localStorage.removeItem(VOICE_LAB_URL_STORAGE_KEY);
        } else {
            localStorage.setItem(VOICE_LAB_URL_STORAGE_KEY, url.trim());
        }
    } catch (error) {
        console.error("Persistence Failure (VoiceLab URL):", error);
    }
};

export const getVoiceLabUrl = (): string | null => {
    const envKey = getEnvValue('VITE_VOICELAB_URL') || getEnvValue('VOICELAB_URL');
    if (envKey) return envKey;

    try {
        return localStorage.getItem(VOICE_LAB_URL_STORAGE_KEY);
    } catch (error) {
        return null;
    }
};

export const hasCriticalKeys = (): boolean => {
    return !!getGeminiApiKey();
};