
export interface VectorRecord {
  id: number | string; // Support both numeric timestamps and UUID strings
  text: string;
  vector: number[];
  source: string;
  timestamp: number;
  agentId?: string; // New field for segregation
}

export interface ChatLogRecord {
    id: string;
    role: 'user' | 'model';
    parts: {
      text?: string;
      inlineData?: {
        mimeType: string;
        data: string;
        fileName?: string;
      };
    }[];
}

const DB_NAME = 'mythos_vault';
const DB_VERSION = 4; // Incremented for agentId index
const STORE_VECTORS = 'vectors';
const STORE_AGENT_CHAT = 'agentChatLogs';

class VectorDbService {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = (e.target as IDBOpenDBRequest).result;
        
        // Vectors Store
        let vectorStore: IDBObjectStore;
        if (!db.objectStoreNames.contains(STORE_VECTORS)) {
          vectorStore = db.createObjectStore(STORE_VECTORS, { keyPath: 'id' });
        } else {
          vectorStore = (e.target as IDBOpenDBRequest).transaction!.objectStore(STORE_VECTORS);
        }

        // Create 'source' index if it doesn't exist
        if (!vectorStore.indexNames.contains('source')) {
            vectorStore.createIndex('source', 'source', { unique: false });
        }

        // Create 'agentId' index (v4 upgrade)
        if (!vectorStore.indexNames.contains('agentId')) {
            vectorStore.createIndex('agentId', 'agentId', { unique: false });
        }

        // Chat Logs Store
        if (!db.objectStoreNames.contains(STORE_AGENT_CHAT)) {
          db.createObjectStore(STORE_AGENT_CHAT, { keyPath: 'id' });
        }
      };

      request.onsuccess = (e) => {
        this.db = (e.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        reject((e.target as IDBOpenDBRequest).error);
      };
    });
  }

  // --- Vector Store Methods ---

  async addVectors(vectors: VectorRecord[]): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VECTORS, 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      vectors.forEach(v => store.put(v));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAllVectors(): Promise<VectorRecord[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VECTORS, 'readonly');
      const store = tx.objectStore(STORE_VECTORS);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async getVectorsByAgent(agentId: string): Promise<VectorRecord[]> {
      const db = await this.open();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_VECTORS, 'readonly');
          const store = tx.objectStore(STORE_VECTORS);
          
          // Use index if available
          if (store.indexNames.contains('agentId')) {
              const index = store.index('agentId');
              const request = index.getAll(agentId);
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
          } else {
              // Fallback for older DB versions without index (shouldn't happen with version bump but safe)
              const request = store.getAll();
              request.onsuccess = () => {
                  const all = request.result as VectorRecord[];
                  resolve(all.filter(v => v.agentId === agentId));
              };
              request.onerror = () => reject(request.error);
          }
      });
  }

  async deleteVectorsBySource(source: string, agentId?: string): Promise<void> {
      const db = await this.open();
      return new Promise((resolve, reject) => {
          const tx = db.transaction(STORE_VECTORS, 'readwrite');
          const store = tx.objectStore(STORE_VECTORS);
          const index = store.index('source');
          const request = index.openCursor(IDBKeyRange.only(source));

          request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
              if (cursor) {
                  // If agentId is provided, check if it matches before deleting
                  if (!agentId || cursor.value.agentId === agentId) {
                      cursor.delete();
                  }
                  cursor.continue();
              }
          };

          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
      });
  }

  async clearVectors(agentId?: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_VECTORS, 'readwrite');
      const store = tx.objectStore(STORE_VECTORS);
      
      if (agentId) {
          // Only clear for specific agent using index
          if (store.indexNames.contains('agentId')) {
              const index = store.index('agentId');
              const request = index.openCursor(IDBKeyRange.only(agentId));
              request.onsuccess = (event) => {
                  const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                  if (cursor) {
                      cursor.delete();
                      cursor.continue();
                  }
              };
              tx.oncomplete = () => resolve();
          } else {
              // Fallback: iterate all
              const request = store.openCursor();
              request.onsuccess = (event) => {
                  const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
                  if (cursor) {
                      if (cursor.value.agentId === agentId) cursor.delete();
                      cursor.continue();
                  }
              };
              tx.oncomplete = () => resolve();
          }
      } else {
          // Clear all
          const request = store.clear();
          request.onsuccess = () => resolve();
      }
      
      tx.onerror = () => reject(tx.error);
    });
  }
  
  // --- Agent Chat Log Methods ---

  async saveAgentChatLogs(logs: ChatLogRecord[]): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AGENT_CHAT, 'readwrite');
      const store = tx.objectStore(STORE_AGENT_CHAT);
      store.clear(); 
      logs.forEach(log => store.put(log));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async getAgentChatLogs(): Promise<ChatLogRecord[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AGENT_CHAT, 'readonly');
      const store = tx.objectStore(STORE_AGENT_CHAT);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clearAgentChatLogs(): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_AGENT_CHAT, 'readwrite');
      const store = tx.objectStore(STORE_AGENT_CHAT);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const vectorDb = new VectorDbService();
