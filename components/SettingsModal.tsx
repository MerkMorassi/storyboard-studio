
import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (geminiApiKey: string) => void;
  currentApiKey: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentApiKey }) => {
  const [apiKeyInput, setApiKeyInput] = useState(currentApiKey);

  useEffect(() => {
    setApiKeyInput(currentApiKey);
  }, [currentApiKey, isOpen]);

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
    onSave(apiKeyInput.trim());
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-neutral-800 shadow-2xl p-6 w-full max-w-lg border border-neutral-700 rounded-lg"
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
          <div>
            <label htmlFor="api-key" className="block text-sm font-medium text-neutral-300 mb-2">
              Google API Key
            </label>
            <input
              type="password"
              id="api-key"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="Enter your Google Cloud API Key"
              className="w-full"
            />
          </div>

          <div className="bg-neutral-900/50 p-4 border border-neutral-700 text-sm text-neutral-400 space-y-3 rounded-md">
            <h3 className="font-bold text-neutral-200">Resolving "Quota Exceeded" Errors</h3>
            <p>
              If you see a "free_tier" quota error, it means you are using a key from Google AI Studio. As a paid customer, you must use an API key from a <strong className="text-neutral-200">Google Cloud Platform (GCP)</strong> project that has billing enabled.
            </p>
            <ol className="list-decimal list-inside space-y-2">
              <li>Ensure your GCP project has <strong className="text-neutral-200">billing enabled</strong>.</li>
              <li>In that project, enable the <strong className="text-neutral-200">"Generative Language API"</strong> or <strong className="text-neutral-200">"Vertex AI API"</strong>.</li>
              <li>Create and copy an API key from the link below.</li>
            </ol>
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
            className="px-4 py-2 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};