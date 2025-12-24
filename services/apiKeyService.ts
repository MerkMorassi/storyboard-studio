
// Updated keys to v2 to ensure freshness and persistence
const API_KEY_STORAGE_KEY = 'mythos_gemini_api_key_v2';
const TOPAZ_API_KEY_STORAGE_KEY = 'mythos_topaz_api_key_v2';
const HF_API_KEY_STORAGE_KEY = 'mythos_hf_api_key_v2';

export const saveApiKey = (key: string): void => {
  try {
    if (key) {
        localStorage.setItem(API_KEY_STORAGE_KEY, key);
    }
  } catch (error) {
    console.error("Failed to save API key to localStorage:", error);
  }
};

export const getApiKey = (): string | null => {
  try {
    // 1. Check Local Storage (User Override)
    const storedKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedKey) return storedKey;

    // 2. Check Environment Variable (Vite Injection)
    // @ts-ignore
    if (typeof process !== 'undefined' && process.env.API_KEY) {
        // @ts-ignore
        return process.env.API_KEY;
    }

    return null;
  } catch (error) {
    console.error("Failed to get API key:", error);
    return null;
  }
};

export const clearApiKey = (): void => {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (error) {
    console.error("Failed to clear API key from localStorage:", error);
  }
};

export const saveTopazApiKey = (key: string): void => {
    try {
        if (key) localStorage.setItem(TOPAZ_API_KEY_STORAGE_KEY, key);
    } catch (error) {
        console.error("Failed to save Topaz API key:", error);
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
        if (key) localStorage.setItem(HF_API_KEY_STORAGE_KEY, key);
    } catch (error) {
        console.error("Failed to save Hugging Face API key:", error);
    }
};

export const getHfApiKey = (): string | null => {
    try {
        return localStorage.getItem(HF_API_KEY_STORAGE_KEY);
    } catch (error) {
        return null;
    }
};
