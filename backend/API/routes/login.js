const express = require('express')
const pool = require('../db')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.post('/', async(req, res) => {
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
});

module.exports = router;
