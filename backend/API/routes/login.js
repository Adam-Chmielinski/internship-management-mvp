const express = require('express')
const pool = require('../db')
const cors = require('cors');
const router = express.Router();


router.get('/', async(req, res) => {
  const{email, password} = req.body;

  try {
    const hr = await pool.query('SELECT * FROM "HR"');

    if (!hr || hr.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { hrId: hr.id },
      JWT_SECRET,
      { expiresIn: '1h' }  // token ważny 1 godzinę
    );


    res.json({ 
      token: token, 
      id: hr.id
      });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
