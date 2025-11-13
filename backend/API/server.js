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
  const route = require(filePath);

  if (route && typeof route === 'function' && route.name === 'router') {
    const routeName = '/api/' + path.basename(file, '.js');
    app.use(routeName, route);
    console.log(`✅ Loaded router: ${routeName}`);
  } else if (route && route.use && route.handle) {
    const routeName = '/api/' + path.basename(file, '.js');
    app.use(routeName, route);
    console.log(`✅ Loaded endpoint: ${routeName}`);
  } else {
    console.warn(`⚠️ Pominięto ${file} — nie jest poprawnym routerem Express`);
  }
});

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
      console.log(`ℹ️ Pominięto ${file} (brak routera Express)`);
    }
  });
} else {
  console.log('⚠️ Folder "routes" nie istnieje – brak endpointów do załadowania.');
}

const frontendPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));

  app.use((req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
