const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  internship: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Internship',
    required: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  status: {
    type: String,
    enum: ['applied', 'shortlisted', 'interview', 'selected', 'rejected', 'withdrawn'],
    default: 'applied',
  },
  coverLetter: {
    type: String,
    trim: true,
  },
  // Offer Letter Upload
  offerLetter: {
    filename: { type: String, default: null },
    path:     { type: String, default: null },
    mimetype: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
  },
  hasOfferLetter: {
    type: Boolean,
    default: false, // Denormalized flag for fast coordinator queries
  },
  coordinatorNotes: {
    type: String,
    trim: true,
  },
  appliedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

// Compound index: one application per student per internship
ApplicationSchema.index({ student: 1, internship: 1 }, { unique: true });

// Index for coordinator queries
ApplicationSchema.index({ company: 1, hasOfferLetter: 1 });
ApplicationSchema.index({ student: 1 });

// Auto-set hasOfferLetter flag before saving
// NEW FIXED CODE
ApplicationSchema.pre('save', function () {
  this.hasOfferLetter = !!(this.offerLetter && this.offerLetter.path);
});

module.exports = mongoose.model('Application', ApplicationSchema);
