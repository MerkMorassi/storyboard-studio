const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware to set the correct content type for .tsx, .ts, and .json files
// Browsers will often block .ts files as "video/mp2t" if this is not set explicitly.
// JSON files MUST be served as "application/json" for 'import ... with { type: "json" }' to work.
app.use((req, res, next) => {
  if (req.path.endsWith('.tsx') || req.path.endsWith('.ts')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.path.endsWith('.json')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
});

// Serve static files from the root directory
app.use(express.static(path.join(__dirname)));

// For any other request, serve the index.html file to support client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});