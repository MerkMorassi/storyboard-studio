
// Gemini API Key is handled by process.env now.
const TOPAZ_API_KEY_STORAGE_KEY = 'mythos_topaz_api_key_v2';
const HF_API_KEY_STORAGE_KEY = 'mythos_hf_api_key_v2';

export const getApiKey = (): string | null => {
  // Fix: Strictly obtain API key from environment variable as required.
  return process.env.API_KEY || null;
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
