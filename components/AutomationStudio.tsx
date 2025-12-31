
import React, { useState, useEffect } from 'react';
import { AutomationConfig, RAGProvider } from '../types.ts';

interface AutomationStudioProps {
    config: AutomationConfig;
    onSave: (config: AutomationConfig) => void;
    onTestWebhook: (url: string) => Promise<boolean>;
}

export const AutomationStudio: React.FC<AutomationStudioProps> = ({ config, onSave, onTestWebhook }) => {
    const [localConfig, setLocalConfig] = useState<AutomationConfig>(config);
    const [newWebhookUrl, setNewWebhookUrl] = useState('');
    const [testingUrl, setTestingUrl] = useState<string | null>(null);
    const [testResult, setTestResult] = useState<{ url: string; success: boolean } | null>(null);
    const [saveFeedback, setSaveFeedback] = useState('');

    useEffect(() => {
        setLocalConfig(config);
    }, [config]);

    const handleConfigChange = (field: keyof AutomationConfig, value: string | string[] | boolean | RAGProvider) => {
        setLocalConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleAddWebhook = () => {
        if (newWebhookUrl.trim().startsWith('http') && !localConfig.webhookUrls.includes(newWebhookUrl.trim())) {
            handleConfigChange('webhookUrls', [...localConfig.webhookUrls, newWebhookUrl.trim()]);
            setNewWebhookUrl('');
        }
    };

    const handleDeleteWebhook = (urlToDelete: string) => {
        handleConfigChange('webhookUrls', localConfig.webhookUrls.filter(url => url !== urlToDelete));
    };

    const handleTest = async (url: string) => {
        setTestingUrl(url);
        setTestResult(null);
        const success = await onTestWebhook(url);
        setTestingUrl(null);
        setTestResult({ url, success });
        setTimeout(() => setTestResult(null), 4000); // Clear result after 4s
    };
    
    const handleSave = () => {
        onSave(localConfig);
        setSaveFeedback('Settings saved successfully!');
        setTimeout(() => setSaveFeedback(''), 3000);
    };

    const isExternalRagConfigDisabled = !localConfig.ragEnabled || localConfig.ragProvider === 'browser';

    return (
        <div className="p-6 max-w-7xl mx-auto w-full space-y-8 h-full overflow-y-auto">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-neutral-200 mb-2">Automation Studio</h2>
                <p className="text-neutral-400">Configure connections to external services like your RAG provider and event webhooks.</p>
            </div>

            {/* RAG Configuration */}
            <div className="bg-neutral-800/50 p-6 border border-neutral-700 space-y-6 rounded-lg">
                 <div className="flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-neutral-300">RAG-as-a-Service</h3>
                        <p className="text-sm text-neutral-400 mt-1">
                            Connect to your Retrieval-Augmented Generation service to give your AI Agents long-term memory.
                        </p>
                    </div>
                    <label htmlFor="rag-toggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                id="rag-toggle"
                                className="sr-only"
                                checked={localConfig.ragEnabled}
                                onChange={(e) => handleConfigChange('ragEnabled', e.target.checked)}
                            />
                            <div className={`block w-14 h-8 transition-colors rounded-full ${localConfig.ragEnabled ? 'bg-green-600' : 'bg-neutral-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${localConfig.ragEnabled ? 'translate-x-6' : ''}`}></div>
                        </div>
                    </label>
                 </div>

                <div className={`space-y-4 transition-opacity ${!localConfig.ragEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">RAG Provider</label>
                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 text-sm text-neutral-200 bg-neutral-900/50 px-3 py-2 rounded-lg border border-neutral-700 cursor-pointer hover:bg-neutral-800 focus-within:ring-2 focus-within:ring-blue-500">
                                <input type="radio" name="ragProvider" value="cloud" checked={localConfig.ragProvider === 'cloud'} onChange={() => handleConfigChange('ragProvider', 'cloud')} className="form-radio text-blue-500 focus:ring-blue-500" disabled={!localConfig.ragEnabled} />
                                Cloud Provider
                            </label>
                            <label className="flex items-center gap-2 text-sm text-neutral-200 bg-neutral-900/50 px-3 py-2 rounded-lg border border-neutral-700 cursor-pointer hover:bg-neutral-800 focus-within:ring-2 focus-within:ring-blue-500">
                                <input type="radio" name="ragProvider" value="localhost" checked={localConfig.ragProvider === 'localhost'} onChange={() => handleConfigChange('ragProvider', 'localhost')} className="form-radio text-blue-500 focus:ring-blue-500" disabled={!localConfig.ragEnabled} />
                                Localhost
                            </label>
                            <label className="flex items-center gap-2 text-sm text-neutral-200 bg-neutral-900/50 px-3 py-2 rounded-lg border border-neutral-700 cursor-pointer hover:bg-neutral-800 focus-within:ring-2 focus-within:ring-blue-500">
                                <input type="radio" name="ragProvider" value="browser" checked={localConfig.ragProvider === 'browser'} onChange={() => handleConfigChange('ragProvider', 'browser')} className="form-radio text-blue-500 focus:ring-blue-500" disabled={!localConfig.ragEnabled} />
                                Browser / Local (IndexedDB)
                            </label>
                        </div>
                        {localConfig.ragProvider === 'browser' && (
                            <p className="text-xs text-blue-400 mt-2 p-2 bg-blue-900/20 border border-blue-800 rounded">
                                <strong>MYTHOS Local Engine Active:</strong> Vectors are stored securely in your browser's IndexedDB. Embeddings are generated using your Google API Key (text-embedding-004). No external server required.
                            </p>
                        )}
                    </div>

                    {(localConfig.ragProvider === 'cloud' || localConfig.ragProvider === 'localhost') && (
                        <div className={`grid gap-4 border-l-2 border-neutral-700 pl-4`}>
                            {localConfig.ragProvider === 'cloud' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-1">API Key</label>
                                        <input
                                            type="password"
                                            value={localConfig.ragApiKey}
                                            onChange={(e) => handleConfigChange('ragApiKey', e.target.value)}
                                            placeholder="Enter your RAG service API Key"
                                            className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                            disabled={isExternalRagConfigDisabled}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-1">Base URL</label>
                                        <input
                                            type="url"
                                            value={localConfig.ragBaseUrl}
                                            onChange={(e) => handleConfigChange('ragBaseUrl', e.target.value)}
                                            placeholder="e.g., https://api.rag-provider.com/v1"
                                            className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                            disabled={isExternalRagConfigDisabled}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-neutral-300 mb-1">Knowledge Box ID</label>
                                        <input
                                            type="text"
                                            value={localConfig.ragKnowledgeBoxId}
                                            onChange={(e) => handleConfigChange('ragKnowledgeBoxId', e.target.value)}
                                            placeholder="Enter the unique ID for your knowledge box"
                                            className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                            disabled={isExternalRagConfigDisabled}
                                        />
                                    </div>
                                </>
                            )}
                            {localConfig.ragProvider === 'localhost' && (
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1">Localhost RAG API URL</label>
                                    <input
                                        type="url"
                                        value={localConfig.ragLocalhostUrl}
                                        onChange={(e) => handleConfigChange('ragLocalhostUrl', e.target.value)}
                                        placeholder="e.g., http://localhost:4000/api/rag"
                                        className="w-full bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                                        disabled={isExternalRagConfigDisabled}
                                    />
                                    <p className="text-xs text-neutral-500 mt-2">
                                        Enter the full endpoint URL for your local RAG service documents.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-neutral-800/50 p-6 border border-neutral-700 space-y-4 rounded-lg">
                <h3 className="text-lg font-semibold text-neutral-300">Event Webhooks</h3>
                <p className="text-sm text-neutral-400">
                    Send notifications to external services when events occur (e.g., image generation complete).
                </p>
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        placeholder="https://your-webhook-endpoint.com"
                        className="flex-grow bg-neutral-800 border border-neutral-700 text-neutral-200 rounded-lg p-2.5 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleAddWebhook}
                        disabled={!newWebhookUrl.trim()}
                        className="bg-neutral-700 text-white font-semibold py-2.5 px-4 hover:bg-neutral-600 transition disabled:opacity-50 rounded-lg"
                    >
                        Add
                    </button>
                </div>
                <div className="space-y-2">
                    {localConfig.webhookUrls.map(url => (
                         <div key={url} className="flex items-center justify-between bg-neutral-900/50 p-3 gap-4 rounded border border-neutral-800">
                            <code className="text-sm text-neutral-300 break-all flex-grow">{url}</code>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="relative">
                                    <button onClick={() => handleTest(url)} disabled={!!testingUrl} className="text-sm bg-neutral-700 hover:bg-neutral-600 px-3 py-1.5 transition disabled:opacity-50 w-20 text-center rounded-lg">
                                        {testingUrl === url ? 'Testing...' : 'Test'}
                                    </button>
                                    {testResult && testResult.url === url && <span className={`absolute right-0 -top-8 text-xs px-2 py-1 shadow-lg rounded ${testResult.success ? 'bg-green-600' : 'bg-red-600'}`}>{testResult.success ? 'Success!' : 'Failed!'}</span>}
                                </div>
                                <button onClick={() => handleDeleteWebhook(url)} className="text-sm text-red-400 hover:text-red-300 p-1 rounded-lg" title="Delete">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end items-center gap-4">
                 <p className={`text-sm text-green-400 transition-opacity duration-300 ${saveFeedback ? 'opacity-100' : 'opacity-0'}`}>{saveFeedback}</p>
                 <button
                    onClick={handleSave}
                    className="bg-blue-600 text-white font-bold py-2.5 px-6 hover:bg-blue-500 transition duration-300 rounded-lg"
                >
                    Save Settings
                </button>
            </div>
        </div>
    );
};
