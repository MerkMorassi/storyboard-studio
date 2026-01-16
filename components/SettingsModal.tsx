import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (topazApiKey: string, hfApiKey: string, geminiApiKey: string, voiceLabUrl: string) => void;
  currentTopazApiKey: string;
  currentHfApiKey: string;
  currentGeminiApiKey: string;
  currentVoiceLabUrl: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, currentTopazApiKey, currentHfApiKey, currentGeminiApiKey, currentVoiceLabUrl }) => {
  const [topazApiKeyInput, setTopazApiKeyInput] = useState(currentTopazApiKey);
  const [hfApiKeyInput, setHfApiKeyInput] = useState(currentHfApiKey);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState(currentGeminiApiKey);
  const [voiceLabUrlInput, setVoiceLabUrlInput] = useState(currentVoiceLabUrl);
  const [showKeys, setShowKeys] = useState(false);

  useEffect(() => {
    setTopazApiKeyInput(currentTopazApiKey);
    setHfApiKeyInput(currentHfApiKey);
    setGeminiApiKeyInput(currentGeminiApiKey);
    setVoiceLabUrlInput(currentVoiceLabUrl);
  }, [currentTopazApiKey, currentHfApiKey, currentGeminiApiKey, currentVoiceLabUrl, isOpen]);

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
    onSave(topazApiKeyInput.trim(), hfApiKeyInput.trim(), geminiApiKeyInput.trim(), voiceLabUrlInput.trim());
  };

  return (
    <div 
      className="fixed inset-0 bg-black/85 z-[100] flex items-center justify-center p-4 backdrop-blur-md"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-neutral-900 shadow-2xl p-8 w-full max-w-lg border border-neutral-700 rounded-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-white uppercase tracking-tight">System Auth</h2>
            <p className="text-xs text-neutral-500 font-mono">Persistent Authentication Buffer</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-neutral-500 hover:text-white transition-colors p-2"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="space-y-8">
          {/* Gemini Key */}
          <div>
            <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest mb-3">
              Google Gemini API Key (Critical)
            </label>
            <input
              type={showKeys ? "text" : "password"}
              value={geminiApiKeyInput}
              onChange={(e) => setGeminiApiKeyInput(e.target.value)}
              placeholder="AI Studio Key (AI...)"
              className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
            />
            <p className="text-[10px] text-neutral-600 mt-2 italic px-1">
              Required for all text, reasoning, and standard agent operations.
            </p>
          </div>

          <div className="h-px bg-neutral-800 w-full"></div>

          {/* Hugging Face */}
          <div>
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">
              Hugging Face Access Token
            </label>
            <input
              type={showKeys ? "text" : "password"}
              value={hfApiKeyInput}
              onChange={(e) => setHfApiKeyInput(e.target.value)}
              placeholder="Enter HF Access Token (hf_...)"
              className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
            />
            <p className="text-[10px] text-neutral-600 mt-2 italic px-1">
              Required for specialized GPU tasks (Flux, Video, Outpainting, Private Models).
            </p>
          </div>

          {/* Voice Lab URL */}
          <div>
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">
              Voice Lab URL (Gradio)
            </label>
            <input
              type={showKeys ? "text" : "password"}
              value={voiceLabUrlInput}
              onChange={(e) => setVoiceLabUrlInput(e.target.value)}
              placeholder="Enter HF Space or Gradio URL for XTTS"
              className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
            />
            <p className="text-[10px] text-neutral-600 mt-2 italic px-1">
              Required for the Voice Lab Studio. Points to a Gradio service running a voice synthesis model like XTTSv2.
            </p>
          </div>

          {/* Topaz */}
          <div>
            <label className="block text-[10px] font-black text-neutral-500 uppercase tracking-widest mb-3">
              Topaz Labs API Key
            </label>
            <input
              type={showKeys ? "text" : "password"}
              value={topazApiKeyInput}
              onChange={(e) => setTopazApiKeyInput(e.target.value)}
              placeholder="Enter Topaz API Key"
              className="w-full bg-black border border-neutral-800 rounded-xl p-4 text-neutral-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono text-sm shadow-inner"
            />
          </div>

          <div className="flex items-center gap-2 px-1">
            <input 
              type="checkbox" 
              id="show-keys" 
              checked={showKeys} 
              onChange={() => setShowKeys(!showKeys)}
              className="accent-blue-600"
            />
            <label htmlFor="show-keys" className="text-xs text-neutral-400 cursor-pointer">Reveal Keys</label>
          </div>
        </div>

        <div className="mt-10 flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 py-4 text-xs font-black uppercase tracking-widest rounded-xl hover:bg-neutral-800 transition-colors text-neutral-500 hover:text-white border border-neutral-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-95"
          >
            Commit to Disk
          </button>
        </div>
      </div>
    </div>
  );
};