
import React, { useState, useEffect } from 'react';
import { EditIcon, ScriptIcon, DownloadIcon, ShuffleIcon, LibraryIcon } from './icons.tsx';
import { DuplicateIcon } from './icons/DuplicateIcon';
import { WandIcon } from './icons/WandIcon';
import { runScribeAgent, runScribeOutlineAgent, ScribeOutlineOutput } from '../services/geminiService';
import { simpleMarkdownToHtml } from '../utils/textFormatting';
import { generateRandomConfig } from '../services/scribeRandomizer';
import { LoadingSpinner } from './icons.tsx';
import { ScriptFile, ActiveView } from '../types';

interface ScriptWriterStudioProps {
    onSendToScriptsBin: (script: Omit<ScriptFile, 'id' | 'date'>) => void;
    onNavigate: (view: ActiveView) => void;
}

/**
 * Formats a raw screenplay string into Warner Bros. Standard formatting (approximate for TXT).
 */
const formatToWBStandard = (text: string): string => {
    return text.split('\n').map(line => {
        const trimmed = line.trim();
        if (!trimmed) return '';

        // Character Name: Approx 3.5 inches from left (35 spaces)
        if (trimmed === trimmed.toUpperCase() && !trimmed.startsWith('INT.') && !trimmed.startsWith('EXT.') && !trimmed.includes(':') && trimmed.length < 30) {
            return ' '.repeat(35) + trimmed;
        }
        
        // Parenthetical: Approx 3.0 inches (30 spaces)
        if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
            return ' '.repeat(30) + trimmed;
        }

        // Dialogue: Approx 2.5 inches (25 spaces)
        // If the line before was a character or parenthetical, and this isn't uppercase/slug
        // We'll use a simpler heuristic: If it's not all caps and not slugline
        if (trimmed !== trimmed.toUpperCase() && !trimmed.startsWith('(')) {
             return ' '.repeat(25) + trimmed;
        }

        // Sluglines & Action: Approx 1.5 inches (15 spaces)
        return ' '.repeat(15) + trimmed;
    }).join('\n');
};

