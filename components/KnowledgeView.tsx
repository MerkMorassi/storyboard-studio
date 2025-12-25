
import React, { useState, useEffect, useRef } from 'react';
import { vectorDb, VectorRecord } from '../services/vectorDbService';
import { chunkText, generateEmbeddingsForChunks } from '../services/embeddingService';
import { fetchModels, generateText } from '../services/geminiService';
import { Agent } from '../services/agentService';
import { UploadIcon } from './icons/UploadIcon';
import { TrashIcon } from './icons/TrashIcon';
import { WandIcon } from './icons/WandIcon';
import { WarningIcon } from './icons/WarningIcon';
import { CloseIcon } from './icons.tsx';

interface KnowledgeViewProps {
    agents: Agent[];
    onUpdateAgent: (id: string, updates: Partial<Agent>) => void;
    onApiKeyUpdate: () => void;
    hasApiKey: boolean;
}

type SaveStatus = 'idle' | 'saving' | 'saved';

const CollapsibleSection: React.FC<{ title: string; number: string; children: React.ReactNode, startOpen?: boolean }> = ({ title, number, children, startOpen = false }) => {
    const [isOpen, setIsOpen] = useState(startOpen);
    return (
        <div className="bg-secondary/30 border border-accent rounded-xl flex-shrink-0">
            <div className="flex justify-between items-center cursor-pointer p-4 hover:bg-white/5 transition-colors rounded-t-xl" onClick={() => setIsOpen(!isOpen)}>
                <h3 className="text-sm uppercase tracking-wider font-bold text-text-secondary">{number} / {title}</h3>
                <span className="text-text-secondary text-lg">{isOpen ? '−' : '+'}</span>
            </div>
            {isOpen && (
                <div className="p-4 border-t border-accent animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};

export const KnowledgeView: React.FC<KnowledgeViewProps> = ({ agents, onUpdateAgent, onApiKeyUpdate, hasApiKey }) => {
    // Agent Selection State
    const [selectedAgentId, setSelectedAgentId] = useState<string>(agents.length > 0 ? agents[0].id : '');
    const selectedAgent = agents.find(a => a.id === selectedAgentId) || agents[0];

    const [vectorCount, setVectorCount] = useState<number>(0);
    const [isIngesting, setIsIngesting] = useState(false);
    const [progress, setProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('');
    const [sources, setSources] = useState<string[]>([]);
    const [availableModels, setAvailableModels] = useState<{ id: string, name: string }[]>([]);
    const [smartIngest, setSmartIngest] = useState(false);
    
    // Analytics State
    const [analyticsResult, setAnalyticsResult] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    
    // Deletion Modal State
    const [sourceToDelete, setSourceToDelete] = useState<string | null>(null);
    
    // Abort Controller
    const abortControllerRef = useRef<AbortController | null>(null);
    
    // Local state for editing persona (system prompt)
    const [systemPrompt, setSystemPrompt] = useState('');
    const [personaSavaStatus, setPersonaSaveStatus] = useState<SaveStatus>('idle');

    const fileInputRef = useRef<HTMLInputElement>(null);
    const restoreInputRef = useRef<HTMLInputElement>(null);

    // Sync local state when selected agent changes
    useEffect(() => {
        if (selectedAgent) {
            setSystemPrompt(selectedAgent.systemPrompt || '');
            refreshStats(selectedAgent.id);
        }
    }, [selectedAgent]);

    const refreshStats = async (agentId: string) => {
        try {
            const agentVectors = await vectorDb.getVectorsByAgent(agentId);
            setVectorCount(agentVectors.length);
            const uniqueSources = Array.from(new Set(agentVectors.map(v => v.source)));
            setSources(uniqueSources);
        } catch (e) {
            console.error("Failed to load vector stats", e);
        }
    };

    useEffect(() => {
        if (hasApiKey) handleFetchModels();
    }, [hasApiKey]);

    const handleFetchModels = async () => {
        try {
            const models = await fetchModels();
            setAvailableModels(models);
        } catch (error) {
            console.error("Failed to fetch models:", error);
        }
    };
    
    const handleSaveWithFeedback = (saveFn: () => void, setStatus: React.Dispatch<React.SetStateAction<SaveStatus>>) => {
        setStatus('saving');
        saveFn();
        setTimeout(() => {
            setStatus('saved');
            setTimeout(() => setStatus('idle'), 2000);
        }, 500);
    };

    const handleSavePersona = () => {
        if (selectedAgentId) {
            handleSaveWithFeedback(() => {
                onUpdateAgent(selectedAgentId, { systemPrompt });
            }, setPersonaSaveStatus);
        }
    };

    const processJsonContent = (json: any): string => {
        if (typeof json === 'string') return json;
        if (typeof json === 'number' || typeof json === 'boolean') return String(json);
        if (Array.isArray(json)) return json.map(item => processJsonContent(item)).join('\n\n');
        if (typeof json === 'object' && json !== null) {
            return Object.entries(json).map(([key, val]) => `${key}: ${processJsonContent(val)}`).join('\n');
        }
        return '';
    };

    const handleAbort = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsIngesting(false);
            setStatusMessage('Ingestion Aborted.');
            if (selectedAgentId) refreshStats(selectedAgentId);
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0 || !selectedAgentId) return;
        
        abortControllerRef.current = new AbortController();
        const signal = abortControllerRef.current.signal;

        const files: File[] = Array.from(e.target.files);
        setIsIngesting(true);
        setProgress(0);
        setStatusMessage(`Initializing CorePack for ${selectedAgent.name}...`);
        
        try {
            let totalChunks = 0;
            const filesAndChunks = await Promise.all(files.map(async (file: File) => {
                if (signal.aborted) return null;
                let text = await file.text();
                if(file.name.toLowerCase().endsWith('.json')) {
                   try {
                     const jsonData = JSON.parse(text);
                      if (Array.isArray(jsonData) && jsonData.length > 0 && jsonData[0]?.vector) {
                         setStatusMessage(`Restoring backup: ${file.name}`);
                         // When restoring, we map these to the current agent
                         const mappedVectors = (jsonData as VectorRecord[]).map(v => ({
                             ...v,
                             agentId: selectedAgentId // Override agentId
                         }));
                         await vectorDb.addVectors(mappedVectors);
                         return null; 
                      }
                      text = processJsonContent(jsonData);
                   } catch(e) { /* treat as text */ }
                }

                if (smartIngest) {
                    setStatusMessage(`AI Cleaning ${file.name}...`);
                    const prompt = `TASK: Clean and structure this text. Fix typos, improve grammar. DO NOT CHANGE PROPER NOUNS. Text: ${text.substring(0, 30000)}`;
                    text = await generateText(prompt);
                }
                const chunks = chunkText(text);
                totalChunks += chunks.length;
                return { file, chunks };
            }));

            if (signal.aborted) throw new Error("Aborted");

            let processedChunks = 0;
            for (const fileData of filesAndChunks) {
                if (!fileData) continue; 
                if (signal.aborted) break;

                const { file, chunks } = fileData;
                const newVectors: VectorRecord[] = [];
                
                for (let i = 0; i < chunks.length; i++) {
                    if (signal.aborted) break;

                    setStatusMessage(`Embedding ${file.name} (${i + 1}/${chunks.length})`);
                    
                    const embeddedResult = await generateEmbeddingsForChunks([chunks[i]]);
                    if (embeddedResult.length > 0) {
                        newVectors.push({
                            id: crypto.randomUUID(),
                            text: embeddedResult[0].text,
                            vector: embeddedResult[0].vector,
                            source: file.name,
                            timestamp: Date.now(),
                            agentId: selectedAgentId // Bind to specific agent
                        });
                    }
                    processedChunks++;
                    setProgress((processedChunks / totalChunks) * 100);
                }
                if (newVectors.length > 0) await vectorDb.addVectors(newVectors);
            }
            
            if (!signal.aborted) {
                await refreshStats(selectedAgentId);
                setStatusMessage('CorePack Ingestion complete!');
            }
        } catch (error) {
            if ((error as Error).message === "Aborted") {
                setStatusMessage("Ingestion Aborted.");
            } else {
                setStatusMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
        } finally {
            if (!abortControllerRef.current?.signal.aborted) {
                setTimeout(() => setIsIngesting(false), 3000);
            }
            if (e.target) e.target.value = '';
        }
    };

    const handlePurge = async () => {
        if (window.confirm(`Purge Knowledge Base for ${selectedAgent.name}? This will delete all ingested CorePack vectors for this agent.`)) {
            await vectorDb.clearVectors(selectedAgentId);
            await refreshStats(selectedAgentId);
        }
    };

    const handleDeleteSource = async () => {
        if (!sourceToDelete || !selectedAgentId) return;
        try {
            await vectorDb.deleteVectorsBySource(sourceToDelete, selectedAgentId);
            await refreshStats(selectedAgentId);
            setSourceToDelete(null);
        } catch (error) {
            console.error("Failed to delete source:", error);
            alert("Failed to delete source.");
        }
    };
    
    const handleExport = async () => {
        const vectors = await vectorDb.getVectorsByAgent(selectedAgentId);
        if (vectors.length === 0) return alert("Knowledge Base is empty for this agent.");

        const safeAgentName = selectedAgent.name.replace(/[^a-z0-9]/gi, '_');
        const backupFileName = `${safeAgentName}_CorePack_${Date.now()}.json`;

        const blob = new Blob([JSON.stringify(vectors, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = backupFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    };

    const runAnalytics = async (type: 'SUMMARY' | 'QUESTIONS' | 'ENTITIES' | 'GAPS') => {
        setIsAnalyzing(true);
        setAnalyticsResult(null);
        try {
            const vectors = await vectorDb.getVectorsByAgent(selectedAgentId);
            if (vectors.length === 0) {
                setAnalyticsResult("CorePack is empty. Please ingest documents first.");
                setIsAnalyzing(false);
                return;
            }

            // Combine text content, limiting to ~100k characters for efficiency
            const fullText = vectors
                .map(v => v.text)
                .join('\n\n')
                .slice(0, 100000); 

            let prompt = "";
            switch (type) {
                case 'SUMMARY':
                    prompt = `Analyze the following knowledge base content for the agent ${selectedAgent.name} and provide a comprehensive executive summary. Highlight the main themes, key facts, and overall purpose of the data.\n\nContent:\n${fullText}`;
                    break;
                case 'QUESTIONS':
                    prompt = `Based on the following knowledge base content for ${selectedAgent.name}, generate 5-10 critical questions that this data answers. Also suggest 3 deeper questions that might require more information.\n\nContent:\n${fullText}`;
                    break;
                case 'ENTITIES':
                    prompt = `Extract and list the key entities from the following content for ${selectedAgent.name}. Group them by category (e.g., People, Locations, Concepts, Technologies). Provide a brief 1-sentence description for each.\n\nContent:\n${fullText}`;
                    break;
                case 'GAPS':
                    prompt = `Critically analyze the following content for ${selectedAgent.name} for logical gaps, missing information, or inconsistencies. What related topics are mentioned but not explained? What would make this knowledge base more complete?\n\nContent:\n${fullText}`;
                    break;
            }

            const result = await generateText(prompt);
            setAnalyticsResult(result);

        } catch (error) {
            console.error("Analytics failed:", error);
            setAnalyticsResult("Analysis failed. Please check your API key and try again.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header Area - Fixed */}
            <div className="flex-shrink-0 p-6 pb-2">
                <div className="text-center space-y-2 mb-6">
                    <h1 className="text-3xl font-bold tracking-widest text-text-secondary">MYTHOS VAULT</h1>
                    <p className="text-xs text-text-secondary/70">NOETIC SOVEREIGNTY ENGINE</p>
                </div>
                {!hasApiKey && <WarningBanner />}
                
                {/* Agent Selector */}
                <div className="bg-secondary/50 border border-accent p-4 rounded-xl flex items-center justify-between gap-4 mb-4">
                    <div className="flex flex-col flex-grow">
                        <label className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-1">Active Agent Knowledge Base</label>
                        <select 
                            value={selectedAgentId} 
                            onChange={(e) => setSelectedAgentId(e.target.value)}
                            className="bg-primary text-text-primary font-bold text-lg border border-accent rounded p-2 focus:ring-1 focus:ring-brand cursor-pointer appearance-none outline-none"
                        >
                            {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.narrativeRole || 'General'})</option>
                            ))}
                        </select>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-2xl font-black text-white">{vectorCount.toLocaleString()}</p>
                        <p className="text-[10px] uppercase text-text-secondary font-bold">Vectors Indexed</p>
                    </div>
                </div>
            </div>

            {/* Content Area - Scrollable */}
            <div className="flex-grow overflow-y-auto px-6 pb-6 space-y-6 custom-scrollbar">
                
                <CollapsibleSection number="01" title="Configuration" startOpen={true}>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs text-text-secondary mb-1 block">Persona Configuration (System Prompt)</label>
                            <textarea 
                                value={systemPrompt} 
                                onChange={e => setSystemPrompt(e.target.value)} 
                                rows={6} 
                                placeholder={`Define the core personality and rules for ${selectedAgent.name}...`}
                                className="w-full bg-primary border border-accent p-3 rounded-xl text-xs resize-y text-text-primary focus:border-brand outline-none"
                            ></textarea>
                            <button onClick={handleSavePersona} disabled={personaSavaStatus !== 'idle'} className="w-full mt-1 bg-secondary border border-accent text-text-secondary hover:text-white p-2 rounded-xl text-xs uppercase font-bold disabled:opacity-50 transition-colors hover:bg-brand/20 hover:border-brand">
                                {personaSavaStatus === 'idle' ? `Save Persona for ${selectedAgent.name}` : (personaSavaStatus === 'saving' ? 'Saving...' : '✓ Saved!')}
                            </button>
                        </div>

                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-accent">
                            <input type="file" ref={restoreInputRef} accept=".json" className="hidden" onChange={handleFileSelect} />
                            <button onClick={() => restoreInputRef.current?.click()} className="flex items-center justify-center gap-2 bg-secondary border border-accent text-text-secondary hover:text-white p-2 rounded-xl text-xs uppercase font-bold hover:bg-neutral-700 transition-colors"><UploadIcon className="w-3 h-3"/> Import DB</button>
                            <button onClick={handleExport} className="bg-secondary border border-accent text-text-secondary hover:text-white p-2 rounded-xl text-xs uppercase font-bold hover:bg-neutral-700 transition-colors">Export DB</button>
                            <button onClick={handlePurge} className="flex items-center justify-center gap-2 bg-red-900/20 border border-red-900/50 text-red-400 hover:bg-red-900/40 p-2 rounded-xl text-xs uppercase font-bold transition-colors"><TrashIcon className="w-3 h-3"/> Purge DB</button>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection number="02" title="CorePack Ingestion (Forge)">
                    <div className="space-y-4">
                        <input type="file" ref={fileInputRef} multiple accept=".txt,.json,.md,.csv" className="hidden" onChange={handleFileSelect} />
                        <button onClick={() => !isIngesting && fileInputRef.current?.click()} disabled={isIngesting || !hasApiKey} className="w-full border-2 border-dashed border-accent p-6 rounded-xl text-text-secondary hover:border-brand hover:text-brand transition-all text-center disabled:cursor-wait disabled:opacity-50 group bg-secondary/20 hover:bg-secondary/40">
                            <span className="group-hover:scale-105 transition-transform block">Click to upload knowledge files (.txt, .md, .json)</span>
                            <span className="text-xs text-text-secondary/50 mt-2 block">Selected files will be embedded into {selectedAgent.name}'s memory.</span>
                        </button>
                        
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 p-2 border border-accent rounded-xl bg-primary/30 flex-grow">
                                <input 
                                    type="checkbox" 
                                    id="smartIngest" 
                                    className="accent-brand cursor-pointer w-4 h-4" 
                                    disabled={!hasApiKey}
                                    checked={smartIngest}
                                    onChange={(e) => setSmartIngest(e.target.checked)}
                                />
                                <label htmlFor="smartIngest" className={`text-xs cursor-pointer select-none ${!hasApiKey ? 'text-text-secondary/50' : 'text-text-secondary'}`}>Smart Ingest (AI Clean & Structure Data)</label>
                            </div>
                            {isIngesting && (
                                <button 
                                    onClick={handleAbort} 
                                    className="px-4 py-2 bg-red-900/20 text-red-300 border border-red-500/30 rounded-xl text-xs font-bold hover:bg-red-900/40 transition-colors"
                                >
                                    ABORT
                                </button>
                            )}
                        </div>
                        
                        {isIngesting && (
                            <div className="w-full bg-primary border border-accent h-6 rounded-lg relative overflow-hidden">
                                <div 
                                    className="h-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 transition-all duration-300 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                                    style={{ width: `${progress}%` }}
                                ></div>
                                <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tracking-wider drop-shadow-md">{statusMessage}</div>
                            </div>
                        )}
                        
                        <div>
                            <h4 className="text-xs text-text-secondary mb-2">Active Sources for {selectedAgent.name}:</h4>
                            <div className="flex flex-wrap gap-2 min-h-[24px]">
                                {sources.length > 0 ? sources.map(s => (
                                    <div key={s} className="bg-secondary border border-accent text-text-secondary text-[10px] pl-2 pr-1 py-1 rounded-md flex items-center gap-1 group hover:border-red-500/50 hover:bg-red-900/10 transition-colors">
                                        <span>{s}</span>
                                        <button 
                                            onClick={() => setSourceToDelete(s)}
                                            className="p-0.5 rounded-full hover:bg-red-500/20 text-text-secondary hover:text-red-400"
                                            title="Remove Source"
                                        >
                                            <CloseIcon className="w-3 h-3" />
                                        </button>
                                    </div>
                                )) : <span className="text-xs text-text-secondary/50 italic">No sources loaded for this agent</span>}
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection number="03" title="AI Analytics">
                    <p className="text-xs text-text-secondary mb-4">Run analysis on {selectedAgent.name}'s knowledge base to get insights.</p>
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => runAnalytics('SUMMARY')} disabled={!hasApiKey || vectorCount === 0 || isAnalyzing} className="flex items-center justify-center gap-2 bg-secondary border border-accent text-text-secondary hover:text-white p-3 rounded-xl text-xs uppercase font-bold disabled:opacity-50 hover:bg-neutral-700 transition-colors"><WandIcon className="w-4 h-4"/> Summarize</button>
                        <button onClick={() => runAnalytics('QUESTIONS')} disabled={!hasApiKey || vectorCount === 0 || isAnalyzing} className="flex items-center justify-center gap-2 bg-secondary border border-accent text-text-secondary hover:text-white p-3 rounded-xl text-xs uppercase font-bold disabled:opacity-50 hover:bg-neutral-700 transition-colors"><WandIcon className="w-4 h-4"/> Suggest Q's</button>
                        <button onClick={() => runAnalytics('ENTITIES')} disabled={!hasApiKey || vectorCount === 0 || isAnalyzing} className="flex items-center justify-center gap-2 bg-secondary border border-accent text-text-secondary hover:text-white p-3 rounded-xl text-xs uppercase font-bold disabled:opacity-50 hover:bg-neutral-700 transition-colors"><WandIcon className="w-4 h-4"/> Extract Entities</button>
                        <button onClick={() => runAnalytics('GAPS')} disabled={!hasApiKey || vectorCount === 0 || isAnalyzing} className="flex items-center justify-center gap-2 bg-secondary border border-accent text-text-secondary hover:text-white p-3 rounded-xl text-xs uppercase font-bold disabled:opacity-50 hover:bg-neutral-700 transition-colors"><WandIcon className="w-4 h-4"/> Find Gaps</button>
                    </div>
                    
                    {isAnalyzing && (
                        <div className="mt-4 p-4 bg-secondary/50 rounded-xl flex items-center justify-center gap-3">
                            <div className="animate-spin h-5 w-5 border-2 border-brand border-t-transparent rounded-full"></div>
                            <span className="text-sm font-semibold text-text-primary">Analyzing CorePack...</span>
                        </div>
                    )}

                    {analyticsResult && (
                        <div className="mt-4 p-4 bg-primary border border-accent rounded-xl animate-fade-in relative group">
                            <button 
                                onClick={() => setAnalyticsResult(null)} 
                                className="absolute top-2 right-2 p-1 hover:bg-secondary rounded-lg text-text-secondary hover:text-white transition-colors"
                                title="Clear"
                            >
                                <CloseIcon className="w-4 h-4" />
                            </button>
                            <h4 className="text-sm font-bold text-brand-hover mb-2 uppercase tracking-wide">Analysis Report</h4>
                            <div 
                                className="prose prose-invert prose-sm max-w-none text-text-secondary"
                                dangerouslySetInnerHTML={{ __html: analyticsResult.replace(/\n/g, '<br/>') }}
                            />
                        </div>
                    )}
                </CollapsibleSection>
            </div>

            {/* Source Deletion Confirmation Modal */}
            {sourceToDelete && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-neutral-900 border border-neutral-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-bold text-white mb-2">Remove CorePack Source?</h3>
                        <p className="text-neutral-400 text-sm mb-4">
                            Are you sure you want to delete <span className="text-white font-mono bg-neutral-800 px-1 rounded">{sourceToDelete}</span> from <strong>{selectedAgent.name}</strong>? 
                            This will remove all associated vectors from their knowledge base.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={() => setSourceToDelete(null)}
                                className="px-4 py-2 text-sm font-medium text-neutral-300 hover:text-white transition-colors"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleDeleteSource}
                                className="px-4 py-2 text-sm font-bold bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors shadow-lg"
                            >
                                Confirm Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

const WarningBanner = () => (
     <div className="p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-xl flex items-start gap-3 text-yellow-200 animate-fade-in mb-4">
        <WarningIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <p className="text-sm">
            <span className="font-bold">Action Required:</span> Most features are disabled. Please set your Gemini API Key in the main Settings (bottom left of sidebar) to proceed.
        </p>
    </div>
);
