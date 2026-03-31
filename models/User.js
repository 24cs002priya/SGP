const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false, // Never return password in queries by default
  },
  role: {
    type: String,
    enum: ['student', 'coordinator'],
    default: 'student',
  },
  // Student-specific fields
  rollNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows null for coordinators
  },
  department: {
    type: String,
    default: 'Computer Science',
  },
  semester: {
    type: Number,
    min: 1,
    max: 8,
  },
  // Add this inside your UserSchema definition, right after the role field:
  coordinator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() { return this.role === 'student'; } // Only required for students
  },
  phone: {
    type: String,
    trim: true,
  },
  avatar: {
    type: String,
    default: null,
  },

  resume: {
    filename: { type: String, default: null },
    path: { type: String, default: null },
    uploadedAt: { type: Date, default: null },
  },
  
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

// Hash password before saving
UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});
// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual for full profile (hide sensitive fields)
UserSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  },
});

module.exports = mongoose.model('User', UserSchema);
