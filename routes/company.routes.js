const express = require('express');
const router = express.Router();
const Company = require('../models/Company');
const { protect, authorize } = require('../middleware/auth.middleware');

// GET /api/companies - All roles can view
// Update the GET /api/companies route
router.get('/', protect, async (req, res) => {
  try {
    const filter = { isActive: true };
    
    // Scoping logic
    if (req.user.role === 'coordinator') {
      filter.addedBy = req.user._id; // Coordinator sees their own
    } else if (req.user.role === 'student') {
      filter.addedBy = req.user.coordinator; // Student sees their coordinator's
    }

    const companies = await Company.find(filter)
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });
    res.json({ success: true, count: companies.length, data: companies });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
// GET /api/companies/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).populate('addedBy', 'name email');
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/companies - Coordinator only
router.post('/', protect, authorize('coordinator'), async (req, res) => {
  try {
    const company = await Company.create({ ...req.body, addedBy: req.user._id });
    res.status(201).json({ success: true, data: company });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// PUT /api/companies/:id - Coordinator only
router.put('/:id', protect, authorize('coordinator'), async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!company) return res.status(404).json({ success: false, message: 'Company not found.' });
    res.json({ success: true, data: company });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// DELETE /api/companies/:id - Coordinator only (soft delete)
router.delete('/:id', protect, authorize('coordinator'), async (req, res) => {
  try {
    await Company.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true, message: 'Company deactivated.' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
