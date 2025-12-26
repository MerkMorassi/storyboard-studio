

import React, { useState, useEffect } from 'react';
import { EditIcon, ScriptIcon, DownloadIcon, ShuffleIcon } from './icons.tsx';
import { WandIcon } from './icons/WandIcon';
import { runScribeAgent, runScribeOutlineAgent, ScribeOutlineOutput } from '../services/geminiService';
import { simpleMarkdownToHtml } from '../utils/textFormatting';
import { generateRandomConfig } from '../services/scribeRandomizer';
import { LoadingSpinner } from './icons.tsx';

export const ScriptWriterStudio: React.FC = () => {
    // Blueprint Inputs
    const [initialTitle, setInitialTitle] = useState('DIGITAL EXTINCTION'); // User's initial title input
    const [genre, setGenre] = useState(''); // New: Genre selection
    const [theme, setTheme] = useState('Is memory reality?');
    const [setting, setSetting] = useState('Data Morgue / Server Farm');
    const [tone, setTone] = useState('Cyberpunk, Noir, Claustrophobic');
    const [cast, setCast] = useState('ROLE: HACKER | MOTIVATION: Survival\nROLE: AI CONSTRUCT | MOTIVATION: Evolution');
    const [beatSheet, setBeatSheet] = useState('## SCENE START\nACTION: Kael jacks into the console. He finds the file.\nCONFLICT: Security countermeasures activate.\nCLIMAX: Kael barely escapes, but Elara is corrupted.');
    
    // Outline Outputs (populated by "Execute Outline Protocol" or "Re-Roll Lattice")
    const [workingTitle, setWorkingTitle] = useState(''); // AI-generated/refined title
    const [logline, setLogline] = useState('');
    const [treatment, setTreatment] = useState('');
    const [fundamentalStoryQuestions, setFundamentalStoryQuestions] = useState('');
    const [archetypalCharacters, setArchetypalCharacters] = useState('');
    const [sceneGenerationQuestions, setSceneGenerationQuestions] = useState('');

    // Generation States
    const [genresData, setGenresData] = useState<Record<string, any>>({}); // To populate genre dropdown
    const [generatedOutline, setGeneratedOutline] = useState<ScribeOutlineOutput | null>(null);
    const [generatedScreenplay, setGeneratedScreenplay] = useState<string>('');
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isGeneratingScreenplay, setIsGeneratingScreenplay] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeOutputTab, setActiveOutputTab] = useState<'outline' | 'screenplay'>('outline');

    // Load genres.json for dropdown
    useEffect(() => {
        const loadGenresData = async () => {
            try {
                const res = await fetch('/data/writer/genres.json');
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                setGenresData(data);
                // Set a default genre if none is selected
                if (!genre && Object.keys(data).length > 0) {
                    setGenre(Object.keys(data)[0]);
                }
            } catch (e) {
                console.error("Failed to load genres data:", e);
                setError("Failed to load genre options. Please refresh.");
            }
        };
        loadGenresData();
    }, [genre]);


    const handleRandomize = async () => {
        try {
            setError(null);
            setGeneratedScreenplay('');
            setGeneratedOutline(null);
            
            const config = await generateRandomConfig();
            setInitialTitle(config.title); // Update initial title input
            setGenre(config.genre); // Update genre
            setTheme(config.theme);
            setSetting(config.setting);
            setTone(config.tone);
            setCast(config.cast);
            setBeatSheet(config.beatSheet);
            // Populate new outline fields with random placeholders too
            setWorkingTitle(config.workingTitle); // Update working title
            setLogline(config.logline);
            setTreatment(config.treatment);
            setFundamentalStoryQuestions(config.fundamentalStoryQuestions);
            setArchetypalCharacters(config.archetypalCharacters);
            setSceneGenerationQuestions(config.sceneGenerationQuestions);

        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to randomize configuration.");
        }
    };

    const handleExecuteOutlineProtocol = async () => {
        if (!initialTitle.trim() || !genre.trim() || !theme.trim() || !beatSheet.trim() || !cast.trim()) {
            setError("Working Title, Genre, Theme, Cast, and Scene Beats are required to generate an outline.");
            return;
        }

        setIsGeneratingOutline(true);
        setError(null);
        setGeneratedOutline(null);
        setGeneratedScreenplay('');

        try {
            const result = await runScribeOutlineAgent({
                title: initialTitle, genre, theme, setting, tone, cast, beatSheet
            });
            setGeneratedOutline(result);
            setWorkingTitle(result.workingTitle); // Update working title from AI
            setLogline(result.logline);
            setTreatment(result.treatment);
            setFundamentalStoryQuestions(result.fundamentalStoryQuestions.join('\n'));
            setArchetypalCharacters(result.archetypalCharacters.join('\n'));
            setSceneGenerationQuestions(result.sceneGenerationQuestions.join('\n'));
            setActiveOutputTab('outline');

        } catch (e) {
            setError(e instanceof Error ? e.message : "Outline generation failed.");
        } finally {
            setIsGeneratingOutline(false);
        }
    };

    const handleGenerateScreenplay = async () => {
        // Ensure all necessary fields are populated
        if (!workingTitle.trim() || !genre.trim() || !theme.trim() || !beatSheet.trim() || !logline.trim() || !treatment.trim() || 
            !fundamentalStoryQuestions.trim() || !archetypalCharacters.trim() || !sceneGenerationQuestions.trim()) 
        {
            setError("Please ensure all Outline fields are filled (or generated) before attempting to write the full screenplay.");
            return;
        }

        setIsGeneratingScreenplay(true);
        setError(null);
        setGeneratedScreenplay('');

        try {
            const result = await runScribeAgent({
                workingTitle, // Pass the refined working title
                genre,
                theme,
                setting,
                tone,
                cast,
                beatSheet,
                logline,
                treatment,
                fundamentalStoryQuestions,
                archetypalCharacters,
                sceneGenerationQuestions
            });
            setGeneratedScreenplay(result);
            setActiveOutputTab('screenplay');
        } catch (e) {
            setError(e instanceof Error ? e.message : "Screenplay generation failed.");
        } finally {
            setIsGeneratingScreenplay(false);
        }
    };

    const handleCopyToClipboard = (content: string) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = simpleMarkdownToHtml(content);
        const text = tempDiv.innerText;
        navigator.clipboard.writeText(text || content);
    };

    const handleDownloadScript = (content: string, filename: string) => {
        if (!content) return;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isOutlineReady = workingTitle.trim() && logline.trim() && treatment.trim() && fundamentalStoryQuestions.trim() && archetypalCharacters.trim() && sceneGenerationQuestions.trim();

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
                
                {/* Input Panel */}
                <div className="bg-secondary/30 p-6 rounded-xl border border-accent flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    {/* Blueprint Section */}
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ScriptIcon className="w-5 h-5 text-text-secondary" />
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">Blueprint</h3>
                        </div>
                        <button 
                            onClick={handleRandomize}
                            className="flex items-center gap-2 text-xs bg-brand/20 hover:bg-brand/30 text-brand-hover hover:text-white px-3 py-1.5 border border-brand/30 transition-colors uppercase tracking-widest rounded shadow-sm hover:shadow-lg hover:shadow-brand/20"
                            title="Generate a random story configuration"
                            disabled={isGeneratingOutline || isGeneratingScreenplay}
                        >
                            <ShuffleIcon className="w-4 h-4" />
                            <span>Re-Roll Lattice</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Initial Title</label>
                            <input 
                                type="text" 
                                value={initialTitle}
                                onChange={(e) => setInitialTitle(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none font-bold"
                                placeholder="PROJECT_ALPHA"
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Genre</label>
                            <select 
                                value={genre} 
                                onChange={(e) => setGenre(e.target.value)} 
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none"
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            >
                                {Object.keys(genresData).map(g => (
                                    <option key={g} value={g}>{g.replace(/_/g, ' ').toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Theme</label>
                            <input 
                                type="text" 
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none"
                                placeholder="Digital Extinction"
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Setting</label>
                            <input 
                                type="text" 
                                value={setting}
                                onChange={(e) => setSetting(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none"
                                placeholder="Neo-Tokyo Slums"
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Tone</label>
                        <input 
                            type="text" 
                            value={tone}
                            onChange={(e) => setTone(e.target.value)}
                            className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none"
                            placeholder="Cyberpunk Noir"
                            disabled={isGeneratingOutline || isGeneratingScreenplay}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Character Manifest</label>
                        <textarea 
                            value={cast}
                            onChange={(e) => setCast(e.target.value)}
                            className="w-full h-24 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-none leading-relaxed font-mono"
                            placeholder="NAME: Description, Role."
                            disabled={isGeneratingOutline || isGeneratingScreenplay}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Scene Beats</label>
                        <textarea 
                            value={beatSheet}
                            onChange={(e) => setBeatSheet(e.target.value)}
                            className="w-full h-48 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-none leading-relaxed font-mono"
                            placeholder="Describe the action and conflict of the scene..."
                            disabled={isGeneratingOutline || isGeneratingScreenplay}
                        />
                    </div>

                    {/* Outline Generation Section */}
                    <div className="flex flex-col gap-4 pt-6 border-t border-accent">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                            <WandIcon className="w-4 h-4 text-brand" /> Outline Protocol
                        </h3>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Working Title</label>
                            <input 
                                type="text" 
                                value={workingTitle}
                                onChange={(e) => setWorkingTitle(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none font-bold"
                                placeholder="AI-generated working title"
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Logline</label>
                            <input 
                                type="text" 
                                value={logline}
                                onChange={(e) => setLogline(e.target.value)}
                                className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none"
                                placeholder="A protagonist..."
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Treatment (1-2 pages)</label>
                            <textarea 
                                value={treatment}
                                onChange={(e) => setTreatment(e.target.value)}
                                className="w-full h-32 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-y"
                                placeholder="Lila, a renowned concert pianist..."
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Fundamental Story Questions</label>
                            <textarea 
                                value={fundamentalStoryQuestions}
                                onChange={(e) => setFundamentalStoryQuestions(e.target.value)}
                                className="w-full h-32 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-y font-mono"
                                placeholder="1. What is the protagonist's main goal?"
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Archetypal Characters</label>
                            <textarea 
                                value={archetypalCharacters}
                                onChange={(e) => setArchetypalCharacters(e.target.value)}
                                className="w-full h-32 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-y font-mono"
                                placeholder="- Protagonist - Lila, the retired concert pianist"
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Questions for Generating 40 Scenes</label>
                            <textarea 
                                value={sceneGenerationQuestions}
                                onChange={(e) => setSceneGenerationQuestions(e.target.value)}
                                className="w-full h-32 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-y font-mono"
                                placeholder="1. What is the tragic event from Lila's past?"
                                disabled={isGeneratingOutline || isGeneratingScreenplay}
                            />
                        </div>

                        {error && (
                            <div className="bg-red-900/20 border border-red-500/30 p-3 rounded text-xs text-red-300">
                                ERROR: {error}
                            </div>
                        )}

                        <button
                            onClick={handleExecuteOutlineProtocol}
                            disabled={isGeneratingOutline || isGeneratingScreenplay || !initialTitle.trim() || !genre.trim() || !theme.trim() || !beatSheet.trim()}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isGeneratingOutline ? (
                                <><LoadingSpinner className="w-4 h-4 text-white" /> Executing Outline Protocol...</>
                            ) : (
                                <>
                                    <WandIcon className="w-4 h-4" /> Execute Outline Protocol
                                </>
                            )}
                        </button>
                    </div>

                    <button
                        onClick={handleGenerateScreenplay}
                        disabled={isGeneratingScreenplay || isGeneratingOutline || !isOutlineReady}
                        className="w-full py-4 bg-brand hover:bg-brand-hover text-text-primary font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg hover:shadow-brand/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {isGeneratingScreenplay ? (
                            <><LoadingSpinner className="w-4 h-4 text-text-primary" /> Writing 40 Scenes...</>
                        ) : (
                            <>
                                <WandIcon className="w-4 h-4" /> Generate Screenplay (40 Scenes)
                            </>
                        )}
                    </button>
                </div>

                {/* Output Panel */}
                <div className="bg-secondary/30 p-6 rounded-xl border border-accent flex flex-col h-full overflow-hidden">
                    <div className="flex-shrink-0 flex items-center justify-between mb-4 border-b border-accent pb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">Output</h3>
                            {activeOutputTab === 'screenplay' && generatedScreenplay && <span className="text-[10px] text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-900/30">SCREENPLAY COMPLETE</span>}
                            {activeOutputTab === 'outline' && generatedOutline && <span className="text-[10px] text-blue-400 bg-blue-900/20 px-2 py-0.5 rounded border border-blue-900/30">OUTLINE READY</span>}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => handleCopyToClipboard(activeOutputTab === 'outline' && generatedOutline ? JSON.stringify(generatedOutline, null, 2) : generatedScreenplay)}
                                disabled={!generatedOutline && !generatedScreenplay}
                                className="text-xs font-bold text-text-secondary hover:text-text-primary disabled:opacity-30 transition-colors uppercase px-2 py-1 hover:bg-white/5 rounded"
                            >
                                Copy
                            </button>
                            <button
                                onClick={() => handleDownloadScript(activeOutputTab === 'outline' && generatedOutline ? JSON.stringify(generatedOutline, null, 2) : generatedScreenplay, activeOutputTab === 'outline' ? `${(workingTitle || initialTitle).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_outline.json` : `${(workingTitle || initialTitle).replace(/[^a-z0-9]/gi, '_').toLowerCase()}_screenplay.txt`)}
                                disabled={!generatedOutline && !generatedScreenplay}
                                className="text-xs font-bold text-brand hover:text-brand-hover disabled:opacity-30 transition-colors uppercase flex items-center gap-1 px-2 py-1 hover:bg-brand/10 rounded"
                            >
                                <DownloadIcon className="w-3 h-3" /> Download
                            </button>
                        </div>
                    </div>
                    
                    {/* Output Tabs */}
                    <div className="flex-shrink-0 flex items-center mb-4 bg-primary rounded-lg border border-accent overflow-hidden">
                        <button
                            onClick={() => setActiveOutputTab('outline')}
                            className={`flex-1 py-2 text-sm font-bold transition-colors ${activeOutputTab === 'outline' ? 'bg-accent text-text-primary' : 'text-text-secondary hover:bg-accent/50'}`}
                        >
                            Outline Report
                        </button>
                        <button
                            onClick={() => setActiveOutputTab('screenplay')}
                            className={`flex-1 py-2 text-sm font-bold transition-colors ${activeOutputTab === 'screenplay' ? 'bg-accent text-text-primary' : 'text-text-secondary hover:bg-accent/50'}`}
                        >
                            Screenplay Output
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar bg-primary rounded-lg border border-accent p-8 relative">
                        {activeOutputTab === 'outline' ? (
                            generatedOutline ? (
                                <div className="font-mono text-sm leading-relaxed text-text-primary max-w-none prose prose-invert prose-p:my-2 prose-headings:font-bold prose-headings:text-text-primary prose-strong:text-text-primary whitespace-pre-wrap">
                                    <h3 className="text-lg font-bold text-blue-400">Working Title</h3>
                                    <p>{generatedOutline.workingTitle}</p>
                                    <h3 className="text-lg font-bold text-blue-400 mt-4">Logline</h3>
                                    <p>{generatedOutline.logline}</p>
                                    <h3 className="text-lg font-bold text-blue-400 mt-4">Treatment</h3>
                                    <div dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(generatedOutline.treatment) }} />
                                    <h3 className="text-lg font-bold text-blue-400 mt-4">Fundamental Story Development Questions</h3>
                                    <ul>
                                        {generatedOutline.fundamentalStoryQuestions.map((q, i) => <li key={i}>{q}</li>)}
                                    </ul>
                                    <h3 className="text-lg font-bold text-blue-400 mt-4">Archetypal Characters</h3>
                                    <ul>
                                        {generatedOutline.archetypalCharacters.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                    <h3 className="text-lg font-bold text-blue-400 mt-4">Questions for Generating 40 Scenes</h3>
                                    <ul>
                                        {generatedOutline.sceneGenerationQuestions.map((s, i) => <li key={i}>{s}</li>)}
                                    </ul>
                                </div>
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary opacity-30 select-none pointer-events-none">
                                    <ScriptIcon className="w-24 h-24 mb-4" />
                                    <p className="text-4xl font-black mb-2 opacity-50">OUTLINE</p>
                                    <p className="text-xs font-mono uppercase tracking-widest">Awaiting Outline Protocol Execution</p>
                                </div>
                            )
                        ) : ( /* Screenplay Output Tab */
                            generatedScreenplay ? (
                                <div 
                                    className="font-mono text-sm leading-relaxed text-text-primary max-w-none prose prose-invert prose-p:my-2 prose-headings:font-bold prose-headings:text-text-primary prose-strong:text-text-primary whitespace-pre-wrap"
                                    dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(generatedScreenplay) }}
                                />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-text-secondary opacity-30 select-none pointer-events-none">
                                    <div className="w-24 h-32 border-2 border-dashed border-current rounded mb-4"></div>
                                    <p className="text-4xl font-black mb-2 opacity-50">FADE IN:</p>
                                    <p className="text-xs font-mono uppercase tracking-widest">Waiting for Screenplay Generation</p>
                                </div>
                            )
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};