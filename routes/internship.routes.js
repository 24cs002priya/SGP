const express = require('express');
const router = express.Router();
const Internship = require('../models/Internship');
const { protect, authorize } = require('../middleware/auth.middleware');

// GET /api/internships - All roles
// Update the GET /api/internships route
router.get('/', protect, async (req, res) => {
  try {
    const filter = { isActive: true };
    if (req.query.company) filter.company = req.query.company;

    // Scoping logic
    if (req.user.role === 'coordinator') {
      filter.addedBy = req.user._id; 
    } else if (req.user.role === 'student') {
      filter.addedBy = req.user.coordinator;
    }

    const internships = await Internship.find(filter)
      .populate('company', 'name industry location logo')
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: internships.length, data: internships });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// GET /api/internships/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const internship = await Internship.findById(req.params.id)
      .populate('company', 'name description industry website location logo')
      .populate('addedBy', 'name');
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found.' });
    res.json({ success: true, data: internship });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/internships - Coordinator only
router.post('/', protect, authorize('coordinator'), async (req, res) => {
  try {
    const internship = await Internship.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, data: internship });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/internships/:id - Coordinator only
router.put('/:id', protect, authorize('coordinator'), async (req, res) => {
  try {
    const internship = await Internship.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!internship) return res.status(404).json({ success: false, message: 'Internship not found.' });
    res.json({ success: true, data: internship });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/internships/:id - Coordinator only
router.delete('/:id', protect, authorize('coordinator'), async (req, res) => {
  try {
    await Internship.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Internship deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
