const express = require('express')
const pool = require('../db')
const cors = require('cors');
const jwt = require('jsonwebtoken');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET;

//file storage config


const UPLOAD_DIR = path.resolve(__dirname, '..', '..', 'docs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
destination: (req, file, cb) => cb(null, UPLOAD_DIR),
filename: (req, file, cb) => {
const ext = path.extname(file.originalname);
const base = path.basename(file.originalname, ext);
cb(null, `${base}-${Date.now()}${ext}`); // preserve extension
}
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 20*1024*1024 }, //10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|doc|docx|txt/;
        const extname = allowedTypes.test(file.originalname.toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('Only .pdf, .doc, .docx, .txt files are allowed'));
        }
}});



router.post('/upload/:internId', upload.single('document'), async (req, res) => {
    try {
        const { internId } = req.params;
        const { documentType } = req.body;
        const file = req.file;
        console.log(internId, documentType, file);

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const relativePath = "docs/" + path.basename(file.path);

        const result = await pool.query(
            `INSERT INTO "Documents" (intern_id, doc_type, file_path, upload_date)
                VALUES ($1, $2, $3, NOW()) RETURNING *`,
            [internId, documentType, relativePath]
        );

        res.status(201).json({ message: 'File uploaded successfully', document: result.rows[0] });
    } catch (err) {
        console.error('Error uploading file:', err);
        res.status(500).json({ error: 'File upload failed' });
    }
});

// GET /documents/overview/:internId
router.get('/:internId', async (req, res) => {
    const { internId } = req.params;

    try {
        const documentsQ = await pool.query(
            `SELECT
                id,
                doc_type,
                file_path,
                upload_date
                FROM "Documents"
                WHERE intern_id = $1`,
            [internId]
        );

        res.json({
            documents: documentsQ.rows
        });
    } catch (err) {
        console.error('Error fetching overview:', err);
        res.status(500).json({ error: 'Failed to fetch overview' });
    }
});

router.get('/download/:documentId', async (req, res) => {
    const { documentId } = req.params;

    try {
        const docQ = await pool.query(
            `SELECT file_path FROM "Documents" WHERE id = $1`,
            [documentId]
        );

        if (docQ.rowCount === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const filePath = path.resolve(__dirname, '..', '..', docQ.rows[0].file_path);
        res.download(filePath);
    }   catch (err) {
        console.error('Error downloading file:', err);
        res.status(500).json({ error: 'File download failed' });
    }
});

module.exports = router;