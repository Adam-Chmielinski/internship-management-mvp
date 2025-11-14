const express = require('express');
const express1 = express;
const cors = require('cors');
const pool = require('./db');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(bodyParser.json());
app.use(express.json());

app.get('/test', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({ status: 'Backend działa', serverTime: result.rows[0] });
  } catch (err) {
    res.status(500).json({ status: 'Błąd połączenia z bazą', error: err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Niepoprawne dane logowania' });
    }

    const user = result.rows[0];
    res.json({ message: 'Zalogowano pomyślnie', user });
  } catch (err) {
    res.status(500).json({ error: 'Błąd serwera' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend działa na http://localhost:${PORT}`);
});

const app2 = express1();
app2.get('/test2', (req, res) => res.send('To jest druga instancja Express!'));
