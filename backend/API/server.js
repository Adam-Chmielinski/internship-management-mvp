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

  const routeName = '/api/' + path.basename(file, '.js');
  app.use(routeName, route);

  console.log(`Loaded endpoint: ${routeName}`);
});

app.get('/', (req, res) => {
  res.json({ message: 'API server is running!' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
