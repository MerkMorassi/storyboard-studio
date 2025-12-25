import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { generateRandomConfig, ScribeConfig } from '../services/scribeRandomizer';
import { runScribeAgent } from '../services/geminiService';
import { WandIcon, DuplicateIcon, VideoIcon } from './icons'; // Adjust icon imports as needed

const ScriptingStudio: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>("");
  
  // State for the Writer's Blueprint
  const [config, setConfig] = useState<ScribeConfig>({
    title: "",
    theme: "",
    setting: "",
    tone: "",
    cast: "",
    beatSheet: ""
  });

  // 1. THE CHAOS ENGINE: Calls your new Randomizer
  const handleRandomize = () => {
    const newConfig = generateRandomConfig();
    setConfig(newConfig);
    setOutput(""); // Clear previous script to avoid confusion
  };

  // 2. THE SCRIBE ENGINE: Calls Gemini with the Lore Pack
  const handleGenerate = async () => {
    if (!config.beatSheet) return;
    
    setLoading(true);
    try {
      const script = await runScribeAgent(config);
      setOutput(script);
    } catch (error) {
      console.error("Script generation failed:", error);
      setOutput("ERROR: The Scribe disconnected. Check API Key or Console logs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen bg-gray-900 text-white overflow-hidden">
      
      {/* LEFT PANEL: THE BLUEPRINT (Inputs) */}
      <div className="w-full lg:w-1/3 p-6 flex flex-col gap-6 border-r border-gray-800 overflow-y-auto custom-scrollbar">
        
        {/* Header & Controls */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-green-400">MYTHOS SCRIBE</h2>
            <p className="text-xs text-gray-500 font-mono mt-1">NARRATIVE ENGINE V3.0</p>
          </div>
          
          <button 
            onClick={handleRandomize}
            className="flex items-center gap-2 bg-gray-800 hover:bg-green-900 text-green-400 border border-green-800 px-4 py-2 rounded text-xs uppercase tracking-widest transition-all hover:shadow-[0_0_15px_rgba(74,222,128,0.2)]"
          >
            <DuplicateIcon className="w-4 h-4" />
            <span>Re-Roll Lattice</span>
          </button>
        </div>

        {/* Input Fields */}
        <div className="space-y-4">
          
          {/* Title */}
          <div>
            <label className="text-xs font-mono text-gray-500 uppercase">Working Title</label>
            <input 
              type="text" 
              value={config.title}
              onChange={(e) => setConfig({...config, title: e.target.value})}
              className="w-full bg-black/50 border border-gray-700 text-white p-2 text-sm focus:border-green-500 outline-none rounded mt-1 font-mono"
            />
          </div>

          {/* Theme & Tone Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono text-gray-500 uppercase">Theme ID</label>
              <input 
                type="text" 
                value={config.theme} 
                onChange={(e) => setConfig({...config, theme: e.target.value})}
                className="w-full bg-black/50 border border-gray-700 text-gray-300 p-2 text-xs focus:border-green-500 outline-none rounded mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-mono text-gray-500 uppercase">Tone</label>
              <input 
                type="text" 
                value={config.tone} 
                onChange={(e) => setConfig({...config, tone: e.target.value})}
                className="w-full bg-black/50 border border-gray-700 text-gray-300 p-2 text-xs focus:border-green-500 outline-none rounded mt-1"
              />
            </div>
          </div>

          {/* Setting */}
          <div>
            <label className="text-xs font-mono text-gray-500 uppercase">Setting</label>
            <input 
              type="text" 
              value={config.setting}
              onChange={(e) => setConfig({...config, setting: e.target.value})}
              className="w-full bg-black/50 border border-gray-700 text-gray-300 p-2 text-sm focus:border-green-500 outline-none rounded mt-1"
            />
          </div>

          {/* Cast Manifest */}
          <div>
            <label className="text-xs font-mono text-gray-500 uppercase">Cast Manifest</label>
            <textarea 
              rows={4}
              value={config.cast}
              onChange={(e) => setConfig({...config, cast: e.target.value})}
              className="w-full bg-black/50 border border-gray-700 text-gray-300 p-2 text-xs font-mono focus:border-green-500 outline-none rounded mt-1 resize-none"
            />
          </div>

          {/* Beat Sheet (The Prompt) */}
          <div className="flex-grow">
            <label className="text-xs font-mono text-gray-500 uppercase">Sequence Beat Sheet</label>
            <textarea 
              rows={8}
              value={config.beatSheet}
              onChange={(e) => setConfig({...config, beatSheet: e.target.value})}
              className="w-full bg-black/50 border border-gray-700 text-gray-300 p-2 text-xs font-mono focus:border-green-500 outline-none rounded mt-1 resize-none h-48"
            />
          </div>

          {/* EXECUTE BUTTON */}
          <button 
            onClick={handleGenerate}
            disabled={loading}
            className={`w-full py-4 text-sm uppercase tracking-[0.2em] font-bold border transition-all
              ${loading 
                ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' 
                : 'bg-green-900/20 border-green-600 text-green-400 hover:bg-green-900/40 hover:shadow-[0_0_20px_rgba(74,222,128,0.2)]'
              }`}
          >
            {loading ? "/// TRANSMITTING TO SCRIBE..." : ">>> EXECUTE PROTOCOL"}
          </button>
        </div>
      </div>

      {/* RIGHT PANEL: THE SCRIPT (Output) */}
      <div className="w-full lg:w-2/3 bg-black relative flex flex-col">
        {/* Top Bar */}
        <div className="h-12 border-b border-gray-800 flex items-center justify-between px-6 bg-gray-900/50">
          <span className="text-xs font-mono text-gray-500 uppercase">Output Log // Format: WB_Standard</span>
          {output && (
             <span className="text-xs text-green-500 font-mono animate-pulse">● LIVE CONNECTION</span>
          )}
        </div>

        {/* Script Content */}
        <div className="flex-grow overflow-y-auto p-8 lg:p-12 custom-scrollbar bg-black">
          {output ? (
            <div className="prose prose-invert max-w-3xl mx-auto font-mono text-sm leading-relaxed text-gray-300 whitespace-pre-wrap script-font">
               {/* Use rehypeRaw to render <center> tags if the AI uses them */}
               <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                 {output}
               </ReactMarkdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-50 select-none">
              <VideoIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm font-mono tracking-widest uppercase">Awaiting Narrative Input</p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default ScriptingStudio;
