const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  question: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['mcq', 'subjective'],
    required: true
  },
  options: [{
    type: String
  }], // For MCQ questions
  correct_answer: {
    type: String
  }, // For MCQ questions
  sample_answer_points: [{
    type: String
  }], // For subjective questions
  max_marks: {
    type: Number,
    default: 10
  },
  time_limit: {
    type: String,
    default: '10 minutes'
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  explanation: {
    type: String
  },
  source_text: {
    type: String
  }
});

const quizSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  topic: {
    type: String
  },
  quiz_type: {
    type: String,
    enum: ['mcq', 'subjective'],
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  questions: [questionSchema],
  total_questions: {
    type: Number,
    required: true
  },
  source_documents: [{
    type: String
  }],
  created_at: {
    type: Date,
    default: Date.now
  }
});

const quizResultSchema = new mongoose.Schema({
  quizId: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  answers: {
    type: Map,
    of: String
  },
  score: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  total_questions: {
    type: Number,
    required: true
  },
  results: [{
    question_id: String,
    question: String,
    user_answer: String,
    correct_answer: String,
    is_correct: Boolean,
    score: Number,
    max_score: Number,
    feedback: String
  }],
  feedback: [String],
  completed_at: {
    type: Date,
    default: Date.now
  }
});

const documentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  },
  extractedText: {
    type: String
  },
  uploadPath: {
    type: String
  },
  processed: {
    type: Boolean,
    default: false
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
});

const Quiz = mongoose.model('Quiz', quizSchema);
const QuizResult = mongoose.model('QuizResult', quizResultSchema);
const Document = mongoose.model('Document', documentSchema);

module.exports = { Quiz, QuizResult, Document };