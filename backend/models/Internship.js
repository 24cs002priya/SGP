const mongoose = require('mongoose');

const InternshipSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Internship title is required'],
    trim: true,
  },
  company: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Company',
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  stipend: {
    type: String, // e.g., "₹10,000/month" or "Unpaid"
    default: 'Unpaid',
  },
  duration: {
    type: String, // e.g., "2 months", "6 weeks"
    trim: true,
  },
  type: {
    type: String,
    enum: ['remote', 'on-site', 'hybrid'],
    default: 'on-site',
  },
  skills: [{
    type: String,
    trim: true,
  }],
  openings: {
    type: Number,
    default: 1,
    min: 1,
  },
  deadline: {
    type: Date,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Internship', InternshipSchema);
