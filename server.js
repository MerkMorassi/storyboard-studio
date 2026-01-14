
const express = require('express');
const path = require('path');
const fs = require('fs');
const { GoogleGenAI } = require("@google/genai");

const app = express();
app.use(express.json({ limit: '50mb' })); // Large limit for LOREPACK syncs
const PORT = process.env.PORT || 4000;

// Neural Vault: In-memory vector store (swap for ChromaDB/Pinecone in production)
let NEURAL_VAULT = [];
const VAULT_PATH = path.join(__dirname, 'neural_vault.json');

// Initialize Vault from disk if it exists
if (fs.existsSync(VAULT_PATH)) {
    try {
        NEURAL_VAULT = JSON.parse(fs.readFileSync(VAULT_PATH, 'utf8'));
        console.log(`[NEURAL VAULT] Restored ${NEURAL_VAULT.length} nodes from disk.`);
    } catch (e) {
        console.error("[NEURAL VAULT] Restore failed, starting fresh.");
    }
}

// Helper: Cosine Similarity for the RAG Engine
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0, normA = 0, normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// --- RAG API ENDPOINT ---
// This is what the Automation Studio "Localhost RAG API URL" points to.
app.post('/api/rag', async (req, res) => {
    const { query, limit = 5, agentId } = req.body;
    
    if (!process.env.API_KEY) {
        return res.status(500).json({ error: "Server API Key not configured." });
    }

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        // 1. Generate embedding for the query on the server
        const model = ai.getGenerativeModel({ model: "text-embedding-004" });
        const result = await model.embedContent(query);
        const queryVector = result.embedding.values;

        // 2. Search the Neural Vault (Filtered by Agent if provided)
        const pool = agentId ? NEURAL_VAULT.filter(v => v.agentId === agentId) : NEURAL_VAULT;
        
        const scored = pool.map(node => ({
            text: node.text,
            source: node.source,
            score: cosineSimilarity(queryVector, node.vector)
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, limit)
        .filter(n => n.score > 0.45); // Relevance threshold

        console.log(`[RAG QUERY] "${query.substring(0, 30)}..." -> Found ${scored.length} results.`);
        
        res.json({
            results: scored.map(s => s.text),
            metadata: scored.map(s => ({ source: s.source, score: s.score }))
        });

    } catch (error) {
        console.error("[RAG ERROR]", error);
        res.status(500).json({ error: "Neural Retrieval Failure" });
    }
});

// --- COREPACK / LOREPACK SYNC ENDPOINT ---
// Endpoint to receive LOREPACKS exported from the browser for permanent studio storage.
app.post('/api/sync', (req, res) => {
    const { nodes, overwrite = false } = req.body; // nodes is an array of {text, vector, source, agentId}

    if (!Array.isArray(nodes)) {
        return res.status(400).json({ error: "Invalid LorePack format." });
    }

    if (overwrite) NEURAL_VAULT = nodes;
    else NEURAL_VAULT = [...NEURAL_VAULT, ...nodes];

    // Deduplicate by content hash or ID if needed here
    
    fs.writeFileSync(VAULT_PATH, JSON.stringify(NEURAL_VAULT), 'utf8');
    console.log(`[SYNC] Ingested ${nodes.length} nodes. Vault size: ${NEURAL_VAULT.length}`);
    
    res.json({ success: true, vaultSize: NEURAL_VAULT.length });
});

// Priority: Serve static files from 'dist' folder (standard Vite output)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Fallback: Static files from the root
app.use(express.static(path.join(__dirname)));

app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (['.tsx', '.ts', '.jsx'].includes(ext)) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// SPA Support
app.get('*', (req, res) => {
  const productionIndex = path.join(distPath, 'index.html');
  if (fs.existsSync(productionIndex)) {
    res.sendFile(productionIndex);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`
  --------------------------------------------------
  MYTHOS STUDIO SERVER ONLINE
  Port: ${PORT}
  Neural Vault Status: ACTIVE (${NEURAL_VAULT.length} nodes)
  RAG API: http://localhost:${PORT}/api/rag
  --------------------------------------------------
  `);
});
