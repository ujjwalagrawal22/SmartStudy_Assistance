const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/timetable', require('./routes/timetable'));
app.use('/api/quiz', require('./routes/quiz')); // New quiz routes

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Smart Study App API is running!',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/auth',
      '/api/timetable', 
      '/api/quiz'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});