export const ScriptWriterStudio: React.FC<ScriptWriterStudioProps> = ({ onSendToScriptsBin, onNavigate }) => {
    // Blueprint Inputs
    const [initialTitle, setInitialTitle] = useState('DIGITAL EXTINCTION');
    const [genre, setGenre] = useState('');
    const [theme, setTheme] = useState('Is memory reality?');
    const [setting, setSetting] = useState('Data Morgue / Server Farm');
    const [tone, setTone] = useState('Cyberpunk, Noir, Claustrophobic');
    const [cast, setCast] = useState('ROLE: HACKER | MOTIVATION: Survival\nROLE: AI CONSTRUCT | MOTIVATION: Evolution');
    const [beatSheet, setBeatSheet] = useState('## SCENE START\nACTION: Kael jacks into the console. He finds the file.\nCONFLICT: Security countermeasures activate.\nCLIMAX: Kael barely escapes, but Elara is corrupted.');
    
    // Outline Outputs
    const [workingTitle, setWorkingTitle] = useState('');
    const [logline, setLogline] = useState('');
    const [treatment, setTreatment] = useState('');
    const [fundamentalStoryQuestions, setFundamentalStoryQuestions] = useState('');
    const [archetypalCharacters, setArchetypalCharacters] = useState('');
    const [sceneGenerationQuestions, setSceneGenerationQuestions] = useState('');

    // Generation States
    const [genresData, setGenresData] = useState<Record<string, any>>({});
    const [generatedOutline, setGeneratedOutline] = useState<ScribeOutlineOutput | null>(null);
    const [generatedScreenplay, setGeneratedScreenplay] = useState<string>('');
    const [isGeneratingOutline, setIsGeneratingOutline] = useState(false);
    const [isGeneratingScreenplay, setIsGeneratingScreenplay] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeOutputTab, setActiveOutputTab] = useState<'outline' | 'screenplay'>('outline');
    const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

    useEffect(() => {
        const loadGenresData = async () => {
            try {
                const res = await fetch('/data/writer/genres.json');
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                setGenresData(data);
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

    const showCopyFeedback = (msg: string) => {
        setCopyFeedback(msg);
        setTimeout(() => setCopyFeedback(null), 2000);
    };

    const handleCopyBlueprint = () => {
        const blueprint = `BLUEPRINT: ${initialTitle}\nGENRE: ${genre.toUpperCase()}\nTHEME: ${theme}\nSETTING: ${setting}\nTONE: ${tone}\n\nCAST:\n${cast}\n\nBEATS:\n${beatSheet}`;
        navigator.clipboard.writeText(blueprint);
        showCopyFeedback("Blueprint Copied");
    };

    const handleRandomize = async () => {
        try {
            setError(null);
            setGeneratedScreenplay('');
            setGeneratedOutline(null);
            
            const config = await generateRandomConfig();
            setInitialTitle(config.title);
            setGenre(config.genre);
            setTheme(config.theme);
            setSetting(config.setting);
            setTone(config.tone);
            setCast(config.cast);
            setBeatSheet(config.beatSheet);
            setWorkingTitle(config.workingTitle);
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
            setError("Title, Genre, Theme, Cast, and Beats are required.");
            return;
        }
        setIsGeneratingOutline(true);
        setError(null);
        try {
            const result = await runScribeOutlineAgent({ title: initialTitle, genre, theme, setting, tone, cast, beatSheet });
            setGeneratedOutline(result);
            setWorkingTitle(result.workingTitle);
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
        if (!workingTitle.trim() || !isOutlineReady) {
            setError("Please ensure all Outline fields are filled.");
            return;
        }
        setIsGeneratingScreenplay(true);
        setError(null);
        try {
            const result = await runScribeAgent({ workingTitle, genre, theme, setting, tone, cast, beatSheet, logline, treatment, fundamentalStoryQuestions, archetypalCharacters, sceneGenerationQuestions });
            setGeneratedScreenplay(result);
            setActiveOutputTab('screenplay');
        } catch (e) {
            setError(e instanceof Error ? e.message : "Screenplay generation failed.");
        } finally {
            setIsGeneratingScreenplay(false);
        }
    };

    const handleCopyContent = () => {
        let content = '';
        if (activeOutputTab === 'outline' && generatedOutline) {
            content = `TITLE: ${generatedOutline.workingTitle}\nLOGLINE: ${generatedOutline.logline}\n\nTREATMENT:\n${generatedOutline.treatment}\n\nQUESTIONS:\n${generatedOutline.fundamentalStoryQuestions.join('\n')}\n\nARCHETYPES:\n${generatedOutline.archetypalCharacters.join('\n')}\n\nSCENE QUESTIONS:\n${generatedOutline.sceneGenerationQuestions.join('\n')}`;
        } else if (activeOutputTab === 'screenplay' && generatedScreenplay) {
            content = formatToWBStandard(generatedScreenplay);
        }
        navigator.clipboard.writeText(content);
        showCopyFeedback("Copied to Clipboard");
    };

    const handleDownload = () => {
        let content = '';
        let filename = '';
        if (activeOutputTab === 'outline' && generatedOutline) {
            content = `OUTLINE: ${generatedOutline.workingTitle}\n\nLOGLINE: ${generatedOutline.logline}\n\nTREATMENT:\n${generatedOutline.treatment}\n\nQUESTIONS:\n${generatedOutline.fundamentalStoryQuestions.join('\n')}\n\nARCHETYPES:\n${generatedOutline.archetypalCharacters.join('\n')}`;
            filename = `${generatedOutline.workingTitle.replace(/ /g, '_')}_Outline.txt`;
        } else if (activeOutputTab === 'screenplay' && generatedScreenplay) {
            content = formatToWBStandard(generatedScreenplay);
            filename = `${workingTitle.replace(/ /g, '_')}_Draft.txt`;
        }
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleSendToBin = () => {
        if (!generatedScreenplay) return;
        onSendToScriptsBin({
            title: workingTitle || initialTitle,
            content: formatToWBStandard(generatedScreenplay),
            type: 'screenplay'
        });
        showCopyFeedback("Sent to Scripts Bin");
    };

    const isOutlineReady = workingTitle.trim() && logline.trim() && treatment.trim() && fundamentalStoryQuestions.trim() && archetypalCharacters.trim();

    return (
        <div className="p-6 max-w-7xl mx-auto w-full h-full flex flex-col space-y-6 overflow-y-auto">
            <div className="flex-shrink-0 flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-text-primary mb-2 flex items-center gap-3">
                        <EditIcon className="w-8 h-8 text-brand" />
                        Script Writer Studio
                    </h2>
                    <p className="text-text-secondary">
                        MythOS Scribe: Generates industry-standard speculative screenplays from narrative blueprints.
                    </p>
                </div>
                {copyFeedback && (
                    <div className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold animate-fade-in shadow-lg">
                        {copyFeedback}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-grow min-h-0">
                <div className="bg-secondary/30 p-6 rounded-xl border border-accent flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <ScriptIcon className="w-5 h-5 text-text-secondary" />
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">Blueprint</h3>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={handleCopyBlueprint}
                                className="flex items-center gap-2 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-1.5 border border-neutral-700 transition-colors uppercase tracking-widest rounded"
                                title="Copy Blueprint Text"
                            >
                                <DuplicateIcon className="w-4 h-4" />
                                <span>Copy</span>
                            </button>
                            <button 
                                onClick={handleRandomize}
                                className="flex items-center gap-2 text-xs bg-brand/20 hover:bg-brand/30 text-brand-hover hover:text-white px-3 py-1.5 border border-brand/30 transition-colors uppercase tracking-widest rounded"
                                title="Re-Roll Story"
                            >
                                <ShuffleIcon className="w-4 h-4" />
                                <span>Re-Roll Lattice</span>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Initial Title</label>
                            <input type="text" value={initialTitle} onChange={(e) => setInitialTitle(e.target.value)} className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none font-bold" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Genre</label>
                            <select value={genre} onChange={(e) => setGenre(e.target.value)} className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none">
                                {Object.keys(genresData).map(g => (
                                    <option key={g} value={g}>{g.replace(/_/g, ' ').toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Theme</label>
                            <input type="text" value={theme} onChange={(e) => setTheme(e.target.value)} className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none" />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-text-secondary uppercase">Setting</label>
                            <input type="text" value={setting} onChange={(e) => setSetting(e.target.value)} className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none" />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Character Manifest</label>
                        <textarea value={cast} onChange={(e) => setCast(e.target.value)} className="w-full h-24 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-none font-mono" />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-text-secondary uppercase">Scene Beats</label>
                        <textarea value={beatSheet} onChange={(e) => setBeatSheet(e.target.value)} className="w-full h-32 bg-primary border border-accent p-3 rounded text-sm text-text-primary focus:ring-2 focus:ring-brand outline-none resize-none font-mono" />
                    </div>

                    <div className="flex flex-col gap-4 pt-6 border-t border-accent">
                        <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                            <WandIcon className="w-4 h-4 text-brand" /> Outline Protocol
                        </h3>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Working Title</label>
                            <input type="text" value={workingTitle} onChange={(e) => setWorkingTitle(e.target.value)} className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary font-bold" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Logline</label>
                            <input type="text" value={logline} onChange={(e) => setLogline(e.target.value)} className="w-full bg-primary border border-accent p-2 rounded text-sm text-text-primary" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-text-secondary uppercase">Treatment</label>
                            <textarea value={treatment} onChange={(e) => setTreatment(e.target.value)} className="w-full h-24 bg-primary border border-accent p-3 rounded text-sm text-text-primary outline-none" />
                        </div>

                        <button
                            onClick={handleExecuteOutlineProtocol}
                            disabled={isGeneratingOutline}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isGeneratingOutline ? <><LoadingSpinner className="w-4 h-4 text-white" /> Analyzing...</> : <><WandIcon className="w-4 h-4" /> Execute Outline Protocol</>}
                        </button>
                    </div>

                    <button
                        onClick={handleGenerateScreenplay}
                        disabled={isGeneratingScreenplay || !isOutlineReady}
                        className="w-full py-4 bg-brand hover:bg-brand-hover text-text-primary font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
                    >
                        {isGeneratingScreenplay ? <><LoadingSpinner className="w-4 h-4 text-text-primary" /> Writing First Draft...</> : <><WandIcon className="w-4 h-4" /> Generate Screenplay (40 Scenes)</>}
                    </button>
                </div>

                <div className="bg-secondary/30 p-6 rounded-xl border border-accent flex flex-col h-full overflow-hidden">
                    <div className="flex-shrink-0 flex items-center justify-between mb-4 border-b border-accent pb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-text-primary uppercase tracking-widest">
                                {activeOutputTab === 'screenplay' ? 'FIRST DRAFT' : 'OUTLINE REPORT'}
                            </h3>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={handleCopyContent} disabled={!generatedOutline && !generatedScreenplay} className="text-xs font-bold text-text-secondary hover:text-text-primary px-2 py-1">Copy</button>
                            <button onClick={handleDownload} disabled={!generatedOutline && !generatedScreenplay} className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 px-2 py-1"><DownloadIcon className="w-3 h-3" /> Download</button>
                            {activeOutputTab === 'screenplay' && generatedScreenplay && (
                                <button onClick={handleSendToBin} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 px-2 py-1 bg-blue-900/20 rounded">
                                    <LibraryIcon className="w-3 h-3" /> Send to Scribe
                                </button>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex-shrink-0 flex items-center mb-4 bg-primary rounded-lg border border-accent overflow-hidden">
                        <button onClick={() => setActiveOutputTab('outline')} className={`flex-1 py-2 text-sm font-bold transition-colors ${activeOutputTab === 'outline' ? 'bg-accent text-text-primary' : 'text-text-secondary hover:bg-accent/50'}`}>Outline</button>
                        <button onClick={() => setActiveOutputTab('screenplay')} className={`flex-1 py-2 text-sm font-bold transition-colors ${activeOutputTab === 'screenplay' ? 'bg-accent text-text-primary' : 'text-text-secondary hover:bg-accent/50'}`}>Prose</button>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar bg-primary rounded-lg border border-accent p-8 font-mono text-sm leading-relaxed whitespace-pre">
                        {activeOutputTab === 'outline' ? (
                            generatedOutline ? (
                                <div className="text-text-primary">
                                    <h3 className="text-lg font-bold text-blue-400 mb-2">WORKING TITLE: {generatedOutline.workingTitle}</h3>
                                    <p className="mb-4"><strong>LOGLINE:</strong> {generatedOutline.logline}</p>
                                    <p className="mb-4"><strong>TREATMENT:</strong>\n{generatedOutline.treatment}</p>
                                    <h4 className="font-bold border-b border-accent mb-2">DEVELOPMENT QUESTIONS</h4>
                                    {generatedOutline.fundamentalStoryQuestions.map((q, i) => <p key={i}>• {q}</p>)}
                                </div>
                            ) : <div className="opacity-30 text-center py-20">Awaiting Outline Protocol</div>
                        ) : (
                            generatedScreenplay ? (
                                <div className="text-text-primary" style={{ fontFamily: 'Courier, "Courier New", monospace' }}>
                                    {formatToWBStandard(generatedScreenplay)}
                                </div>
                            ) : <div className="opacity-30 text-center py-20">Awaiting Draft Generation</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
