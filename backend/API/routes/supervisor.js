/* TODO:
-list interns and their tasks with statuses
-provide weekly monitoring report functionality
-add document uploading and dowloading
-allow supervisors to approve final task reports
*/
const express = require('express');
const pool = require('../db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// GET interns assigned to a supervisor
router.get('/interns', async (req, res) => {
  
  const decoded = authenticateToken(req, res)
  console.log(decoded);

  try {
    const result = await pool.query(`
      SELECT i.id, i.full_name, i.training_sector, prog.program_name, i.tutor_final_approval
      FROM "Interns" i
      JOIN "Internship_Programs" prog ON i.program_id = prog.id
      WHERE i.supervisor_id = $1`,
      [decoded.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interns for this supervisor' });
  }
});

router.get('/checklist/:internId', async (req, res) => {
  const { internId } = req.params;

  try {
    const result = await pool.query(`
      SELECT 
        ia.id AS activity_id,
        a.function_description,
        a.activity_type,
        ia.status,
        ia.completion_date
      FROM "Intern_Activities" ia
      JOIN "Activities" a ON ia.activity_id = a.id
      WHERE ia.participant_id = $1
      ORDER BY a.id
    `, [internId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch checklist' });
  }
});

router.patch('/approve/:internId', async (req, res) => {
  const { internId } = req.params;

  try {
    const result = await pool.query(`
      UPDATE "Interns"
      SET tutor_final_approval = TRUE
      WHERE id = $1
      RETURNING *
    `, [internId]);

    if (result.rows.length === 0)
        return res.status(404).json({ error: 'Intern not found' });

    res.json({ message: 'Internship approved successfully', intern: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve internship' });
  }
});

router.post('/report', async (req, res) => {
    const { internId, tutorId, weekNum, tutorEvaluation } = req.body;

    if(!internId || !tutorId || !weekNum || !tutorEvaluation) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const timeFrame =  await pool.query(`
            SELECT ip.start_date, ip.end_date
            WHERE ip.id = (SELECT program_id FROM "Interns" WHERE id = $1)
            FROM "Internship_Programs" ip
        `, [internId]);

        if(timeFrame.rows.length === 0) {
            return res.status(404).json({ error: 'Intern or program not found' });
        }

        const startDate = new Date(timeFrame.rows[0].start_date);
        const endDate = new Date(timeFrame.rows[0].end_date);
        const totalWeeks = Math.ceil((endDate - startDate) / (7 * 24 * 60 * 60 * 1000));

        if(weekNum < 1 || weekNum > totalWeeks) {
            return res.status(400).json({ error: 'Invalid week number' });
        }


        const result = await pool.query(`
            INSERT INTO "Weekly_Monitoring" (intern_id, tutor_id, week_num, tutor_evaluation)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [internId, tutorId, weekNum, tutorEvaluation]);

        res.status(201).json({ message: 'Weekly report submitted', report: result.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to submit weekly report' });
    }
});

module.exports = router;