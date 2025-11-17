const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
  origin: 'https://internship-management-mvp.netlify.app'
}));

// Run all JS files (do not mount anything)
const apiFolder = __dirname;

fs.readdirSync(apiFolder).forEach(file => {
  if (file === 'server.js') return;
  if (!file.endsWith('.js')) return;

  const filePath = path.join(apiFolder, file);

  try {
    require(filePath);   // <-- uruchamia plik
    console.log(`Executed file: ${file}`);
  } catch (err) {
    console.error(`Error executing ${file}:`, err);
  }
});

app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Serve frontend if exists
const frontendPath = path.join(__dirname, '../../frontend/build');

if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
