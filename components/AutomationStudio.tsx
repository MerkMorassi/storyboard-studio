


import React, { useState, useEffect } from 'react';
import { AutomationConfig } from '../types';

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

    const handleConfigChange = (field: keyof AutomationConfig, value: string | string[] | boolean) => {
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

    return (
        <div className="bg-neutral-900/50 p-6 border border-neutral-800 space-y-8">
            <div>
                <h2 className="text-2xl font-bold text-neutral-300 mb-2">Automation Studio</h2>
                <p className="text-sm text-neutral-400">Configure connections to external services like your RAG provider and event webhooks.</p>
            </div>

            {/* RAG Configuration */}
            <div className="bg-neutral-800/50 p-4 border border-neutral-700 space-y-4">
                 <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-neutral-300">RAG-as-a-Service</h3>
                    <label htmlFor="rag-toggle" className="flex items-center cursor-pointer">
                        <div className="relative">
                            <input
                                type="checkbox"
                                id="rag-toggle"
                                className="sr-only"
                                checked={localConfig.ragEnabled}
                                onChange={(e) => handleConfigChange('ragEnabled', e.target.checked)}
                            />
                            <div className={`block w-14 h-8 transition-colors ${localConfig.ragEnabled ? 'bg-green-500' : 'bg-neutral-600'}`}></div>
                            <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 transition-transform ${localConfig.ragEnabled ? 'translate-x-6' : ''}`}></div>
                        </div>
                        <div className="ml-3 text-sm font-medium text-neutral-300">
                            {localConfig.ragEnabled ? 'Enabled' : 'Disabled'}
                        </div>
                    </label>
                 </div>
                 <p className="text-sm text-neutral-400">
                    Connect to your Retrieval-Augmented Generation service to give your AI Agents long-term memory and context.
                </p>
                <div className={`space-y-4 transition-opacity ${!localConfig.ragEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">API Key</label>
                        <input
                            type="password"
                            value={localConfig.ragApiKey}
                            onChange={(e) => handleConfigChange('ragApiKey', e.target.value)}
                            placeholder="Enter your RAG service API Key"
                            className="w-full bg-neutral-900 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
                            disabled={!localConfig.ragEnabled}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Base URL</label>
                        <input
                            type="url"
                            value={localConfig.ragBaseUrl}
                            onChange={(e) => handleConfigChange('ragBaseUrl', e.target.value)}
                            placeholder="e.g., https://api.rag-provider.com/v1"
                            className="w-full bg-neutral-900 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
                            disabled={!localConfig.ragEnabled}
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Knowledge Box ID</label>
                        <input
                            type="text"
                            value={localConfig.ragKnowledgeBoxId}
                            onChange={(e) => handleConfigChange('ragKnowledgeBoxId', e.target.value)}
                            placeholder="Enter the unique ID for your knowledge box"
                            className="w-full bg-neutral-900 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
                            disabled={!localConfig.ragEnabled}
                        />
                    </div>
                </div>
            </div>

            {/* Webhook Configuration */}
            <div className="bg-neutral-800/50 p-4 border border-neutral-700 space-y-4">
                <h3 className="text-lg font-semibold text-neutral-300">Event Webhooks</h3>
                <p className="text-sm text-neutral-400">
                    When an event (like image generation) occurs, a notification will be sent to these URLs. Your orchestration agent (e.g., Tasklet) can listen to these events to trigger workflows.
                </p>
                <div className="flex gap-2">
                    <input
                        type="url"
                        value={newWebhookUrl}
                        onChange={(e) => setNewWebhookUrl(e.target.value)}
                        placeholder="https://your-webhook-endpoint.com"
                        className="flex-grow bg-neutral-900 border border-neutral-600 p-2 focus:ring-2 focus:ring-neutral-500 outline-none"
                    />
                    <button
                        type="button"
                        onClick={handleAddWebhook}
                        disabled={!newWebhookUrl.trim()}
                        className="bg-neutral-700 text-white font-semibold py-2 px-4 hover:bg-neutral-600 transition disabled:opacity-50"
                    >
                        Add
                    </button>
                </div>
                <div className="space-y-2">
                    {localConfig.webhookUrls.map(url => (
                         <div key={url} className="flex items-center justify-between bg-neutral-900/50 p-3 gap-4">
                            <code className="text-sm text-neutral-300 break-all flex-grow">{url}</code>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <div className="relative">
                                    <button onClick={() => handleTest(url)} disabled={!!testingUrl} className="text-sm bg-neutral-700 hover:bg-neutral-600 px-3 py-1 transition disabled:opacity-50 w-20 text-center">
                                        {testingUrl === url ? 'Testing...' : 'Test'}
                                    </button>
                                    {testResult && testResult.url === url && <span className={`absolute left-1/2 -translate-x-1/2 -top-8 text-xs px-2 py-1 shadow-lg ${testResult.success ? 'bg-green-600' : 'bg-red-600'}`}>{testResult.success ? 'Success!' : 'Failed!'}</span>}
                                </div>
                                <button onClick={() => handleDeleteWebhook(url)} className="text-sm text-red-500 hover:text-red-400 p-1" title="Delete">
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
                    className="bg-neutral-600 text-white font-bold py-2 px-6 hover:bg-neutral-500 transition duration-300"
                >
                    Save Automation Settings
                </button>
            </div>
        </div>
    );
};