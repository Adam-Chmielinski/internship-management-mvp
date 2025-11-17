const express = require('express');
const pool = require('../db');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET;

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const { env } = require('process');
const { authenticateToken } = require('../auth');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: env.EMAIL_USER || '',
    pass: env.EMAIL_APP_PASSWORD || ''
  }
});

router.post('/:internId', async (req, res) => {
    try {
        const { internId } = req.params;

        const result = await pool.query(
            `SELECT
            i.full_name AS intern_name,
            i.training_sector,
            i.email AS intern_email,
            prog.program_name,
            prog.start_date,
            prog.end_date,
            s.full_name AS supervisor_name
        FROM "Interns" i
        JOIN "Internship_Programs" prog ON i.program_id = prog.id
        JOIN "Supervisor" s ON prog.supervisor_id = s.id
        WHERE i.id = $1`,
            [internId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Intern not found' });
        }

        const internData = result.rows[0];

        const doc = new PDFDocument();

        const timestamp = Date.now();
        const filename = `certificate_intern_${internId}_${timestamp}.pdf`;
        const relativePath = (`docs/${filename}`);
        const pdfPath = path.join(__dirname, `../../docs/${filename}`);

        doc.pipe(fs.createWriteStream(pdfPath));

        //const start_date = `${internData.start_date.getDate()}/${internData.start_date.getMonth()+1}/${internData.start_date.getYear()}`;
        //const end_date = `${internData.end_date.getDate()}/${internData.end_date.getMonth()+1}/${internData.ends_date.getYear()}`;
        const start_date = internData.start_date.toLocaleDateString();
        const end_date = internData.end_date.toLocaleDateString();

        doc.fontSize(20).text('Certificate of Completion', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`This is to certify that ${internData.intern_name} has successfully completed the internship program in the field of ${internData.training_sector}.`);
        doc.moveDown();
        doc.text(`Program Duration: ${start_date} to ${end_date}`);
        doc.moveDown();
        doc.text(`Supervisor: ${internData.supervisor_name}`);
        doc.moveDown();
        doc.text('We commend their dedication and hard work during this period.');
        doc.moveDown();
        const currentDate = new Date().toLocaleDateString();
        doc.text('Date of Issue: ' + currentDate);
        doc.end();

        await pool.query(
            `INSERT INTO "Documents" (intern_id, doc_type, file_path, upload_date)
            VALUES ($1, $2, $3, $4)`,
            [internId, 'Final Certificate', relativePath, new Date()] 
        );
        try {
            let mailOptions = {
            from: 'mikispeedcuber@gmail.com',
            to: internData.intern_email,
            subject: 'Your certificate for finishing the internship is here!',
            text: 'Congratulations on completing your internship! Please find your certificate attached.',
            attachments: [{ filename: 'certificate.pdf',
                            path: pdfPath
            }]
        };

            await transporter.sendMail(mailOptions, function(error, info){
                if (error) {
                    console.log(error);
                } else {
                    console.log('Email sent: ' + info.response);
            }});

        } catch (error) {
            console.error('Error sending email:', error);
        }

        res.json("success");

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: 'Server error' });
    }
});

router.get('/download', authenticateToken, async (req, res) => {
    console.log(req.userId);
    console.log(req.role);
    const internId = Number(req.userId);console.log(req.role);
    if(req.role !== "Intern")
        return res.status(403).json({ error: 'Access denied' });
    try {
    const result = await pool.query(
        `SELECT file_path FROM "Documents"
        WHERE intern_id = $1 AND doc_type = 'Final Certificate'`
        [internId]);

    if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Certificate not found' });
    }

    const filePath = path.resolve(__dirname, '..', '..', result.rows[0].file_path);
    res.download(filePath);
    } catch (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'File download failed' });
    }
});

module.exports = router;