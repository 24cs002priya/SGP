const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Application = require('../models/Application');
const Company = require('../models/Company');
const Internship = require('../models/Internship');
const { protect, authorize } = require('../middleware/auth.middleware');

// All coordinator routes require authentication + coordinator role
router.use(protect, authorize('coordinator'));

// ─────────────────────────────────────────────────────────────
// GET /api/coordinator/dashboard-stats
// Overview stats card data
// ─────────────────────────────────────────────────────────────
// Replace GET /dashboard-stats
router.get('/dashboard-stats', async (req, res) => {
  try {
    const myStudentIds = await User.distinct('_id', { role: 'student', isActive: true, coordinator: req.user._id });

    const [totalStudents, totalCompanies, totalApplications, studentsWithOffers] = await Promise.all([
      User.countDocuments({ role: 'student', isActive: true, coordinator: req.user._id }),
      Company.countDocuments({ isActive: true, addedBy: req.user._id }),
      Application.countDocuments({ student: { $in: myStudentIds } }),
      Application.countDocuments({ student: { $in: myStudentIds }, hasOfferLetter: true }),
    ]);

    const appliedStudentIds = await Application.distinct('student', { student: { $in: myStudentIds } });
    const studentsYetToApply = totalStudents - appliedStudentIds.length;

    res.json({
      success: true,
      data: { totalStudents, totalCompanies, totalApplications, studentsWithOffers, studentsWithoutOffers: appliedStudentIds.length - studentsWithOffers, studentsYetToApply }
    });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
// ─────────────────────────────────────────────────────────────
// GET /api/coordinator/students-yet-to-apply
// AGGREGATION: Find students who have ZERO applications
// ─────────────────────────────────────────────────────────────
// Replace GET /students-yet-to-apply
router.get('/students-yet-to-apply', async (req, res) => {
  try {
    const myStudentIds = await User.distinct('_id', { role: 'student', isActive: true, coordinator: req.user._id });
    const appliedStudentIds = await Application.distinct('student', { student: { $in: myStudentIds } });

    const studentsYetToApply = await User.find({
      _id: { $in: myStudentIds, $nin: appliedStudentIds }
    }).select('name email rollNumber semester phone createdAt').sort({ name: 1 });

    res.json({ success: true, count: studentsYetToApply.length, data: studentsYetToApply });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
// ─────────────────────────────────────────────────────────────
// GET /api/coordinator/students-without-offer
// Students who applied but haven't uploaded an offer letter
// ─────────────────────────────────────────────────────────────
router.get('/students-without-offer', async (req, res) => {
  try {
    /*
     * Aggregation Pipeline:
     * 1. Match all applications where hasOfferLetter = false
     * 2. Group by student to avoid duplicates
     * 3. Lookup student details
     */
    const results = await Application.aggregate([
      { $match: { hasOfferLetter: false } },
      {
        $group: {
          _id: '$student',
          applicationCount: { $sum: 1 },
          companies: { $addToSet: '$company' },
          latestApplied: { $max: '$appliedAt' },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      { $unwind: '$studentInfo' },
      { $match: { 'studentInfo.isActive': true, 'studentInfo.coordinator': new mongoose.Types.ObjectId(req.user._id) } },
      {
        $lookup: {
          from: 'companies',
          localField: 'companies',
          foreignField: '_id',
          as: 'companiesApplied',
        },
      },
     {
        $project: {
          _id: 0,
          studentId: '$_id',
          name: '$studentInfo.name',
          email: '$studentInfo.email',
          rollNumber: '$studentInfo.rollNumber',
          semester: '$studentInfo.semester',
          resume: '$studentInfo.resume', // <-- ADD THIS LINE
          applicationCount: 1,
          latestApplied: 1,
          companiesApplied: { $map: { input: '$companiesApplied', as: 'c', in: '$$c.name' } },
        },
      },
      { $sort: { name: 1 } },
    ]);

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/coordinator/students-with-offer
// Students who have uploaded an offer letter
// ─────────────────────────────────────────────────────────────
router.get('/students-with-offer', async (req, res) => {
  try {
    const myStudentIds = await User.distinct('_id', { role: 'student', isActive: true, coordinator: req.user._id });
    const results = await Application.find({ hasOfferLetter: true, student: { $in: myStudentIds } })
      .populate('student', 'name email rollNumber semester')
      .populate('company', 'name industry')
      .populate('internship', 'title')
      .select('student company internship offerLetter status appliedAt')
      .sort({ 'offerLetter.uploadedAt': -1 });

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/coordinator/company-wise-students
// Aggregation: For each company, list all students who applied
// ─────────────────────────────────────────────────────────────
router.get('/company-wise-students', async (req, res) => {
  try {
    const results = await Application.aggregate([
      {
        $group: {
          _id: '$company',
          totalApplications: { $sum: 1 },
          studentsWithOffer: { $sum: { $cond: ['$hasOfferLetter', 1, 0] } },
          studentIds: { $addToSet: '$student' },
        },
      },
      {
        $lookup: {
          from: 'companies',
          localField: '_id',
          foreignField: '_id',
          as: 'companyInfo',
        },
      },
      { $unwind: '$companyInfo' },
      { $match: { 'companyInfo.addedBy': new mongoose.Types.ObjectId(req.user._id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'studentIds',
          foreignField: '_id',
          as: 'students',
        },
      },
      {
        $project: {
          _id: 0,
          companyId: '$_id',
          companyName: '$companyInfo.name',
          industry: '$companyInfo.industry',
          totalApplications: 1,
          studentsWithOffer: 1,
          totalUniqueStudents: { $size: '$studentIds' },
          students: {
            $map: {
              input: '$students',
              as: 's',
              in: { id: '$$s._id', name: '$$s.name', email: '$$s.email', rollNumber: '$$s.rollNumber' },
            },
          },
        },
      },
      { $sort: { totalApplications: -1 } },
    ]);

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/coordinator/student-wise-applications
// For each student, list all companies they applied to
// ─────────────────────────────────────────────────────────────
router.get('/student-wise-applications', async (req, res) => {
  try {
    const results = await Application.aggregate([
      {
        $group: {
          _id: '$student',
          totalApplications: { $sum: 1 },
          hasAnyOffer: { $max: '$hasOfferLetter' },
          statuses: { $push: '$status' },
          applications: {
            $push: {
              applicationId: '$_id',
              company: '$company',
              internship: '$internship',
              status: '$status',
              hasOfferLetter: '$hasOfferLetter',
              appliedAt: '$appliedAt',
            },
          },
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'studentInfo',
        },
      },
      { $unwind: '$studentInfo' },
      { $match: { 'studentInfo.isActive': true, 'studentInfo.coordinator': new mongoose.Types.ObjectId(req.user._id) } },
      {
        $project: {
          _id: 0,
          studentId: '$_id',
          name: '$studentInfo.name',
          email: '$studentInfo.email',
          rollNumber: '$studentInfo.rollNumber',
          semester: '$studentInfo.semester',
          totalApplications: 1,
          hasAnyOffer: 1,
          applications: 1,
        },
      },
      { $sort: { name: 1 } },
    ]);

    // Populate company and internship names
    await User.populate(results, { path: 'applications.company', select: 'name industry', model: 'Company' });
    await User.populate(results, { path: 'applications.internship', select: 'title', model: 'Internship' });

    res.json({ success: true, count: results.length, data: results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/coordinator/all-applications
// Full application list with filters
// Query params: company, status, hasOfferLetter, search
// ─────────────────────────────────────────────────────────────
router.get('/all-applications', async (req, res) => {
  try {
    
    const myStudentIds = await User.distinct('_id', { role: 'student', coordinator: req.user._id });
    const filter = { student: { $in: myStudentIds } };
    
    if (req.query.company) filter.company = req.query.company;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.hasOfferLetter !== undefined) filter.hasOfferLetter = req.query.hasOfferLetter === 'true';

    const applications = await Application.find(filter)
      .populate('student', 'name email rollNumber semester phone resume')
      .populate('company', 'name industry')
      .populate('internship', 'title stipend duration')
      .sort({ appliedAt: -1 });

    res.json({ success: true, count: applications.length, data: applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/coordinator/all-students
router.get('/all-students', async (req, res) => {
  try {
const students = await User.find({ role: 'student', isActive: true, coordinator: req.user._id })      .select('name email rollNumber semester phone createdAt')
      .sort({ name: 1 });
    res.json({ success: true, count: students.length, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
