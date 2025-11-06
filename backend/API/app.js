const express = require('express')
const pool = require('./db')
const cors = require('cors');
const app = express()

app.use(cors())
app.use(express.json())

// const checklistRoutes = require('./routes/checklist');
// app.use('/API/checklist', checklistRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!')
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

app.get('/checklist/:internId', async (req, res) => {
  const { internId } = req.params;

  try {
  const result = await pool.query(
      `SELECT 
        ia.id as assignment_id,
        a.function_description,
        a.activity_type,
        ia.status,
        ia.completion_date
      FROM "Intern_Activities" ia
      JOIN "Activities" a ON ia.id = a.id
      WHERE ia.participant_id = $1
      ORDER BY a.id
  `, [internId]);
    res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching checklist:', err);
      res.status(500).json({ error: 'Database query failed' });
    }
});

app.post('/checklist/update/:activityId', async(req, res) => {
  try {
    const { activityId } = req.params;
    const { status } = req.body;

    const completionDate = status === "Completed" ? new Date() : null;

    const allowedStatuses = ["Pending", "In progress", "Completed"];
    if(!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }
    
    const result = await pool.query(
      `UPDATE "Intern_Activities"
       SET status = $1, completion_date = $2
       WHERE id = $3
       RETURNING *`,
      [status, completionDate, activityId]
    );

    res.json({'message': 'Activity updated successfully', 'activity': result.rows[0]});
  } catch (err) {
    console.error('Error updating activity:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
