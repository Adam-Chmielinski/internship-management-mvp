const express = require('express');
const pool = require('./db');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

require('dotenv').config()

const checklistRoutes = require('./routes/checklist.js');
app.use('/checklist', checklistRoutes);

const allusersRoutes = require('./routes/all_users.js');
app.use('/getAllUsers', allusersRoutes);

const loginRoutes = require('./routes/login.js');
app.use('/login', loginRoutes);

const supervisorRoutes = require('./routes/supervisor.js');
app.use('/supervisor', supervisorRoutes);

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
app.listen(port, '0.0.0.0', () => {
  console.log(`Example app listening on port ${port}`)
})
