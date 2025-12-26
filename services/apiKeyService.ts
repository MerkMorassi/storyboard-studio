
// Gemini API Key is handled by process.env now.
const TOPAZ_API_KEY_STORAGE_KEY = 'mythos_topaz_api_key_v2';
const HF_API_KEY_STORAGE_KEY = 'mythos_hf_api_key_v2';

export const getApiKey = (): string | null => {
  try {
    // Safely check for process and process.env before accessing API_KEY
    if (typeof process !== 'undefined' && process.env && typeof process.env.API_KEY === 'string') {
        return process.env.API_KEY;
    }
    // As a fallback, check for a global variable if the build system sets it differently
    // @ts-ignore
    if (typeof window !== 'undefined' && typeof window.GEMINI_API_KEY === 'string') {
        // @ts-ignore
        return window.GEMINI_API_KEY;
    }
    console.warn("API Key environment variable (process.env.API_KEY) is not defined or is not a string.");
    return null;
  } catch (error) {
    console.warn("Failed to access process.env or window.GEMINI_API_KEY, possibly not configured or runtime issue:", error);
    return null; // Don't throw, just return null
  }
};

// Topaz and HF keys are still managed via localStorage.
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