const express = require('express')
const pool = require('../db')
const cors = require('cors');
const { authenticateToken } = require('../auth');
const router = express.Router();



router.get('/:participantId', async (req, res) => {
  const { participantId } = req.params;

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
  `, [participantId]);
    res.status(200).json(result.rows);
    } catch (err) {
      console.error('Error fetching checklist:', err);
      res.status(500).json({ error: 'Database query failed' });
    }
});

router.post('/update/:task_id', authenticateToken, async(req, res) => {
  try {
    const { task_id } = req.params;
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
      [status, completionDate, task_id]
    );

    res.json({'message': 'Activity updated successfully', 'activity': result.rows[0]});
  } catch (err) {
    console.error('Error updating activity:', err);
    res.status(500).json({ error: 'Database update failed' });
  }
});

module.exports = router;