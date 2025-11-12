const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const apiFolder = __dirname;
fs.readdirSync(apiFolder).forEach(file => {
  if (file === 'server.js' || file.startsWith('_') || !file.endsWith('.js')) return;
  const filePath = path.join(apiFolder, file);
  const route = require(filePath);
  if (typeof route === 'function') {
    const routeName = '/api/' + path.basename(file, '.js');
    app.use(routeName, route);
    console.log(`Loaded endpoint: ${routeName}`);
  } else {
    console.warn(`⚠️ Pominięto ${file} — nie jest poprawnym routerem Express`);
  }
});

const frontendPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendPath));

app.use((req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
