const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Load main backend files (e.g. app.js, auth.js, db.js)
const rootFolder = __dirname;
fs.readdirSync(rootFolder).forEach(file => {
  if (file === 'server.js' || !file.endsWith('.js') || file.startsWith('_')) return;
  const filePath = path.join(rootFolder, file);
  try {
    require(filePath);
    console.log(`✅ Loaded module: ${file}`);
  } catch (err) {
    console.error(`❌ Failed to load ${file}: ${err.message}`);
  }
});

// Load routers from /routes
const routesFolder = path.join(__dirname, 'routes');
if (fs.existsSync(routesFolder)) {
  fs.readdirSync(routesFolder).forEach(file => {
    if (!file.endsWith('.js') || file.startsWith('_')) return;
    const filePath = path.join(routesFolder, file);
    try {
      const route = require(filePath);
      if (typeof route === 'function' || (route && route.handle && route.use)) {
        const routeName = '/api/' + path.basename(file, '.js');
        app.use(routeName, route);
        console.log(`✅ Loaded route: ${routeName}`);
      } else {
        console.log(`ℹ️ Skipped ${file} (not an Express router)`);
      }
    } catch (err) {
      console.error(`❌ Failed to load route ${file}: ${err.message}`);
    }
  });
} else {
  console.log('⚠️ No "routes" folder found.');
}

// Serve frontend build if available
const frontendPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.get('/', (req, res) => {
  res.send('Backend is running ✅');
});

app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server is running on port ${port}`);
});
