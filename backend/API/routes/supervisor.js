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

router.get('/fullName', authenticateToken, async (req, res) => {
    try{
    const result = await pool.query(`
        SELECT full_name FROM "Supervisor" WHERE id = $1
        `,[req.userId]);
        res.status(200).json(result.rows);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
})

// GET interns assigned to a supervisor
router.get('/interns', authenticateToken, async (req, res) => {

  try {
    const result = await pool.query(`
      SELECT i.id, i.full_name, i.email, i.training_sector, prog.program_name, i.tutor_final_approval
      FROM "Interns" i
      JOIN "Internship_Programs" prog ON i.program_id = prog.id
      WHERE prog.supervisor_id = $1`,
      [req.userId]);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch interns for this supervisor' });
  }
});

router.get('/intern/:internId', authenticateToken, async (req, res) => {
  const { internId } = req.params;
  
  try {
    const result = await pool.query(`
      SELECT i.full_name, i.training_sector, prog.program_name
      FROM "Interns" i
      JOIN "Internship_Programs" prog ON i.program_id = prog.id
      WHERE i.id = $1`,
      [internId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Intern not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch intern details' });
  }
});

router.get('/checklist/:internId', authenticateToken, async (req, res) => {
  const { internId } = req.params;

  if(!Number.isInteger(Number(internId))) {
    return res.status(400).json({ error: 'Invalid intern ID' });
  }

  try {
    const result = await pool.query(`
      SELECT 
        ia.id as assignment_id,
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

router.patch('/interns/approve', authenticateToken, async (req, res) => {
  //const supervisorId = Number(req.params.supervisorId);

  const supervisorId = Number(req.userId);
  const internId = Number(req.body.participantId);

  console.log(`Supervisor ${supervisorId} approving intern ${internId}`);

  if (!Number.isInteger(supervisorId) || !Number.isInteger(internId)) {
    return res.status(400).json({ error: 'Invalid path parameters' });
  }

  // does approval needs all tasks completed
  const enforceAllTasksCompleted = true;

  try {
    const update = await pool.query(`
      UPDATE "Interns" i
      SET tutor_final_approval = TRUE
      WHERE i.id = $1
      AND EXISTS (
        SELECT 1
        FROM "Internship_Programs" prog
        WHERE prog.id = i.program_id
        AND prog.supervisor_id = $2
      )
      AND (i.tutor_final_approval IS DISTINCT FROM TRUE)
      AND (
        NOT $3
        OR NOT EXISTS (
          SELECT 1
          FROM "Intern_Activities" ia
          WHERE ia.participant_id = i.id
          AND ia.status <> 'Completed'
        )
      )
      RETURNING i.id, i.full_name, i.tutor_final_approval
    `, [internId, supervisorId, enforceAllTasksCompleted]);

    if (update.rowCount === 1) {
      return res.json({
        message: 'Internship approved successfully',
        intern: update.rows[0]
      });
    }

    // figure out why not working for better error reporting:
    // does the intern exist
    const internRes = await pool.query(`
      SELECT i.id, prog.supervisor_id, i.tutor_final_approval
      FROM "Interns" i
      JOIN "Internship_Programs" prog ON i.program_id = prog.id
      WHERE i.id = $1
    `, [internId]);

    if (internRes.rowCount === 0) {
      return res.status(404).json({ error: 'Intern not found' });
    }

    const intern = internRes.rows[0];

    // is intern assigned to this supervisor
    if (Number(intern.supervisor_id) !== supervisorId) {
      return res.status(403).json({ error: 'You are not authorized to approve this intern' });
    }

    // 5c) Already approved?
    if (intern.tutor_final_approval === true) {
      return res.status(409).json({ error: 'Internship already approved' });
    }

    // check if there are any remaining tasks if enforcement is on
    if (enforceAllTasksCompleted) {
      const remaining = await pool.query(`
        SELECT COUNT(*)::int AS remaining
        FROM "Intern_Activities"
        WHERE participant_id = $1
          AND status <> 'Completed'
      `, [internId]);

      if (remaining.rows[0].remaining > 0) {
        return res.status(400).json({
          error: 'Not all tasks are completed',
          remainingTasks: remaining.rows[0].remaining
        });
      }
    }
    return res.status(400).json({ error: 'Approval could not be applied' });

  } catch (err) {
    console.error('Approve error:', err);
    return res.status(500).json({ error: 'Failed to approve internship' });
  }
});

// POST /supervisor/:supervisorId/interns/:internId/weekly
// Body: { weekNum: number, tutorEvaluation: string }
router.post('/intern/weekly', authenticateToken, async (req, res) => {
  const supervisorId = Number(req.userId);
  const internId = Number(req.body.participantId);
  const tutorEvaluation = (req.body.evaluation || '').trim();

  //const weekNum = Number.parseInt(req.body.weekNum, 10);
  const lastReport = await pool.query(`
    SELECT week_num
    FROM "Weekly_Monitoring"
    WHERE participant_id = $1
    ORDER BY week_num DESC
    LIMIT 1
  `, [internId]);

  const weekNum = lastReport.rows[0] ? lastReport.rows[0].week_num + 1 : 1; // always next week

  // 1) Payload and path validation up-front keeps queries clean and errors obvious
  if (!Number.isInteger(supervisorId) || !Number.isInteger(internId)) {
    console.log("to nie działa");
    return res.status(400).json({ error: 'Invalid path parameters' });
  }
  if (!Number.isInteger(weekNum) || weekNum < 1) {
    return res.status(400).json({ error: 'weekNum must be a positive integer' });
  }
  if (!tutorEvaluation) {
    return res.status(400).json({ error: 'tutorEvaluation is required' });
  }

  try {
    // 2) Authorization: ensure this intern is actually assigned to this supervisor
    //    Doing it in SQL (WHERE supervisor_id = $2) is stronger than a UI-only check.
    const owns = await pool.query(`
      SELECT 1
      FROM "Interns" i
      JOIN "Internship_Programs" prog ON i.program_id = prog.id
      WHERE i.id = $1 AND prog.supervisor_id = $2
    `, [internId, supervisorId]);

    if (owns.rowCount === 0) {
      // Could be 404 (hide existence) or 403 (explicit). Using 403 to be clear during dev.
      return res.status(403).json({ error: 'You are not authorized to submit a report for this intern' });
    }

    // 3) Get program timeframe and compute allowed week range in the DB
    //    Why in SQL? It avoids JS timezone quirks and keeps the source of truth in one place.
    const tf = await pool.query(`
      SELECT
        ip.start_date,
        ip.end_date,
        CEIL(GREATEST(1, (ip.end_date::date - ip.start_date::date + 1)) / 7.0) AS total_weeks
      FROM "Internship_Programs" ip
      JOIN "Interns" i ON i.program_id = ip.id
      WHERE i.id = $1
    `, [internId]);

    if (tf.rowCount === 0) {
      return res.status(404).json({ error: 'Intern or program not found' });
    }

    const totalWeeks = Number(tf.rows[0].total_weeks);
    if (!Number.isFinite(totalWeeks) || totalWeeks < 1) {
      return res.status(400).json({ error: 'Program has invalid dates (start/end)' });
    }

    if (weekNum < 1 || weekNum > totalWeeks) {
      return res.status(400).json({
        error: 'Invalid week number',
        details: { weekNum, totalWeeks }
      });
    }

    // 4) Insert or update the weekly report
    //    We use ON CONFLICT on (intern_id, week_num) to prevent duplicates.
    //    The unique index added above makes this possible.
    const upsert = await pool.query(`
      INSERT INTO "Weekly_Monitoring" (participant_id, tutor_id, week_num, tutor_evaluation)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (participant_id, week_num)
      DO UPDATE SET
        tutor_evaluation = EXCLUDED.tutor_evaluation,
        tutor_id = EXCLUDED.tutor_id
      RETURNING *
    `, [internId, supervisorId, weekNum, tutorEvaluation]);

    // 5) Clear, explicit response (201 for created or updated alike for simplicity)
    return res.status(201).json({
      message: 'Weekly report saved',
      report: upsert.rows[0]
    });

  } catch (err) {
    // If you forgot the unique index, ON CONFLICT throws:
    //  "there is no unique or exclusion constraint matching the ON CONFLICT specification"
    console.error('Weekly report error:', err);
    return res.status(500).json({ error: 'Failed to submit weekly report' });
  }
});

module.exports = router;