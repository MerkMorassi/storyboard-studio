
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (geminiApiKey: string, topazApiKey: string, hfApiKey: string) => void;
  currentApiKey: string;
  currentTopazApiKey: string;
  currentHfApiKey: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentApiKey, currentTopazApiKey, currentHfApiKey }) => {
  const [apiKeyInput, setApiKeyInput] = useState(currentApiKey);
  const [topazApiKeyInput, setTopazApiKeyInput] = useState(currentTopazApiKey);
  const [hfApiKeyInput, setHfApiKeyInput] = useState(currentHfApiKey);

  // Lock states to protect keys
  const [isGeminiLocked, setIsGeminiLocked] = useState(!!currentApiKey);
  const [isTopazLocked, setIsTopazLocked] = useState(!!currentTopazApiKey);
  const [isHfLocked, setIsHfLocked] = useState(!!currentHfApiKey);

  useEffect(() => {
    setApiKeyInput(currentApiKey);
    setIsGeminiLocked(!!currentApiKey);

    setTopazApiKeyInput(currentTopazApiKey);
    setIsTopazLocked(!!currentTopazApiKey);

    setHfApiKeyInput(currentHfApiKey);
    setIsHfLocked(!!currentHfApiKey);
  }, [currentApiKey, currentTopazApiKey, currentHfApiKey, isOpen]);

  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) {
    return null;
  }

  const handleSave = () => {
    // Defensive Saving: If the input is locked, use the original 'current' key prop.
    // This prevents saving empty strings if the input state accidentally got desynced while locked.
    const finalGemini = isGeminiLocked ? currentApiKey : apiKeyInput.trim();
    const finalTopaz = isTopazLocked ? currentTopazApiKey : topazApiKeyInput.trim();
    const finalHf = isHfLocked ? currentHfApiKey : hfApiKeyInput.trim();

    onSave(finalGemini, finalTopaz, finalHf);
  };

  const LockedInput: React.FC<{ label: string, onUnlock: () => void }> = ({ label, onUnlock }) => (
      <div>
          <label className="block text-sm font-medium text-neutral-300 mb-2">{label}</label>
          <div className="flex gap-2">
              <input
                  type="text"
                  value="••••••••••••••••••••••••••••••"
                  disabled
                  className="w-full bg-neutral-900/50 border border-neutral-700 rounded p-2 text-neutral-500 cursor-not-allowed select-none"
              />
              <button
                  onClick={onUnlock}
                  className="px-3 py-2 bg-neutral-700 hover:bg-neutral-600 text-white text-sm font-medium rounded transition-colors"
              >
                  Change
              </button>
          </div>
          <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
              Key stored securely
          </p>
      </div>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-neutral-800 shadow-2xl p-6 w-full max-w-lg border border-neutral-700 rounded-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 id="settings-title" className="text-xl font-bold text-white">Settings</h2>
          <button 
            onClick={onClose} 
            className="text-neutral-400 hover:text-white transition-colors"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-6">
          
          {isGeminiLocked ? (
              <LockedInput label="Google API Key (Gemini)" onUnlock={() => setIsGeminiLocked(false)} />
          ) : (
              <div>
                <label htmlFor="api-key" className="block text-sm font-medium text-neutral-300 mb-2">
                  Google API Key (Gemini)
                </label>
                <input
                  type="password"
                  id="api-key"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="Enter your Google Cloud API Key"
                  className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-neutral-200 focus:border-blue-500 focus:outline-none"
                />
              </div>
          )}

          {isTopazLocked ? (
              <LockedInput label="Topaz Labs API Key" onUnlock={() => setIsTopazLocked(false)} />
          ) : (
              <div>
                 <label htmlFor="topaz-api-key" className="block text-sm font-medium text-neutral-300 mb-2">
                  Topaz Labs API Key
                </label>
                <input
                  type="password"
                  id="topaz-api-key"
                  value={topazApiKeyInput}
                  onChange={(e) => setTopazApiKeyInput(e.target.value)}
                  placeholder="Enter your Topaz API Key"
                  className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-neutral-200 focus:border-blue-500 focus:outline-none"
                />
                 <p className="text-xs text-neutral-500 mt-1">Required for Enhance, Sharpen, and Denoise studios.</p>
              </div>
          )}

          {isHfLocked ? (
              <LockedInput label="Hugging Face Access Token" onUnlock={() => setIsHfLocked(false)} />
          ) : (
              <div>
                 <label htmlFor="hf-api-key" className="block text-sm font-medium text-neutral-300 mb-2">
                  Hugging Face Access Token
                </label>
                <input
                  type="password"
                  id="hf-api-key"
                  value={hfApiKeyInput}
                  onChange={(e) => setHfApiKeyInput(e.target.value)}
                  placeholder="Enter your HF Access Token"
                  className="w-full bg-neutral-900 border border-neutral-600 rounded p-2 text-neutral-200 focus:border-blue-500 focus:outline-none"
                />
                 <p className="text-xs text-neutral-500 mt-1">
                    Required for Generative Video. <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">Get Token</a>
                 </p>
              </div>
          )}

          <div className="bg-neutral-900/50 p-4 border border-neutral-700 text-sm text-neutral-400 space-y-3 rounded-md">
            <h3 className="font-bold text-neutral-200">Resolving "Quota Exceeded" Errors</h3>
            <p>
              If you see a "free_tier" quota error, it means you are using a key from Google AI Studio. As a paid customer, you must use an API key from a <strong className="text-neutral-200">Google Cloud Platform (GCP)</strong> project that has billing enabled.
            </p>
            <a 
              href="https://console.cloud.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="font-bold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Go to Google Cloud Credentials &rarr;
            </a>
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded hover:bg-neutral-700 transition-colors text-neutral-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500 rounded transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};