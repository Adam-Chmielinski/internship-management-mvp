const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// 1️⃣ Wczytaj pliki z głównego katalogu (np. app.js, auth.js, db.js)
const rootFolder = __dirname;

fs.readdirSync(rootFolder).forEach(file => {
  if (file === 'server.js' || file.startsWith('_') || !file.endsWith('.js')) return;
  const filePath = path.join(rootFolder, file);
  try {
    require(filePath);
    console.log(`✅ Załadowano moduł: ${file}`);
  } catch (err) {
    console.error(`❌ Błąd przy ładowaniu ${file}:`, err.message);
  }
});

// 2️⃣ Wczytaj routery z folderu "routes"
const routesFolder = path.join(__dirname, 'routes');

if (fs.existsSync(routesFolder)) {
  fs.readdirSync(routesFolder).forEach(file => {
    if (file.startsWith('_') || !file.endsWith('.js')) return;
    const filePath = path.join(routesFolder, file);
    const route = require(filePath);

    if (route && route.use && route.handle) {
      const routeName = '/api/' + path.basename(file, '.js');
      app.use(routeName, route);
      console.log(`✅ Loaded route: ${routeName}`);
    } else {
      console.log(`ℹ️ Pominięto ${file} (nie jest routerem Express)`);
    }
  });
} else {
  console.log('⚠️ Folder "routes" nie istnieje – brak endpointów do załadowania.');
}

// 3️⃣ Obsługa frontendu (np. React build)
const frontendPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.use((req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
}

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
