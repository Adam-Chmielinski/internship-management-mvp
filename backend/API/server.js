const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const apiFolder = __dirname;

// 🔹 Automatyczne ładowanie routerów z folderu API
fs.readdirSync(apiFolder).forEach(file => {
  if (file === 'server.js' || file.startsWith('_') || !file.endsWith('.js')) return;

  const filePath = path.join(apiFolder, file);
  let route;

  try {
    route = require(filePath);
  } catch (err) {
    console.error(`❌ Błąd przy ładowaniu ${file}:`, err.message);
    return;
  }

  const routeName = '/api/' + path.basename(file, '.js');
  if (typeof route === 'function' || (route && typeof route === 'object' && 'use' in route)) {
    app.use(routeName, route);
    console.log(`✅ Załadowano endpoint: ${routeName}`);
  } else {
    console.warn(`⚠️ Pominięto ${file} — nie jest poprawnym routerem Express`);
  }
});

// 🔹 Serwowanie zbudowanego frontendu Reacta
const frontendPath = path.join(__dirname, '../../frontend/build');
app.use(express.static(frontendPath));

// 🔹 Każdy inny request → index.html (dla React Routera)
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
