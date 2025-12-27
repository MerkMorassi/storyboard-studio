// Gemini API Key is handled by process.env now.
const TOPAZ_API_KEY_STORAGE_KEY = 'mythos_topaz_v2';
const HF_API_KEY_STORAGE_KEY = 'mythos_hf_v2';

export const getApiKey = (): string | null => {
  return process.env.API_KEY || null;
};

export const saveTopazApiKey = (key: string): void => {
    try {
        localStorage.setItem(TOPAZ_API_KEY_STORAGE_KEY, key.trim());
        console.log("[MythOS] Topaz Key Persisted.");
    } catch (error) {
        console.error("Persistence Failure (Topaz):", error);
    }
};

export const getTopazApiKey = (): string | null => {
    try {
        return localStorage.getItem(TOPAZ_API_KEY_STORAGE_KEY);
    } catch (error) {
        return null;
    }
};

export const saveHfApiKey = (key: string): void => {
    try {
        localStorage.setItem(HF_API_KEY_STORAGE_KEY, key.trim());
        console.log("[MythOS] HF Token Persisted.");
    } catch (error) {
        console.error("Persistence Failure (HF):", error);
    }
};

export const getHfApiKey = (): string | null => {
    try {
        return localStorage.getItem(HF_API_KEY_STORAGE_KEY);
    } catch (error) {
        return null;
    }
};