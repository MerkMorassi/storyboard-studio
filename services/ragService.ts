import { Agent, LoreEntry, AutomationConfig, ChatMessage } from '../types';

// This service connects to a RAG-as-a-service API provider for LORE only.
// Agent data is managed locally.

const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';

const getHeaders = (apiKey: string) => ({
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
});

const getApiBase = (config: AutomationConfig) => {
    return `${config.ragBaseUrl}/kb/${config.ragKnowledgeBoxId}/documents`;
};

// Helper to structure content and metadata for the RAG service
const createDocumentBody = (type: 'lore', data: LoreEntry) => {
    const metadata = {
        type,
        internalId: data.id,
        title: data.title,
    };
    const content = `Title: ${data.title}\n\n${data.content}`;
    return { content, metadata };
};


// --- Lore Functions ---
export const getLore = async (config: AutomationConfig): Promise<LoreEntry[]> => {
    const response = await fetch(`${CORS_PROXY}${getApiBase(config)}`, {
        headers: getHeaders(config.ragApiKey),
    });
    if (!response.ok) throw new Error('Failed to fetch lore from RAG service');
    const documents = await response.json();
    
    return documents
        .filter((doc: any) => doc.metadata.type === 'lore')
        .map((doc: any) => ({
            id: doc.metadata.internalId,
            ragDocumentId: doc.id,
            title: doc.metadata.title,
            content: doc.content.split('\n\n').slice(1).join('\n\n'), // Simple parse
        }));
};

export const createLoreEntry = async (config: AutomationConfig, title: string, content: string): Promise<LoreEntry> => {
    const newEntry: LoreEntry = { id: crypto.randomUUID(), title, content };
    const body = createDocumentBody('lore', newEntry);

    const response = await fetch(`${CORS_PROXY}${getApiBase(config)}`, {
        method: 'POST',
        headers: getHeaders(config.ragApiKey),
        body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Failed to create lore entry in RAG service');
    const createdDoc = await response.json();
    
    return { ...newEntry, ragDocumentId: createdDoc.id };
};

export const updateLoreEntry = async (config: AutomationConfig, updatedEntry: LoreEntry): Promise<LoreEntry> => {
     if (!updatedEntry.ragDocumentId) throw new Error('Cannot update lore without a RAG document ID');
    
    const body = createDocumentBody('lore', updatedEntry);

    const response = await fetch(`${CORS_PROXY}${getApiBase(config)}/${updatedEntry.ragDocumentId}`, {
        method: 'PUT',
        headers: getHeaders(config.ragApiKey),
        body: JSON.stringify(body),
    });

    if (!response.ok) throw new Error('Failed to update lore entry in RAG service');
    return updatedEntry;
};

export const deleteLoreEntry = async (config: AutomationConfig, entryToDelete: LoreEntry): Promise<void> => {
    if (!entryToDelete.ragDocumentId) throw new Error('Cannot delete lore without a RAG document ID');
    
    const response = await fetch(`${CORS_PROXY}${getApiBase(config)}/${entryToDelete.ragDocumentId}`, {
        method: 'DELETE',
        headers: getHeaders(config.ragApiKey),
    });

    if (!response.ok && response.status !== 404) { // Ignore if already deleted
        throw new Error('Failed to delete lore entry from RAG service');
    }
};

// --- Context Retrieval for Chat ---
export const getContextForAgent = async (config: AutomationConfig, agent: Agent): Promise<{ agent: Agent, generalLore: string, recentHistory: any[] }> => {
    let generalLore = '';

    if (config.ragEnabled) {
        try {
            const allLore = await getLore(config);
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