const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const auth = require('../middleware/auth');
const { Quiz, QuizResult, Document } = require('../models/Quiz');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = 'uploads/documents';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are allowed'));
    }
  }
});

// @route   GET /api/quiz/documents
// @desc    Get user's uploaded documents
// @access  Private
router.get('/documents', auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user._id })
      .sort({ uploaded_at: -1 });

    res.json({
      success: true,
      documents: documents.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        subject: doc.subject,
        size: doc.size,
        type: doc.mimeType,
        uploadedAt: doc.uploaded_at,
        processed: doc.processed
      }))
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/quiz/upload
// @desc    Upload documents for quiz generation
// @access  Private
router.post('/upload', auth, upload.array('files', 10), async (req, res) => {
  try {
    const { subject } = req.body;
    
    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const savedDocuments = [];

    for (const file of req.files) {
      const document = new Document({
        id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: req.user._id,
        filename: file.filename,
        originalName: file.originalname,
        subject: subject,
        mimeType: file.mimetype,
        size: file.size,
        uploadPath: file.path,
        processed: false
      });

      await document.save();
      savedDocuments.push(document);
    }

    res.json({
      success: true,
      message: `${savedDocuments.length} documents uploaded successfully`,
      documents: savedDocuments.map(doc => ({
        id: doc.id,
        filename: doc.filename,
        subject: doc.subject,
        uploadedAt: doc.uploaded_at
      }))
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// @route   GET /api/quiz/subjects
// @desc    Get user's available subjects
// @access  Private
router.get('/subjects', auth, async (req, res) => {
  try {
    const subjects = await Document.distinct('subject', { userId: req.user._id });
    
    res.json({
      success: true,
      subjects: subjects
    });
  } catch (error) {
    console.error('Get subjects error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/quiz/generate
// @desc    Generate quiz from uploaded documents
// @access  Private
router.post('/generate', auth, async (req, res) => {
  try {
    // This will be handled by AI backend, but we save the request
    const { subject, topic, quizType, numQuestions, difficulty } = req.body;

    // Validate request
    if (!subject) {
      return res.status(400).json({ message: 'Subject is required' });
    }

    // Check if user has documents for this subject
    const userDocuments = await Document.find({ 
      userId: req.user._id, 
      subject: subject 
    });

    if (userDocuments.length === 0) {
      return res.status(400).json({ 
        message: `No documents found for subject: ${subject}` 
      });
    }

    // For now, return success - actual quiz generation happens in AI backend
    res.json({
      success: true,
      message: 'Quiz generation request received',
      documents_found: userDocuments.length,
      redirect_to_ai: true
    });

  } catch (error) {
    console.error('Generate quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/quiz/save
// @desc    Save generated quiz
// @access  Private
router.post('/save', auth, async (req, res) => {
  try {
    const { quizData } = req.body;

    const quiz = new Quiz({
      ...quizData,
      userId: req.user._id
    });

    await quiz.save();

    res.json({
      success: true,
      message: 'Quiz saved successfully',
      quizId: quiz.id
    });

  } catch (error) {
    console.error('Save quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/quiz/submit
// @desc    Submit quiz answers
// @access  Private
router.post('/submit', auth, async (req, res) => {
  try {
    const { quizId, answers } = req.body;

    // Find the quiz
    const quiz = await Quiz.findOne({ id: quizId, userId: req.user._id });
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // This will be processed by AI backend for evaluation
    // For now, just save the submission
    
    res.json({
      success: true,
      message: 'Quiz submitted successfully',
      redirect_to_ai: true
    });

  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/quiz/results/:quizId
// @desc    Get quiz results
// @access  Private
router.get('/results/:quizId', auth, async (req, res) => {
  try {
    const { quizId } = req.params;

    const result = await QuizResult.findOne({ 
      quizId: quizId, 
      userId: req.user._id 
    });

    if (!result) {
      return res.status(404).json({ message: 'Quiz result not found' });
    }

    res.json({
      success: true,
      result: result
    });

  } catch (error) {
    console.error('Get results error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/quiz/document/:docId
// @desc    Delete uploaded document
// @access  Private
router.delete('/document/:docId', auth, async (req, res) => {
  try {
    const { docId } = req.params;

    const document = await Document.findOne({ 
      id: docId, 
      userId: req.user._id 
    });

    if (!document) {
      return res.status(404).json({ message: 'Document not found' });
    }

    // Delete file from filesystem
    if (document.uploadPath && fs.existsSync(document.uploadPath)) {
      fs.unlinkSync(document.uploadPath);
    }

    // Delete from database
    await Document.deleteOne({ id: docId, userId: req.user._id });

    res.json({
      success: true,
      message: 'Document deleted successfully'
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;