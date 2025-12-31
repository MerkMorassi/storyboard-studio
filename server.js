const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 4000;

// Priority: Serve static files from 'dist' folder (standard Vite output)
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Fallback: Static files from the root (for dev or legacy assets)
app.use(express.static(path.join(__dirname)));

// Middleware for handling TypeScript/JSX files correctly during dev/HMR if needed,
// but for production this ensures they are served with the correct MIME type.
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  if (['.tsx', '.ts', '.jsx'].includes(ext)) {
    res.setHeader('Content-Type', 'application/javascript');
  }
  next();
});

// SPA Support: For any other request, serve index.html (checking dist first)
app.get('*', (req, res) => {
  const productionIndex = path.join(distPath, 'index.html');
  if (fs.existsSync(productionIndex)) {
    res.sendFile(productionIndex);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
