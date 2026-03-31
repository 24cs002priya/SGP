const express = require('express');
const router = express.Router();
const Application = require('../models/Application');
const Internship = require('../models/Internship');
const { protect, authorize } = require('../middleware/auth.middleware');
const upload = require('../middleware/upload.middleware');

// POST /api/applications - Student applies to an internship
router.post('/', protect, authorize('student'), async (req, res) => {
  try {
    const { internshipId, coverLetter } = req.body;

    const internship = await Internship.findById(internshipId);
    if (!internship || !internship.isActive) {
      return res.status(404).json({ success: false, message: 'Internship not found or closed.' });
    }

    // Check deadline
    if (internship.deadline && new Date() > new Date(internship.deadline)) {
      return res.status(400).json({ success: false, message: 'Application deadline has passed.' });
    }

    const application = await Application.create({
      student: req.user._id,
      internship: internshipId,
      company: internship.company,
      coverLetter,
    });

    await application.populate([
      { path: 'internship', select: 'title duration stipend' },
      { path: 'company', select: 'name industry' },
    ]);
    // Inside POST /api/applications, after fetching the internship:
    if (internship.addedBy.toString() !== req.user.coordinator.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only apply to internships managed by your assigned coordinator.' 
      });
    }
    res.status(201).json({ success: true, data: application });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ success: false, message: 'You have already applied to this internship.' });
    }
    res.status(400).json({ success: false, message: err.message });
  }
});

// GET /api/applications/my - Student: get own applications
router.get('/my', protect, authorize('student'), async (req, res) => {
  try {
    const applications = await Application.find({ student: req.user._id })
      .populate('internship', 'title duration stipend type skills')
      .populate('company', 'name industry location logo')
      .sort({ appliedAt: -1 });
    res.json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/applications/:id/offer-letter - Student uploads offer letter
router.put('/:id/offer-letter', protect, authorize('student'), upload.single('offerLetter'), async (req, res) => {
  try {
    const application = await Application.findOne({ _id: req.params.id, student: req.user._id });
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });

    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

    application.offerLetter = {
      filename: req.file.originalname,
      path: `/uploads/offer-letters/${req.file.filename}`,
      mimetype: req.file.mimetype,
      uploadedAt: new Date(),
    };
    application.hasOfferLetter = true;
    application.status = 'selected';
    await application.save();

    res.json({ success: true, message: 'Offer letter uploaded successfully.', data: application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/applications/:id - Get single application
router.get('/:id', protect, async (req, res) => {
  try {
    const query = { _id: req.params.id };
    // Students can only see their own
    if (req.user.role === 'student') query.student = req.user._id;

    const app = await Application.findOne(query)
      .populate('student', 'name email rollNumber semester')
      .populate('internship', 'title duration stipend type')
      .populate('company', 'name industry location');

    if (!app) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, data: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/applications/:id/status - Coordinator updates application status
router.put('/:id/status', protect, authorize('coordinator'), async (req, res) => {
  try {
    const { status, coordinatorNotes } = req.body;
    const application = await Application.findByIdAndUpdate(
      req.params.id,
      { status, coordinatorNotes },
      { new: true }
    );
    if (!application) return res.status(404).json({ success: false, message: 'Application not found.' });
    res.json({ success: true, data: application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
