const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mammoth = require('mammoth');
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

const memUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });

router.post('/', ...requireRole('admin'), upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/images/${req.file.filename}` });
});

router.post('/avatar', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  res.json({ url: `/uploads/images/${req.file.filename}` });
});

// .docx → HTML (admin only, in-memory, no file saved to disk)
router.post('/docx-to-html', ...requireRole('admin'), memUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'no file' });
  try {
    const result = await mammoth.convertToHtml({ buffer: req.file.buffer });
    res.json({ html: result.value, messages: result.messages });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
