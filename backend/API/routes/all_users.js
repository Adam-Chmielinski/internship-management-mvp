const express = require('express')
const pool = require('../db')
const cors = require('cors');
const bcrypt = require('bcrypt');
const router = express.Router();

router.get('/interns', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Interns"');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

router.get('/unassignedInterns', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Interns" WHERE program_id IS NULL');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

router.get('/supervisors', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM "Supervisor"');
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

module.exports = router;