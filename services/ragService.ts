import { Agent, LoreEntry, AutomationConfig, ChatMessage } from '../types.ts';

// This service connects to a RAG-as-a-service API provider for LORE only.
// Agent data is managed locally.

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

const getHeaders = (config: AutomationConfig) => {
    if (config.ragProvider === 'localhost') {
        return { 'Content-Type': 'application/json' };
    }
    return {
        'Content-Type': 'application/json',
        'x-api-key': config.ragApiKey,
    };
};

const getApiBase = (config: AutomationConfig) => {
    if (config.ragProvider === 'localhost') {
        return config.ragLocalhostUrl;
    }
    return `${config.ragBaseUrl}/kb/${config.ragKnowledgeBoxId}/documents`;
};

const getUrl = (config: AutomationConfig, path: string = '') => {
    const base = getApiBase(config);
    const fullPath = `${base}${path}`;
    if (config.ragProvider === 'localhost') {
        return fullPath;
    }
    return `${CORS_PROXY}${fullPath}`;
}


// Helper to structure content and metadata for the RAG service
const createDocumentBody = (type: 'lore', projectId: string, data: LoreEntry) => {
    const metadata = {
        type,
        projectId,
        internalId: data.id,
        title: data.title,
    };
    const content = `Title: ${data.title}\n\n${data.content}`;
    return { content, metadata };
};


// --- Lore Functions ---
export const getLore = async (config: AutomationConfig, projectId: string): Promise<LoreEntry[]> => {
    const response = await fetch(getUrl(config), {
        headers: getHeaders(config),
    });
    if (!response.ok) throw new Error('Failed to fetch lore from RAG service');
    const documents = await response.json();
    
    return documents
        .filter((doc: any) => doc.metadata.type === 'lore' && doc.metadata.projectId === projectId)
        .map((doc: any) => ({
            id: doc.metadata.internalId,
            ragDocumentId: doc.id,
            title: doc.metadata.title,
            content: doc.content.split('\n\n').slice(1).join('\n\n'), // Simple parse
        }));
};

export const createLoreEntry = async (config: AutomationConfig, projectId: string, title: string, content: string): Promise<LoreEntry> => {
    const newEntry: LoreEntry = { id: crypto.randomUUID(), title, content };
    const body = createDocumentBody('lore', projectId, newEntry);

    const response = await fetch(getUrl(config), {
        method: 'POST',
        headers: getHeaders(config),
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to create lore entry in RAG service');
    const createdDoc = await response.json();
    
    return { ...newEntry, ragDocumentId: createdDoc.id };
};

export const updateLoreEntry = async (config: AutomationConfig, projectId: string, updatedEntry: LoreEntry): Promise<LoreEntry> => {
     if (!updatedEntry.ragDocumentId) throw new Error('Cannot update lore without a RAG document ID');
    
    const body = createDocumentBody('lore', projectId, updatedEntry);

    const response = await fetch(getUrl(config, `/${updatedEntry.ragDocumentId}`), {
        method: 'PUT',
        headers: getHeaders(config),
        body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Failed to update lore entry in RAG service');
    return updatedEntry;
};

export const deleteLoreEntry = async (config: AutomationConfig, entryToDelete: LoreEntry): Promise<void> => {
    if (!entryToDelete.ragDocumentId) throw new Error('Cannot delete lore without a RAG document ID');
    
    const response = await fetch(getUrl(config, `/${entryToDelete.ragDocumentId}`), {
        method: 'DELETE',
        headers: getHeaders(config),
    });

    if (!response.ok && response.status !== 404) { // Ignore if already deleted
        throw new Error('Failed to delete lore entry from RAG service');
    }
};

// --- Context Retrieval for Chat ---
export const getContextForAgent = async (config: AutomationConfig, projectId: string, agent: Agent): Promise<{ agent: Agent, generalLore: string, recentHistory: any[] }> => {
    let generalLore = '';

    if (config.ragEnabled) {
        try {
            const allLore = await getLore(config, projectId);
            generalLore = allLore.map(entry => `--- LORE: "${entry.title}" ---\n${entry.content}`).join('\n\n');
        } catch (e) {
            console.error("Could not fetch lore for agent context:", e);
            generalLore = "Error: Could not connect to the Lore database.";
        }
    }
    
    const recentHistory = (agent.chatHistory || [])
        .filter((msg): msg is Extract<ChatMessage, { role: 'user' | 'model' }> => msg.role === 'user' || msg.role === 'model')
        .slice(-10)
        .map(msg => ({
            role: msg.role,
            parts: [{ text: msg.text }]
        }));

    return { agent, generalLore, recentHistory };
};
