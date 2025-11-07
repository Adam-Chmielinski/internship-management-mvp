const express = require('express');
const pool = require('./db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const app = express();

app.use(cors());
app.use(express.json());

require('dotenv').config()
const JWT_SECRET = process.env.JWT_SECRET;

const checklistRoutes = require('./routes/checklist.js');
app.use('/checklist', checklistRoutes);

const allusersRoutes = require('./routes/all_users.js');
app.use('/getAllUsers', allusersRoutes);

const loginRoutes = require('./routes/login.js');
app.use('/hrLogin', loginRoutes);

const supervisorRoutes = require('./routes/supervisor.js');
app.use('/supervisor', supervisorRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
})

app.get('/getAllUsers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Interns"');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

app.post('/login', async(req, res) => {
  var{email, password} = req.body;
  var role = "HR";
  try {
    var result = await pool.query('SELECT id, email, password FROM "HR" WHERE email = $1',[email]);
    if(result.rowCount == 0) {
      result = await pool.query('SELECT id, email, password FROM "Supervisor" WHERE email = $1',[email]);
      role = "Supervisor"
    }
    if(result.rowCount == 0) {
      result = await pool.query('SELECT id, email, password FROM "Interns" WHERE email = $1',[email]);
      role = "Intern"
    }
    const user = result.rows[0];

    if (!user || user.password != password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user.id , roleType: role},
      JWT_SECRET,
      { expiresIn: '1h' }  // token ważny 1 godzinę
    );

    res.json({ 
      token: token, 
      id: user.id,
      role: role
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
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
