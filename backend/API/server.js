const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const apiFolder = __dirname;

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

app.get('/', (req, res) => {
  res.json({ message: '✅ API server is running!' });
});

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
