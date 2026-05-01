const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Company = require('./models/Company');
const Internship = require('./models/Internship');
const Application = require('./models/Application');

// Load environment variables
dotenv.config();

const seedDatabase = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/internship_portal';
    await mongoose.connect(mongoUri);
    console.log('📦 Connected to MongoDB for seeding...');

    // 1. Clear existing data
    await User.deleteMany();
    await Company.deleteMany();
    await Internship.deleteMany();
    await Application.deleteMany();
    console.log('🗑️  Cleared existing database data.');

    // ==========================================
    // 2. CREATE COORDINATORS (3 Departments)
    // ==========================================
    const coordinators = await User.create([
      {
        name: 'Alice Smith',
        email: 'alice@edgecore.com',
        password: 'password123', // Note: Ensure your User model hashes this in a pre-save hook
        role: 'coordinator',
        phone: '9876543210'
      },
      {
        name: 'Bob Jones',
        email: 'bob@edgecore.com',
        password: 'password123',
        role: 'coordinator',
        phone: '9123456780'
      },
      {
        name: 'Sarah Miller',
        email: 'sarah@edgecore.com',
        password: 'password123',
        role: 'coordinator',
        phone: '9988776655'
      }
    ]);

    const [c1, c2, c3] = coordinators;
    console.log('👨‍🏫 3 Coordinators created (Alice, Bob, Sarah).');

    // ==========================================
    // 3. CREATE COMPANIES (10 Diverse Industries)
    // ==========================================
    const companies = await Company.create([
      { name: 'TechFlow Solutions', industry: 'Software Development', location: 'Bangalore', addedBy: c1._id },
      { name: 'CloudSync Inc', industry: 'Cloud Infrastructure', location: 'Remote', addedBy: c1._id },
      { name: 'DataNova Analytics', industry: 'Data Science', location: 'Pune', addedBy: c2._id },
      { name: 'FinEdge Banking', industry: 'FinTech', location: 'Mumbai', addedBy: c3._id },
      { name: 'GreenGrid Energy', industry: 'Renewable Energy', location: 'Hyderabad', addedBy: c1._id },
      { name: 'MediLife Systems', industry: 'Healthcare Tech', location: 'Chennai', addedBy: c2._id },
      { name: 'AutoDrive AI', industry: 'Automotive', location: 'Remote', addedBy: c3._id },
      { name: 'CyberGuard', industry: 'Cybersecurity', location: 'Delhi', addedBy: c1._id },
      { name: 'DesignPalace', industry: 'UI/UX Design', location: 'Ahmedabad', addedBy: c2._id },
      { name: 'LogiLink', industry: 'Logistics', location: 'Kolkata', addedBy: c3._id }
    ]);
    console.log('🏢 10 Companies created across different industries.');

    // ==========================================
    // 4. CREATE INTERNSHIPS (12 Roles)
    // ==========================================
    const internships = await Internship.create([
      { title: 'Frontend React Intern', company: companies[0]._id, stipend: '₹15,000/month', duration: '3 months', type: 'remote', skills: ['React', 'CSS', 'JavaScript'], addedBy: c1._id },
      { title: 'Backend Node.js Intern', company: companies[0]._id, stipend: '₹20,000/month', duration: '6 months', type: 'hybrid', skills: ['Node.js', 'Express', 'MongoDB'], addedBy: c1._id },
      { title: 'Cloud AWS Intern', company: companies[1]._id, stipend: 'Unpaid', duration: '2 months', type: 'remote', skills: ['AWS', 'Docker', 'Linux'], addedBy: c1._id },
      { title: 'Data Analyst Intern', company: companies[2]._id, stipend: '₹25,000/month', duration: '6 months', type: 'on-site', skills: ['Python', 'SQL', 'Tableau'], addedBy: c2._id },
      { title: 'Financial Research Intern', company: companies[3]._id, stipend: '₹18,000/month', duration: '4 months', type: 'on-site', skills: ['Excel', 'Finance', 'Python'], addedBy: c3._id },
      { title: 'IoT Systems Intern', company: companies[4]._id, stipend: '₹12,000/month', duration: '3 months', type: 'hybrid', skills: ['C++', 'Arduino', 'Python'], addedBy: c1._id },
      { title: 'Mobile App Developer', company: companies[5]._id, stipend: '₹22,000/month', duration: '6 months', type: 'remote', skills: ['Flutter', 'Firebase'], addedBy: c2._id },
      { title: 'Machine Learning Intern', company: companies[6]._id, stipend: '₹30,000/month', duration: '6 months', type: 'remote', skills: ['PyTorch', 'Computer Vision'], addedBy: c3._id },
      { title: 'Cybersecurity Analyst', company: companies[7]._id, stipend: '₹15,000/month', duration: '3 months', type: 'on-site', skills: ['Networking', 'Linux', 'Security+'], addedBy: c1._id },
      { title: 'Junior UI Designer', company: companies[8]._id, stipend: '₹10,000/month', duration: '2 months', type: 'remote', skills: ['Figma', 'Adobe XD'], addedBy: c2._id },
      { title: 'Supply Chain Intern', company: companies[9]._id, stipend: '₹14,000/month', duration: '4 months', type: 'on-site', skills: ['Logistics', 'SAP'], addedBy: c3._id },
      { title: 'Fullstack MERN Intern', company: companies[0]._id, stipend: '₹25,000/month', duration: '6 months', type: 'hybrid', skills: ['React', 'Node.js', 'Redux'], addedBy: c1._id }
    ]);
    console.log('💼 12 Internships created with varied stipends/types.');

    // ==========================================
    // 5. CREATE STUDENTS (7 Students)
    // ==========================================
    const students = await User.create([
      { name: 'John Doe', email: 'john@student.com', password: 'password123', role: 'student', rollNumber: 'CS26001', semester: 6, coordinator: c1._id, resume: { filename: 'John_Resume.pdf', path: '#', uploadedAt: new Date() } },
      { name: 'Emma Watson', email: 'emma@student.com', password: 'password123', role: 'student', rollNumber: 'CS26002', semester: 6, coordinator: c1._id },
      { name: 'Lazy Larry', email: 'larry@student.com', password: 'password123', role: 'student', rollNumber: 'CS26003', semester: 4, coordinator: c1._id },
      { name: 'Sam Smith', email: 'sam@student.com', password: 'password123', role: 'student', rollNumber: 'IT26001', semester: 8, coordinator: c2._id, resume: { filename: 'Sam_CV.pdf', path: '#', uploadedAt: new Date() } },
      { name: 'Diana Prince', email: 'diana@student.com', password: 'password123', role: 'student', rollNumber: 'EE26005', semester: 6, coordinator: c3._id, resume: { filename: 'Diana_CV.pdf', path: '#', uploadedAt: new Date() } },
      { name: 'Bruce Wayne', email: 'bruce@student.com', password: 'password123', role: 'student', rollNumber: 'CS26009', semester: 2, coordinator: c1._id },
      { name: 'Peter Parker', email: 'peter@student.com', password: 'password123', role: 'student', rollNumber: 'IT26010', semester: 6, coordinator: c2._id, resume: { filename: 'Web_Portfolio.pdf', path: '#', uploadedAt: new Date() } }
    ]);
    console.log('🎓 7 Students created (Some with resumes, some without).');

    // ==========================================
    // 6. CREATE APPLICATIONS (12 Applications)
    // ==========================================
    await Application.create([
      // John - Selected
      { student: students[0]._id, internship: internships[0]._id, company: companies[0]._id, status: 'selected', hasOfferLetter: true, offerLetter: { filename: 'TechFlow_Offer.pdf', path: '#', uploadedAt: new Date() } },
      { student: students[0]._id, internship: internships[1]._id, company: companies[0]._id, status: 'applied' },
      
      // Emma - Shortlisted
      { student: students[1]._id, internship: internships[2]._id, company: companies[1]._id, status: 'shortlisted' },
      
      // Sam - Interview
      { student: students[3]._id, internship: internships[3]._id, company: companies[2]._id, status: 'interview' },
      
      // Diana - Rejected & Applied
      { student: students[4]._id, internship: internships[4]._id, company: companies[3]._id, status: 'rejected' },
      { student: students[4]._id, internship: internships[7]._id, company: companies[6]._id, status: 'applied' },
      
      // Peter - Multiple Apps
      { student: students[6]._id, internship: internships[0]._id, company: companies[0]._id, status: 'interview' },
      { student: students[6]._id, internship: internships[6]._id, company: companies[5]._id, status: 'shortlisted' },
      { student: students[6]._id, internship: internships[11]._id, company: companies[0]._id, status: 'applied' },
      
      // Bruce - Fresh Applied
      { student: students[5]._id, internship: internships[8]._id, company: companies[7]._id, status: 'applied' }
    ]);
    console.log('📝 10 Applications created with diverse statuses.');

    console.log('\n✅ SEEDING COMPLETE! You have a full dataset to test with.');
    console.log('--------------------------------------------------');
    console.log('Quick Logins (Password: password123)');
    console.log('- Alice (Coord): alice@edgecore.com  -> High activity');
    console.log('- Sarah (Coord): sarah@edgecore.com  -> Niche activity');
    console.log('- John (Student): john@student.com   -> Placed student');
    console.log('- Diana (Student): diana@student.com -> Rejected student');
    console.log('- Larry (Student): larry@student.com -> Clean slate');
    console.log('--------------------------------------------------');

    process.exit();
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedDatabase();