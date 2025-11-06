const express = require('express');
const pool = require('./db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors());
app.use(express.json());

const checklistRoutes = require('./routes/checklist.js');
app.use('/checklist', checklistRoutes);

const allusersRoutes = require('./routes/all_users.js');
app.use('/getAllUsers', allusersRoutes);

const loginRoutes = require('./routes/login.js');
app.use('/hrLogin', loginRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
})




/*app.post('/addUser', async (req, res) => {
  const { name, email } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO users (name, email) VALUES ($1, $2) RETURNING *',
      [name, email]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database insert failed' });
  }
});*/


const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
