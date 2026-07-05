const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { requireRole, authMiddleware } = require('../middleware/auth');

const router = express.Router();
const dest = path.join(__dirname, '../../uploads/images');
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: dest,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  })
});

router.post('/', ...requireRole('admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/images/${req.file.filename}` });
});

router.post('/avatar', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/images/${req.file.filename}` });
});

module.exports = router;
