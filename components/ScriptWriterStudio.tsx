
import React, { useState } from 'react';
import { EditIcon, ScriptIcon, DownloadIcon, ShuffleIcon } from './icons.tsx';
import { WandIcon } from './icons/WandIcon';
import { runScribeAgent } from '../services/geminiService';
import { simpleMarkdownToHtml } from '../utils/textFormatting';
import { generateRandomConfig } from '../services/scribeRandomizer';

export const ScriptWriterStudio: React.FC = () => {
    const [title, setTitle] = useState('DIGITAL EXTINCTION');
    const [theme, setTheme] = useState('Is memory reality?');
    const [setting, setSetting] = useState('Data Morgue / Server Farm');
    const [tone, setTone] = useState('Cyberpunk, Noir, Claustrophobic');
    const [cast, setCast] = useState('ROLE: HACKER | MOTIVATION: Survival\nROLE: AI CONSTRUCT | MOTIVATION: Evolution');
    const [beatSheet, setBeatSheet] = useState('## SCENE START\nACTION: Kael jacks into the console. He finds the file.\nCONFLICT: Security countermeasures activate.\nCLIMAX: Kael barely escapes, but Elara is corrupted.');
    
    const [generatedScript, setGeneratedScript] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleExecuteProtocol = async () => {
        if (!title || !theme || !beatSheet) {
            setError("Title, Theme, and Beat Sheet are strictly required for protocol execution.");
            return;
        }

        setIsGenerating(true);
        setError(null);
        setGeneratedScript('');

        try {
            // Uses gemini-3-pro-preview via existing service
            const result = await runScribeAgent({
                title,
                theme,
                setting,
                tone,
                cast,
                beatSheet
            });
            setGeneratedScript(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Execution failed.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleRandomize = async () => { // Make this async
        try {
            const config = await generateRandomConfig(); // Await the async function
            setTitle(config.title);
            setTheme(config.theme);
            setSetting(config.setting);
            setTone(config.tone);
            setCast(config.cast);
            setBeatSheet(config.beatSheet);
            setError(null);
            setGeneratedScript(''); // Clear old output on new roll
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to randomize configuration.");
        }
    };

    const handleCopyToClipboard = () => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = simpleMarkdownToHtml(generatedScript);
        const text = tempDiv.innerText;
        navigator.clipboard.writeText(text || generatedScript);
    };

    const handleDownloadScript = () => {
        if (!generatedScript) return;
        const blob = new Blob([generatedScript], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_script.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            {/* Standard Header */}
            <div className="flex-shrink-0">
                <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
                    <EditIcon className="w-8 h-8 text-brand" />
                    Script Writer Studio
                </h2>
                <p className="text-text-secondary">
                    MythOS Scribe: Generates industry-standard speculative screenplays from narrative blueprints.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow min-h-0">
                
                {/* Input Panel (Standard Styling) */}
                <div className="bg-secondary/30 p-6 rounded-xl border border-accent flex flex-col gap-6 overflow-y-auto custom-scrollbar h-fit">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ScriptIcon className="w-5 h-5 text-text-secondary" />
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">Blueprint</h3>
                        </div>
                        <button 
                            onClick={handleRandomize}
                            className="flex items-center gap-2 text-xs bg-brand/20 hover:bg-brand/30 text-brand-hover hover:text-white px-3 py-1.5 border border-brand/30 transition-colors uppercase tracking-widest rounded shadow-sm hover:shadow-lg hover:shadow-brand/20"
                            title="Generate a random story configuration"
                        >
                            <ShuffleIcon className="w-4 h-4" />
                            <span>Re-Roll Lattice</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Title</label>
                            <input 
                                type="text" 
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none font-bold"
                                placeholder="PROJECT_ALPHA"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Theme</label>
                            <input 
                                type="text" 
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none"
                                placeholder="Digital Extinction"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Setting</label>
                            <input 
                                type="text" 
                                value={setting}
                                onChange={(e) => setSetting(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none"
                                placeholder="Neo-Tokyo Slums"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Tone</label>
                            <input 
                                type="text" 
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none"
                                placeholder="Cyberpunk Noir"
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Character Manifest</label>
                        <textarea 
                            value={cast}
                            onChange={(e) => setCast(e.target.value)}
                            className="w-full h-24 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-none leading-relaxed font-mono"
                            placeholder="NAME: Description, Role."
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Scene Beats</label>
                        <textarea 
                            value={beatSheet}
                            onChange={(e) => setBeatSheet(e.target.value)}
                            className="w-full h-48 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-none leading-relaxed font-mono"
                            placeholder="Describe the action and conflict of the scene..."
                        />
                    </div>

                    {error && (
                        <div className="bg-red-900/20 border border-red-500/30 p-3 rounded text-xs text-red-300">
                            ERROR: {error}
                        </div>
                    )}

                    <button
                        onClick={handleExecuteProtocol}
                        disabled={isGenerating}
                        className="w-full py-4 bg-brand hover:bg-brand-hover text-text-primary font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isGenerating ? (
                            <span className="animate-pulse">Writing Screenplay...</span>
                        ) : (
                            <>
                                <WandIcon className="w-4 h-4" /> Generate Script
                            </>
                        )}
                    </button>
                </div>

                {/* Output Panel (Standard Styling but Monospace for Script) */}
                <div className="bg-secondary/30 p-6 rounded-xl border border-accent flex flex-col h-full overflow-hidden">
                    <div className="flex items-center justify-between mb-4 border-b border-accent pb-2 flex-shrink-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">Screenplay Output</h3>
                            {generatedScript && <span className="text-[10px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-900/30">COMPLETE</span>}
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleCopyToClipboard}
                                disabled={!generatedScript}
                                className="text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors uppercase px-2 py-1 hover:bg-white/5 rounded"
                            >
                                Copy
                            </button>
                            <button 
                                onClick={handleDownloadScript}
                                disabled={!generatedScript}
                                className="text-xs font-bold text-brand hover:text-brand-hover disabled:opacity-30 transition-colors uppercase flex items-center gap-1 px-2 py-1 hover:bg-brand/10 rounded"
                            >
                                <DownloadIcon className="w-3 h-3" /> Download
                            </button>
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar bg-primary rounded-lg border border-accent p-8 relative">
                        {generatedScript ? (
                            <div 
                                className="font-mono text-sm leading-relaxed text-text-primary max-w-none prose prose-invert prose-p:my-2 prose-headings:font-bold prose-headings:text-text-primary prose-strong:text-text-primary whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(generatedScript) }}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary opacity-30 select-none pointer-events-none">
                                <div className="w-24 h-32 border-2 border-dashed border-current rounded mb-4"></div>
                                <p className="text-4xl font-black mb-2 opacity-50">FADE IN:</p>
                                <p className="text-xs font-mono uppercase tracking-widest">Waiting for Input Protocol</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};