const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = 3000;

// Middleware to set the correct content type and resolve extensions
app.use((req, res, next) => {
  const ext = path.extname(req.path);
  
  if (!ext && req.path !== '/') {
    const filePath = path.join(__dirname, req.path);
    const possibleExts = ['.tsx', '.ts', '.jsx', '.js'];
    
    for (const pExt of possibleExts) {
      if (fs.existsSync(filePath + pExt)) {
        res.setHeader('Content-Type', 'application/javascript');
        return res.sendFile(filePath + pExt);
      }
    }
  }

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