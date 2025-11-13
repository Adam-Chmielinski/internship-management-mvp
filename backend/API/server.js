const express = require('express');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const rootFolder = __dirname;
fs.readdirSync(rootFolder).forEach(file => {
  if (file === 'server.js' || file.startsWith('_') || !file.endsWith('.js')) return;
  const filePath = path.join(rootFolder, file);
  try {
    require(filePath);
    console.log(`✅ Loaded module: ${file}`);
  } catch (err) {
    console.error(`❌ Error loading ${file}:`, err.message);
  }
});

try {
  const authRouter = require('./auth.js').default || require('./auth.js');
  app.use('/api/auth', authRouter);
  console.log('✅ Loaded router: /api/auth');
} catch (err) {
  console.error('⚠️ Failed to load auth.js:', err.message);
}

const routesFolder = path.join(__dirname, 'routes');

if (fs.existsSync(routesFolder)) {
  fs.readdirSync(routesFolder).forEach(file => {
    if (file.startsWith('_') || !file.endsWith('.js')) return;
    const filePath = path.join(routesFolder, file);
    try {
      const route = require(filePath);
      if (route && route.use && route.handle) {
        const routeName = '/api/' + path.basename(file, '.js');
        app.use(routeName, route);
        console.log(`✅ Loaded router: ${routeName}`);
      } else {
        console.log(`ℹ️ Skipped ${file} (not a valid Express router)`);
      }
    } catch (err) {
      console.error(`❌ Error loading ${file}:`, err.message);
    }
  });
} else {
  console.log('⚠️ "routes" folder not found – no endpoints loaded.');
}

const frontendPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.use((req, res) => res.sendFile(path.join(frontendPath, 'index.html')));
}

app.listen(port, () => {
  console.log(`🚀 Server is running on port ${port}`);
});
