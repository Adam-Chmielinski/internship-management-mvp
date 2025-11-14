const express = require('express');
const cors = require('cors'); // żeby frontend mógł robić requesty

const app = express();

// Dodaj CORS dla frontendowej domeny
app.use(cors({
  origin: 'https://twoj-frontend.netlify.app', // zmień na swój Netlify URL
}));

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Backend działa!');
});

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Cześć z backendu!' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
