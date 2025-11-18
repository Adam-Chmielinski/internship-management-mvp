const express = require('express')
const pool = require('../db')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../auth');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

// GET /intern/:internId/profile
router.get('/:internId/profile', authenticateToken, async (req, res) => {
    const { internId } = req.params;

    if (!Number.isInteger(Number(internId))) {
        return res.status(400).json({ error: 'Invalid intern ID' });
    }

    try {
        const profileQ = await pool.query(
            `SELECT
                i.id AS intern_id,
                i.full_name,
                i.email as intern_email,
                i.training_sector,
                i.email,
                i.tutor_final_approval,
                prog.id AS program_id,
                prog.program_name,
                prog.start_date,
                prog.end_date,
                s.id AS supervisor_id,
                s.full_name AS supervisor_name,
                s.email AS supervisor_email
            FROM "Interns" i
            LEFT JOIN "Internship_Programs" prog ON i.program_id = prog.id
            LEFT JOIN "Supervisor" s ON prog.supervisor_id = s.id
            WHERE i.id = $1`,
            [internId]
        );

        if (profileQ.rowCount === 0) {
            return res.status(404).json({ error: 'Intern not found' });
        }

        const profile = profileQ.rows[0];
        const isEnrolled = profile.program_id !== null;

        return res.json({
            id: profile.intern_id,
            full_name: profile.full_name,
            email: profile.intern_email,
            training_sector: profile.training_sector,
            tutor_final_approval: profile.tutor_final_approval,
            is_enrolled: isEnrolled,
            program: {
                id: profile.program_id,
                name: profile.program_name,
                start_date: profile.start_date,
                end_date: profile.end_date
            },
            supervisor: {
                id: profile.supervisor_id,
                name: profile.supervisor_name,
                email: profile.supervisor_email
            }
        });
    } catch (err) {
        console.error('Error fetching intern profile:', err);
        res.status(500).json({ error: 'Failed to load intern profile' });
    }
});

// GET /intern/:internId/progress
router.get('/:internId/progress', authenticateToken, async (req, res) => {
    const { internId } = req.params;

    if (!Number.isInteger(Number(internId))) {
        return res.status(400).json({ error: 'Invalid intern ID' });
    }

    try {
        const progressQ = await pool.query(
            `SELECT
                COUNT(*)::int AS total_tasks,
                COUNT(*) FILTER (WHERE ia.status = 'Completed')::int AS completed_tasks
            FROM "Intern_Activities" ia
            WHERE ia.participant_id = $1`,
            [internId]
        );

        const total = progressQ.rows[0]?.total_tasks ?? 0;
        const completed = progressQ.rows[0]?.completed_tasks ?? 0;
        const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

        return res.json({
            total_tasks: total,
            completed_tasks: completed,
            percent
        });
    } catch (err) {
        console.error('Error fetching intern progress:', err);
        res.status(500).json({ error: 'Failed to load intern progress' });
    }
});

// GET /intern/:internId/monitoring
router.get('/:internId/monitoring', authenticateToken, async (req, res) => {
    const { internId } = req.params;

    if (!Number.isInteger(Number(internId))) {
        return res.status(400).json({ error: 'Invalid intern ID' });
    }

    try {
        const monitoringQ = await pool.query(
            `SELECT
                id,
                week_num,
                tutor_evaluation,
                tutor_id
                FROM "Weekly_Monitoring"
                WHERE participant_id = $1
                ORDER BY week_num DESC`,
            [internId]
        );

        return res.json({ monitoring: monitoringQ.rows });
    } catch (err) {
        console.error('Error fetching intern monitoring:', err);
        res.status(500).json({ error: 'Failed to load intern monitoring' });
    }
});

// GET /intern/:internId/documents
router.get('/:internId/documents', authenticateToken, async (req, res) => {
    const { internId } = req.params;

    if (!Number.isInteger(Number(internId))) {
        return res.status(400).json({ error: 'Invalid intern ID' });
    }

    try {
        const documentsQ = await pool.query(
            `SELECT
                id,
                doc_type,
                file_path,
                upload_date
                FROM "Documents"
                WHERE intern_id = $1
                ORDER BY upload_date DESC LIMIT 5`,
            [internId]
        );

        return res.json({ documents: documentsQ.rows });
    } catch (err) {
        console.error('Error fetching intern documents:', err);
        res.status(500).json({ error: 'Failed to load intern documents' });
    }
});

router.get('/checklist/:internId', async (req, res) => {
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

module.exports = router;