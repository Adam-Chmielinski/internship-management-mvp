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

// Load all .js files in the backend folder except server.js
const apiFolder = __dirname;

fs.readdirSync(apiFolder).forEach(file => {
  if (file === 'server.js') return;
  if (!file.endsWith('.js')) return;

  const filePath = path.join(apiFolder, file);
  const route = require(filePath);

  const routeName = '/api/' + path.basename(file, '.js');
  app.use(routeName, route);

  console.log(`Loaded: ${routeName}`);
});

// / route
app.get('/', (req, res) => {
  res.send('Backend is running');
});

// Example test route
app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello from backend!' });
});

// Load routes from routes/ folder if exists
const routesFolder = path.join(__dirname, 'routes');

if (fs.existsSync(routesFolder)) {
  fs.readdirSync(routesFolder).forEach(file => {
    if (!file.endsWith('.js')) return;

    const filePath = path.join(routesFolder, file);
    const route = require(filePath);

    const routeName = '/api/' + path.basename(file, '.js');
    app.use(routeName, route);

    console.log(`Loaded route: ${routeName}`);
  });
}

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
