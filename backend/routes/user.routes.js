const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth.middleware');

// --- NEW IMPORTS FOR FILE UPLOAD ---
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// --- MULTER SETUP ---
// Ensure resumes directory exists
const resumeDir = path.join(__dirname, '../uploads/resumes');
if (!fs.existsSync(resumeDir)) fs.mkdirSync(resumeDir, { recursive: true });

// Setup multer for resume uploads
const uploadResume = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, resumeDir),
    filename: (req, file, cb) => {
      cb(null, `${req.user._id}_resume_${Date.now()}${path.extname(file.originalname)}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(new Error('Only PDFs are allowed.'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});


// ─────────────────────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────────────────────

// GET /api/users/profile
router.get('/profile', protect, async (req, res) => {
  res.json({ success: true, data: req.user });
});

// PUT /api/users/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const allowed = ['name', 'phone', 'semester', 'department'];
    const updates = {};
    allowed.forEach(field => { if (req.body[field] !== undefined) updates[field] = req.body[field]; });

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.json({ success: true, data: user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/users/change-password
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');

    if (!(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    await user.save();
    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// --- NEW ROUTE: PUT /api/users/profile/resume ---
router.put('/profile/resume', protect, uploadResume.single('resume'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    
    const user = await User.findById(req.user._id);
    user.resume = {
      filename: req.file.originalname,
      path: `/uploads/resumes/${req.file.filename}`,
      uploadedAt: new Date(),
    };
    
    await user.save();
    
    // Hide password from response
    const userObj = user.toObject();
    delete userObj.password;

    res.json({ success: true, message: 'Resume uploaded successfully!', data: userObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;