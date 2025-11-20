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

        const doc = new PDFDocument({
            size: 'A4',
            layout: 'landscape', // Horizontal orientation
            margins: {
                top: 40,
                bottom: 40,
                left: 60,
                right: 60
            }
        });

        const timestamp = Date.now();
        const filename = `certificate_intern_${internId}_${timestamp}.pdf`;
        const relativePath = (`docs/${filename}`);
        const pdfPath = path.join(__dirname, `../../docs/${filename}`);

        doc.pipe(fs.createWriteStream(pdfPath));

        const start_date = internData.start_date.toLocaleDateString();
        const end_date = internData.end_date.toLocaleDateString();

        // ========================================
        // CERTIFICATE DESIGN
        // ========================================

        // Store page dimensions for centering
        const pageWidth = doc.page.width;
        const pageHeight = doc.page.height;
        const centerX = pageWidth / 2;

        // 1. OUTER BORDER (Double border effect)
        // Outer border
        doc.rect(30, 30, pageWidth - 60, pageHeight - 60)
        .lineWidth(3)
        .strokeColor('#1e3a5f')
        .stroke();

        // Inner border
        doc.rect(40, 40, pageWidth - 80, pageHeight - 80)
        .lineWidth(1)
        .strokeColor('#1e3a5f')
        .stroke();

        // 2. BACKGROUND WATERMARK (Optional - subtle pattern)
        doc.save();
        doc.opacity(0.05);
        for(let i = 0; i < 4; i++) {
            doc.fontSize(70)
            .fillColor('#aaa000')
            .text('CERTIFIED', 100 + (i * 200), 100 + (i * 120), {
                rotate: -45,
                lineBreak: false
            });
        }
        doc.restore();

        // 3. HEADER SECTION
        // Organization name (small, top)
        doc.fontSize(11)
        .fillColor('#666666')
        .font('Helvetica')
        .text('YUDAYA S.L.', 0, 70, {
            align: 'center',
            width: pageWidth
        });

        // Program name
        doc.fontSize(10)
        .fillColor('#666666')
        .text(internData.program_name.toUpperCase(), 0, 85, {
            align: 'center',
            width: pageWidth
        });

        // 4. MAIN TITLE
        doc.fontSize(42)
        .fillColor('#1e3a5f')
        .font('Helvetica-Bold')
        .text('CERTIFICATE', 0, 120, {
            align: 'center',
            width: pageWidth
        });

        doc.fontSize(20)
        .fillColor('#1e3a5f')
        .font('Helvetica')
        .text('OF COMPLETION', 0, 170, {
            align: 'center',
            width: pageWidth
        });

        // Decorative line under title
        doc.moveTo(centerX - 100, 200)
        .lineTo(centerX + 100, 200)
        .lineWidth(2)
        .strokeColor('#d4af37') // Gold color
        .stroke();

        // 6. RECIPIENT NAME (Large, prominent)
        doc.fontSize(32)
        .fillColor('#1e3a5f')
        .font('Helvetica-Bold')
        .text(internData.intern_name.toUpperCase(), 0, 230, {
            align: 'center',
            width: pageWidth
        });

        // Decorative line under name
        const nameWidth = doc.widthOfString(internData.intern_name.toUpperCase());
        const nameUnderlineX = (pageWidth - nameWidth) / 2;
        doc.moveTo(nameUnderlineX, 265)
        .lineTo(nameUnderlineX + nameWidth, 265)
        .lineWidth(1)
        .strokeColor('#1e3a5f')
        .stroke();

        // 7. ACHIEVEMENT DETAILS
        doc.fontSize(13)
        .fillColor('#333333')
        .font('Helvetica')
        .text(`has successfully completed the internship program`, 0, 290, {
            align: 'center',
            width: pageWidth
        });

        // Training sector (highlighted)
        doc.fontSize(16)
        .fillColor('#1e3a5f')
        .font('Helvetica-Bold')
        .text(internData.program_name.toUpperCase(), 0, 315, {
            align: 'center',
            width: pageWidth
        });

        // 8. PROGRAM DETAILS BOX
        const boxY = 350;
        const boxWidth = 400;
        const boxX = (pageWidth - boxWidth) / 2;

        // Background box
        doc.rect(boxX, boxY, boxWidth, 60)
        .fillAndStroke('#f8f9fa', '#e0e0e0');

        // Format dates
        const startDate = new Date(internData.start_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        const endDate = new Date(internData.end_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        // Duration text
        doc.fontSize(11)
        .fillColor('#333333')
        .font('Helvetica')
        .text(`Duration: ${startDate} - ${endDate}`, boxX, boxY + 15, {
            align: 'center',
            width: boxWidth
        });

        // Calculate duration in weeks
        const start = new Date(internData.start_date);
        const end = new Date(internData.end_date);
        const weeks = Math.ceil((end - start) / (7 * 24 * 60 * 60 * 1000));

        doc.text(`Total Duration: ${weeks} weeks`, boxX, boxY + 35, {
            align: 'center',
            width: boxWidth
        });

        // 9. COMMENDATION TEXT
        doc.fontSize(11)
        .fillColor('#666666')
        .font('Helvetica-Oblique')
        .text('In recognition of dedication, professional growth, and successful completion', 0, 440, {
            align: 'center',
            width: pageWidth
        })
        .text('of all required competencies and assigned tasks.', 0, 455, {
            align: 'center',
            width: pageWidth
        });

        // 10. SIGNATURES SECTION
        const signatureY = 510;
        const signatureWidth = 200;
        const leftSignatureX = 150;
        const rightSignatureX = pageWidth - 350;

        // Left signature line
        doc.moveTo(leftSignatureX, signatureY)
        .lineTo(leftSignatureX + signatureWidth, signatureY)
        .lineWidth(0.5)
        .strokeColor('#333333')
        .stroke();

        // Left signature text
        doc.fontSize(9)
        .fillColor('#666666')
        .font('Helvetica-Bold')
        .text('Program Supervisor signature', leftSignatureX, signatureY + 10, {
            width: signatureWidth,
            align: 'center'
        });

        // Right signature line
        doc.moveTo(rightSignatureX, signatureY)
        .lineTo(rightSignatureX + signatureWidth, signatureY)
        .lineWidth(0.5)
        .strokeColor('#333333')
        .stroke();

        // Right signature text
        doc.fontSize(9)
        .fillColor('#666666')
        .font('Helvetica-Bold')
        .text('HR signature and stamp', rightSignatureX, signatureY + 10, {
            width: signatureWidth,
            align: 'center'
        });

        // 11. FOOTER SECTION
        const footerY = pageHeight - 70;

        // Certificate ID
        const certificateId = `CERT-${new Date().getFullYear()}-${String(internId).padStart(4, '0')}`;
        doc.fontSize(8)
        .fillColor('#999999')
        .font('Helvetica')
        .text(`${certificateId}`, 60, footerY);

        // Issue date
        const issueDate = new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        doc.text(`${issueDate}`, pageWidth - 200, footerY, {
            width: 140,
            align: 'right'
        });
        doc.end();

        // Save certificate record in the database

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
    const internId = Number(req.userId);
    if(req.role !== "Intern")
        return res.status(403).json({ error: 'Access denied' });
    try {
    const result = await pool.query(`
        SELECT file_path FROM "Documents"
        WHERE intern_id = $1 AND doc_type = 'Final Certificate'`
        ,[internId]);

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