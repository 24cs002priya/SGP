const mongoose = require('mongoose');

const CompanySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Company name is required'],
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    trim: true,
  },
  industry: {
    type: String,
    trim: true,
  },
  website: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  logo: {
    type: String,
    default: null,
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

module.exports = mongoose.model('Company', CompanySchema);
