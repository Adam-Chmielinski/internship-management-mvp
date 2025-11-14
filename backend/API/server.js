
const express = require('express');
const cors = require('cors'); // żeby frontend mógł robić requesty
const cors = require('cors');

const app = express();

// Dodaj CORS dla frontendowej domeny

app.use(cors({
  origin: 'https://twoj-frontend.netlify.app', // zmień na swój Netlify URL
