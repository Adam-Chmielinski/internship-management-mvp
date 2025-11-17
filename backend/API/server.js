const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
  origin: 'https://172.24.0.67:3000/login',
    //origin: 'https://internship-management-mvp.netlify.app', 
}));

function loadAllFiles(folderPath, prefix = '/api') {
  if (!fs.existsSync(folderPath)) return;

  fs.readdirSync(folderPath).forEach(file => {
    if (!file.endsWith('.js')) return;

    const filePath = path.join(folderPath, file);
    const module = require(filePath);
    const routeName = prefix + '/' + path.basename(file, '.js');

    if (module && typeof module === 'function' && module.name === 'router') {
      app.use(routeName, module);
      console.log(`✅ Loaded router: ${routeName}`);
    } else if (module && module.use && module.handle) {
      app.use(routeName, module);
      console.log(`✅ Loaded endpoint: ${routeName}`);
    } else {
      console.log(`ℹ️ Loaded file (not a router): ${routeName}`);
    }
  });
}

loadAllFiles(__dirname);
const routesFolder = path.join(__dirname, 'routes');
loadAllFiles(routesFolder);

app.get('/', (req, res) => {
  res.send('Backend is running!');
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

const frontendPath = path.join(__dirname, '../../frontend/build');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
});
