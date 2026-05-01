const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth.middleware');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'internship_portal_secret_key', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

// POST /api/auth/register
// Add this NEW route above your /register route to fetch coordinators for the dropdown
router.get('/coordinators', async (req, res) => {
  try {
    const coordinators = await User.find({ role: 'coordinator', isActive: true })
      .select('name email _id');
    res.json({ success: true, data: coordinators });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update the POST /register route to include the coordinator
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, rollNumber, semester, phone, coordinator } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ success: false, message: 'Email already registered.' });

    // Ensure student selects a coordinator
    if (role === 'student' && !coordinator) {
      return res.status(400).json({ success: false, message: 'Please select a coordinator.' });
    }

    const user = await User.create({ name, email, password, role, rollNumber, semester, phone, coordinator });
    const token = signToken(user._id);

    res.status(201).json({ success: true, token, user });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password required.' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    if (!user.isActive) return res.status(403).json({ success: false, message: 'Account deactivated.' });

    const token = signToken(user._id);
    const userObj = user.toObject();
    delete userObj.password;

    res.json({ success: true, token, user: userObj });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;
