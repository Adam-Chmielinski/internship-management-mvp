const express = require('express');
const pool = require('../db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { authenticateToken } = require('../auth');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { error } = require('console');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

router.get('/fullName', authenticateToken, async (req, res) => {
    try{
    const result = await pool.query(`
        SELECT full_name FROM "HR" WHERE id = $1
        `,[req.userId]);
        res.status(200).json(result.rows);
    } catch(err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
})

router.get('/internships', authenticateToken, async (req, res) => {

    try {
        const result_general = await pool.query(`
            SELECT ip.id, ip.program_name, ip.start_date, ip.end_date, s.full_name
            FROM "Internship_Programs" ip JOIN "Supervisor" s ON ip.supervisor_id = s.id
            JOIN "HR" hr ON ip.host_org_id = hr.id
            WHERE hr.id = $1;
            `,[req.userId]);

        const programsWithInterns = await Promise.all(
            result_general.rows.map(async (element) => {
                const result_intern = await pool.query(`
                    SELECT i.id, i.full_name,
                    ROUND((COUNT(*) FILTER (WHERE ia.status = 'Completed')::decimal / NULLIF(COUNT(*), 0)) * 100) AS completion_percentage
                    FROM "Interns" i 
                    JOIN "Intern_Activities" ia ON i.id = ia.participant_id
                    JOIN "Internship_Programs" ip ON i.program_id = ip.id
                    WHERE ip.id = $1
                    GROUP BY i.id
                `, [element.id]);
                
                return {
                    ...element,
                    interns: result_intern.rows
                };
            })
        );

        res.status(200).json(programsWithInterns);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

router.post('/createIntern', authenticateToken, async(req, res) => {
    var{full_name, email, password, training_sector} = req.body;

    try{
        const result = await pool.query(`SELECT * FROM "Interns" WHERE email LIKE $1`,
            [email]
        );

        if(result.rowCount == 0) {
            const hashedPassword = await bcrypt.hash(password, 10);

            await pool.query(`INSERT INTO "Interns" (full_name, email, password, training_sector) 
            VALUES ($1,$2,$3,$4)`,
            [full_name, email, hashedPassword, training_sector]);

            return res.status(201).json({
                message: 'Created intern'
            });
        }else{
            return res.status(500).json({
                message: 'Email already in use'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Intern creation failed' });
    }
});

router.post('/createSupervisor', authenticateToken, async(req, res) => {
    var{full_name, email, password} = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    try{
        const result = await pool.query(`SELECT * FROM "Supervisor" WHERE email LIKE $1`,
            [email]
        );

        if(result.rowCount == 0) {
            await pool.query(`INSERT INTO "Supervisor" (full_name, email, password) 
            VALUES ($1,$2,$3)`,
            [full_name, email, hashedPassword]);

            return res.status(201).json({
                message: 'Created superviosr'
            });
        }else{
            return res.status(500).json({
                message: 'Email already in use'
            });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Supervisor creation failed' });
    }
});

router.post('/createInternship', authenticateToken, async(req, res) => {
    const{program_name, start_date, end_date, supervisor_id} = req.body

    try {
        await pool.query(`
            INSERT INTO "Internship_Programs" (program_name, start_date, end_date, host_org_id, supervisor_id)
            VALUES ($1,$2,$3,$4,$5)
            `,[program_name, start_date, end_date, req.userId, supervisor_id]);

        return res.status(201).json({
            message: 'Created internship program'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Internship creation failed'});
    }
});

router.patch('/assignIntern', authenticateToken, async(req, res) => {
    const{program_id, intern_id} = req.body;

    try {
        const tasks = await pool.query(`
            SELECT a.id FROM "Activities" a JOIN "Interns" i
            ON a.training_sector = i.training_sector
            WHERE i.id = $1
            `,[intern_id]);

        await Promise.all(
            tasks.rows.map(async (element) => {
                await pool.query(`
                    INSERT INTO "Intern_Activities" (participant_id, activity_id, status)
                    VALUES ($1,$2,$3)
                    `,[intern_id, element.id, 'Pending']);
            })
        );

        await pool.query(`
            UPDATE "Interns" SET program_id = $1 WHERE id = $2
            `,[program_id, intern_id]);

        return res.status(201).json({
            message: 'Assigned intern'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Intern assignment failed'});
    }
});

router.patch('/unassignIntern', authenticateToken, async(req, res) => {
    const{intern_id} = req.body;
    try {
        await pool.query(`
            DELETE FROM "Intern_Activities" WHERE participant_id = $1
            `,[intern_id]);

        await pool.query(`
            DELETE FROM "Weekly_Monitoring" WHERE participant_id = $1
            `,[intern_id]);


        const files = await pool.query(`
            SELECT * FROM "Documents" WHERE intern_id = $1
            `,[intern_id]);

        await Promise.all(
            files.rows.map(async (element) => {
                const absolutePath = path.join(__dirname, element.file_path);

                fs.unlink(absolutePath, (err) => {
                    if(err) {
                        return res.status(500).json({error: 'Failed to delete file'});
                    }
                    res.status(204).json({message: 'File deleted successfully'});
                });
            })
        );

        await pool.query(`
            DELETE FROM "Documents" WHERE intern_id = $1
            `,[intern_id]);

        await pool.query(`
            UPDATE "Interns" SET program_id = NULL, tutor_final_approval = false WHERE id = $1
            `,[intern_id]);

        return res.status(201).json({
            message: 'Deleted intern from program'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Intern disassignment failed'});
    }
});

module.exports = router;