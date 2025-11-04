import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

// ================================
// MAIN QUIZ GENERATOR COMPONENT
// ================================
const QuizGenerator = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadedDocuments, setUploadedDocuments] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  
  // Quiz generation form
  const [quizForm, setQuizForm] = useState({
    subject: '',
    topic: '',
    quizType: 'mcq', // 'mcq' or 'subjective'
    numQuestions: 5,
    difficulty: 'medium'
  });
  
  // Generated quiz and results
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizResults, setQuizResults] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    loadUploadedDocuments();
  }, []);

  const loadUploadedDocuments = () => {
    try {
      const saved = localStorage.getItem('uploadedDocuments');
      if (saved) {
        const docs = JSON.parse(saved);
        setUploadedDocuments(docs);
        
        // Extract unique subjects
        const subjects = [...new Set(docs.map(doc => doc.subject))];
        setAvailableSubjects(subjects);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  const handleFileUpload = async (files, subject) => {
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('files', file);
      });
      formData.append('subject', subject);

      console.log(`📤 Uploading ${files.length} files for subject: ${subject}`);

      const response = await axios.post('http://localhost:8000/upload-notes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000 // 60 second timeout
      });

      if (response.data.success) {
        const newDocs = Array.from(files).map((file, index) => ({
          id: response.data.document_ids[index] || `doc_${Date.now()}_${index}`,
          filename: file.name,
          subject: subject,
          uploadedAt: new Date().toISOString(),
          size: file.size,
          type: file.type
        }));

        const updatedDocs = [...uploadedDocuments, ...newDocs];
        setUploadedDocuments(updatedDocs);
        localStorage.setItem('uploadedDocuments', JSON.stringify(updatedDocs));

        // Update available subjects
        const subjects = [...new Set(updatedDocs.map(doc => doc.subject))];
        setAvailableSubjects(subjects);

        setStep(2); // Move to quiz generation step
      }
    } catch (err) {
      console.error('❌ File upload error:', err);
      setError(`Failed to upload files: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateQuiz = async () => {
    if (!quizForm.subject) {
      setError('Please select a subject');
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🧠 Generating quiz with:', quizForm);

      const response = await axios.post('http://localhost:8000/generate-quiz', quizForm, {
        timeout: 60000
      });

      if (response.data.success) {
        setGeneratedQuiz(response.data.quiz);
        setQuizAnswers({});
        setCurrentQuestionIndex(0);
        setStep(3); // Move to quiz taking step
        console.log('✅ Quiz generated successfully');
      }
    } catch (err) {
      console.error('❌ Quiz generation error:', err);
      setError(`Failed to generate quiz: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId, answer) => {
    setQuizAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const submitQuiz = async () => {
    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('quiz_id', generatedQuiz.id);
      formData.append('answers', JSON.stringify(quizAnswers));

      console.log('📝 Submitting quiz answers:', quizAnswers);

      const response = await axios.post('http://localhost:8000/evaluate-quiz', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        }
      });

      if (response.data.success) {
        setQuizResults(response.data.evaluation);
        setStep(4); // Move to results step
        console.log('✅ Quiz evaluated successfully');
      }
    } catch (err) {
      console.error('❌ Quiz evaluation error:', err);
      setError(`Failed to evaluate quiz: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const resetQuiz = () => {
    setStep(1);
    setGeneratedQuiz(null);
    setQuizAnswers({});
    setQuizResults(null);
    setCurrentQuestionIndex(0);
    setError('');
  };

  const getUploadedFilesForSubject = (subject) => {
    return uploadedDocuments.filter(doc => doc.subject === subject);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            🧠 AI Quiz Generator
          </h1>
          <p className="text-gray-600">
            Upload your notes and generate custom quizzes using AI and RAG technology
          </p>
          
          {/* Progress indicator */}
          <div className="mt-6 flex items-center">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-purple-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-16 h-1 mx-2 ${step > stepNum ? 'bg-purple-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>Upload Notes</span>
            <span>Configure Quiz</span>
            <span>Take Quiz</span>
            <span>Results</span>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6">
            <div className="flex items-start">
              <span className="text-red-500 mr-2">⚠️</span>
              <div>
                <p className="font-medium">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Upload Documents */}
        {step === 1 && (
          <DocumentUpload
            onFileUpload={handleFileUpload}
            uploadedDocuments={uploadedDocuments}
            loading={loading}
            availableSubjects={availableSubjects}
            onNext={() => setStep(2)}
          />
        )}

        {/* Step 2: Configure Quiz */}
        {step === 2 && (
          <QuizConfiguration
            quizForm={quizForm}
            setQuizForm={setQuizForm}
            availableSubjects={availableSubjects}
            getUploadedFilesForSubject={getUploadedFilesForSubject}
            onGenerate={generateQuiz}
            onBack={() => setStep(1)}
            loading={loading}
          />
        )}

        {/* Step 3: Take Quiz */}
        {step === 3 && generatedQuiz && (
          <QuizInterface
            quiz={generatedQuiz}
            answers={quizAnswers}
            onAnswerChange={handleAnswerChange}
            currentQuestionIndex={currentQuestionIndex}
            setCurrentQuestionIndex={setCurrentQuestionIndex}
            onSubmit={submitQuiz}
            onBack={() => setStep(2)}
            loading={loading}
          />
        )}

        {/* Step 4: Quiz Results */}
        {step === 4 && quizResults && (
          <QuizResults
            results={quizResults}
            quiz={generatedQuiz}
            onReset={resetQuiz}
            onNewQuiz={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
};

// ================================
// DOCUMENT UPLOAD COMPONENT
// ================================
const DocumentUpload = ({ onFileUpload, uploadedDocuments, loading, availableSubjects, onNext }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [dragOver, setDragOver] = useState(false);

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragOver(false);
    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
  };

  const handleUpload = () => {
    const subject = newSubject.trim() || selectedSubject;
    if (!subject) {
      alert('Please select or enter a subject name');
      return;
    }
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }
    onFileUpload(selectedFiles, subject);
  };

  const removeFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Step 1: Upload Your Study Notes
      </h2>
      
      {/* Subject Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Subject
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <select
              value={selectedSubject}
              onChange={(e) => {
                setSelectedSubject(e.target.value);
                setNewSubject('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select existing subject</option>
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              type="text"
              value={newSubject}
              onChange={(e) => {
                setNewSubject(e.target.value);
                setSelectedSubject('');
              }}
              placeholder="Or enter new subject name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </div>

      {/* File Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver ? 'border-purple-400 bg-purple-50' : 'border-gray-300'
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
      >
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-medium text-gray-900">
              Drop your files here or click to browse
            </p>
            <p className="text-sm text-gray-600 mt-1">
              Supports: PDF, DOC, DOCX, TXT, JPG, PNG (handwritten notes)
            </p>
          </div>
          
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.bmp"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          
          <label
            htmlFor="file-upload"
            className="inline-flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors cursor-pointer"
          >
            📁 Choose Files
          </label>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-3">Selected Files ({selectedFiles.length})</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <div className="flex items-center">
                  <span className="mr-2">
                    {file.type.includes('image') ? '🖼️' : 
                     file.type.includes('pdf') ? '📄' : 
                     file.type.includes('doc') ? '📝' : '📄'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file.name}</p>
                    <p className="text-xs text-gray-600">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-red-600 hover:text-red-800 p-1"
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded Documents */}
      {uploadedDocuments.length > 0 && (
        <div className="mt-6">
          <h3 className="font-medium text-gray-900 mb-3">
            Previously Uploaded Documents ({uploadedDocuments.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-40 overflow-y-auto">
            {uploadedDocuments.map((doc, index) => (
              <div key={index} className="p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.filename}</p>
                    <p className="text-xs text-green-600">{doc.subject}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-green-600 ml-2">✅</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex justify-between">
        <div className="text-sm text-gray-600">
          {uploadedDocuments.length > 0 && (
            <span>✅ {uploadedDocuments.length} documents ready for quiz generation</span>
          )}
        </div>
        
        <div className="flex space-x-3">
          {selectedFiles.length > 0 && (
            <button
              onClick={handleUpload}
              disabled={loading || (!selectedSubject && !newSubject.trim())}
              className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </div>
              ) : (
                'Upload Files'
              )}
            </button>
          )}
          
          {uploadedDocuments.length > 0 && (
            <button
              onClick={onNext}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
            >
              Generate Quiz →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ================================
// QUIZ CONFIGURATION COMPONENT
// ================================
const QuizConfiguration = ({ 
  quizForm, 
  setQuizForm, 
  availableSubjects, 
  getUploadedFilesForSubject,
  onGenerate, 
  onBack, 
  loading 
}) => {
  const updateForm = (field, value) => {
    setQuizForm(prev => ({ ...prev, [field]: value }));
  };

  const selectedSubjectFiles = quizForm.subject ? getUploadedFilesForSubject(quizForm.subject) : [];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">
        Step 2: Configure Your Quiz
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Subject Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Subject
          </label>
          <select
            value={quizForm.subject}
            onChange={(e) => updateForm('subject', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Select a subject</option>
            {availableSubjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>
          
          {selectedSubjectFiles.length > 0 && (
            <p className="text-sm text-green-600 mt-1">
              ✅ {selectedSubjectFiles.length} documents available
            </p>
          )}
        </div>

        {/* Topic */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Topic (Optional)
          </label>
          <input
            type="text"
            value={quizForm.topic}
            onChange={(e) => updateForm('topic', e.target.value)}
            placeholder="e.g., Calculus, Photosynthesis"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-xs text-gray-600 mt-1">
            Leave empty to generate questions from entire subject
          </p>
        </div>

        {/* Quiz Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quiz Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                value="mcq"
                checked={quizForm.quizType === 'mcq'}
                onChange={(e) => updateForm('quizType', e.target.value)}
                className="mr-2"
              />
              <span>Multiple Choice Questions (MCQ)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                value="subjective"
                checked={quizForm.quizType === 'subjective'}
                onChange={(e) => updateForm('quizType', e.target.value)}
                className="mr-2"
              />
              <span>Subjective Questions</span>
            </label>
          </div>
        </div>

        {/* Number of Questions */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Number of Questions
          </label>
          <select
            value={quizForm.numQuestions}
            onChange={(e) => updateForm('numQuestions', parseInt(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {[3, 5, 10, 15, 20].map(num => (
              <option key={num} value={num}>{num} questions</option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulty Level
          </label>
          <div className="flex space-x-4">
            {['easy', 'medium', 'hard'].map(level => (
              <label key={level} className="flex items-center">
                <input
                  type="radio"
                  value={level}
                  checked={quizForm.difficulty === level}
                  onChange={(e) => updateForm('difficulty', e.target.value)}
                  className="mr-2"
                />
                <span className="capitalize">{level}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Source Documents Preview */}
      {selectedSubjectFiles.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="font-medium text-blue-900 mb-2">
            📚 Source Documents ({selectedSubjectFiles.length})
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {selectedSubjectFiles.map((doc, index) => (
              <div key={index} className="text-sm text-blue-800 bg-blue-100 px-2 py-1 rounded">
                {doc.filename}
              </div>
            ))}
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Quiz questions will be generated from these documents using RAG technology
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-6 flex justify-between">
        <button
          onClick={onBack}
          className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          ← Back
        </button>
        
        <button
          onClick={onGenerate}
          disabled={loading || !quizForm.subject || selectedSubjectFiles.length === 0}
          className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Generating Quiz...
            </div>
          ) : (
            '🧠 Generate Quiz'
          )}
        </button>
      </div>
    </div>
  );
};

// ================================
// QUIZ INTERFACE COMPONENT 
// ================================
const QuizInterface = ({ 
  quiz, 
  answers, 
  onAnswerChange, 
  currentQuestionIndex, 
  setCurrentQuestionIndex,
  onSubmit, 
  onBack, 
  loading 
}) => {
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;

  const nextQuestion = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const getQuestionStatus = (index) => {
    const questionId = quiz.questions[index].id;
    if (answers[questionId]) return 'answered';
    if (index === currentQuestionIndex) return 'current';
    return 'unanswered';
  };

  const handleSubjectiveAnswer = (value) => {
    onAnswerChange(currentQuestion.id, value);
  };

  const handleMCQAnswer = (option) => {
    onAnswerChange(currentQuestion.id, option);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Quiz Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {quiz.subject} Quiz
            </h2>
            <p className="text-gray-600">
              {quiz.quiz_type === 'mcq' ? 'Multiple Choice' : 'Subjective'} • {quiz.difficulty} level
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-purple-600">
              {currentQuestionIndex + 1}/{totalQuestions}
            </div>
            <div className="text-sm text-gray-600">
              {answeredCount} answered
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
          ></div>
        </div>

        {/* Question Navigation */}
        <div className="mt-4 flex flex-wrap gap-2">
          {quiz.questions.map((_, index) => (
            <button
              key={index}
              onClick={() => goToQuestion(index)}
              className={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                getQuestionStatus(index) === 'current' 
                  ? 'bg-purple-500 text-white' 
                  : getQuestionStatus(index) === 'answered'
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      {/* Question Content */}
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 flex-1">
              Question {currentQuestionIndex + 1}
            </h3>
            {quiz.quiz_type === 'subjective' && currentQuestion.max_marks && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                {currentQuestion.max_marks} marks
              </span>
            )}
          </div>
          
          <p className="text-gray-800 text-base leading-relaxed">
            {currentQuestion.question}
          </p>
          
          {quiz.quiz_type === 'subjective' && currentQuestion.time_limit && (
            <p className="text-sm text-gray-600 mt-2">
              ⏱️ Suggested time: {currentQuestion.time_limit}
            </p>
          )}
        </div>

        {/* Answer Section */}
        <div className="mb-6">
          {quiz.quiz_type === 'mcq' ? (
            // Multiple Choice Options
            <div className="space-y-3">
              {currentQuestion.options.map((option, index) => (
                <label
                  key={index}
                  className={`flex items-start p-4 border rounded-lg cursor-pointer transition-colors ${
                    answers[currentQuestion.id] === option
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value={option}
                    checked={answers[currentQuestion.id] === option}
                    onChange={() => handleMCQAnswer(option)}
                    className="mt-1 mr-3 text-purple-500"
                  />
                  <span className="text-gray-800">{option}</span>
                </label>
              ))}
            </div>
          ) : (
            // Subjective Answer
            <div>
              <textarea
                value={answers[currentQuestion.id] || ''}
                onChange={(e) => handleSubjectiveAnswer(e.target.value)}
                placeholder="Write your answer here..."
                rows={8}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
              />
              
              {currentQuestion.sample_answer_points && (
                <div className="mt-3 p-3 bg-blue-50 rounded border">
                  <p className="text-sm font-medium text-blue-900 mb-2">💡 Key points to cover:</p>
                  <ul className="text-sm text-blue-800 space-y-1">
                    {currentQuestion.sample_answer_points.slice(0, 3).map((point, index) => (
                      <li key={index}>• {point}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Source Information */}
        {currentQuestion.source_text && (
          <div className="mb-6 p-3 bg-gray-50 rounded border-l-4 border-purple-500">
            <p className="text-xs text-gray-600 mb-1">📚 Based on your notes:</p>
            <p className="text-sm text-gray-700 italic">
              "{currentQuestion.source_text}"
            </p>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div className="flex space-x-3">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              ← Configure
            </button>
            
            <button
              onClick={prevQuestion}
              disabled={currentQuestionIndex === 0}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              ← Previous
            </button>
          </div>

          <div className="flex space-x-3">
            {currentQuestionIndex < totalQuestions - 1 ? (
              <button
                onClick={nextQuestion}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                Next →
              </button>
            ) : (
              <button
                onClick={onSubmit}
                disabled={loading || answeredCount === 0}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </div>
                ) : (
                  '✅ Submit Quiz'
                )}
              </button>
            )}
          </div>
        </div>

        {/* Answer Summary */}
        <div className="mt-4 text-center text-sm text-gray-600">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded mr-2">
            {answeredCount} answered
          </span>
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
            {totalQuestions - answeredCount} remaining
          </span>
        </div>
      </div>
    </div>
  );
};

// ================================
// QUIZ RESULTS COMPONENT
// ================================
const QuizResults = ({ results, quiz, onReset, onNewQuiz }) => {
  const percentage = results.percentage || 0;
  const scoreColor = percentage >= 80 ? 'text-green-600' : percentage >= 60 ? 'text-yellow-600' : 'text-red-600';
  
  const getGradeEmoji = (percentage) => {
    if (percentage >= 90) return '🏆';
    if (percentage >= 80) return '🥇';
    if (percentage >= 70) return '🥈';
    if (percentage >= 60) return '🥉';
    return '📚';
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Results Header */}
      <div className="p-6 border-b border-gray-200 text-center">
        <div className="text-6xl mb-4">{getGradeEmoji(percentage)}</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Complete!</h2>
        <div className={`text-4xl font-bold ${scoreColor} mb-2`}>
          {percentage.toFixed(1)}%
        </div>
        <p className="text-gray-600">
          {results.score} out of {results.total_questions} questions correct
        </p>
      </div>

      {/* Overall Feedback */}
      {results.feedback && results.feedback.length > 0 && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900 mb-3">🤖 AI Feedback</h3>
          <div className="bg-blue-50 p-4 rounded-lg">
            {results.feedback.map((feedback, index) => (
              <p key={index} className="text-blue-800">{feedback}</p>
            ))}
          </div>
        </div>
      )}

      {/* Detailed Results */}
      <div className="p-6">
        <h3 className="font-semibold text-gray-900 mb-4">📊 Detailed Results</h3>
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {results.results.map((result, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-gray-900 flex-1">
                  Question {index + 1}
                </h4>
                {quiz.quiz_type === 'mcq' ? (
                  <span className={`px-2 py-1 rounded text-sm ${
                    result.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {result.is_correct ? '✅ Correct' : '❌ Incorrect'}
                  </span>
                ) : (
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                    {result.score}/{result.max_score} points
                  </span>
                )}
              </div>
              
              <p className="text-gray-700 mb-3">{result.question}</p>
              
              {quiz.quiz_type === 'mcq' ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="font-medium text-gray-600">Your answer:</span>
                      <p className={`mt-1 p-2 rounded ${
                        result.is_correct ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                      }`}>
                        {result.user_answer || 'No answer provided'}
                      </p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Correct answer:</span>
                      <p className="mt-1 p-2 rounded bg-green-50 text-green-800">
                        {result.correct_answer}
                      </p>
                    </div>
                  </div>
                  
                  {result.explanation && (
                    <div className="mt-3 p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">💡 Explanation:</span> {result.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <span className="font-medium text-gray-600">Your answer:</span>
                    <div className="mt-1 p-3 bg-gray-50 rounded border">
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {result.user_answer || 'No answer provided'}
                      </p>
                    </div>
                  </div>
                  
                  {result.feedback && (
                    <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                      <p className="text-sm text-blue-800">
                        <span className="font-medium">📝 Feedback:</span> {result.feedback}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="p-6 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={onNewQuiz}
            className="px-6 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
          >
            🧠 Generate New Quiz
          </button>
          
          <button
            onClick={() => window.print()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            🖨️ Print Results
          </button>
          
          <button
            onClick={onReset}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            🔄 Start Over
          </button>
        </div>

        {/* Performance Summary */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="bg-white p-3 rounded">
            <div className="text-lg font-bold text-purple-600">
              {results.total_questions}
            </div>
            <div className="text-sm text-gray-600">Total Questions</div>
          </div>
          
          <div className="bg-white p-3 rounded">
            <div className="text-lg font-bold text-green-600">
              {quiz.quiz_type === 'mcq' 
                ? results.results.filter(r => r.is_correct).length
                : results.results.reduce((sum, r) => sum + (r.score || 0), 0)
              }
            </div>
            <div className="text-sm text-gray-600">
              {quiz.quiz_type === 'mcq' ? 'Correct Answers' : 'Total Points'}
            </div>
          </div>
          
          <div className="bg-white p-3 rounded">
            <div className={`text-lg font-bold ${scoreColor}`}>
              {quiz.difficulty.toUpperCase()}
            </div>
            <div className="text-sm text-gray-600">Difficulty Level</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================================
// EXPORT MAIN COMPONENT
// ================================
export default QuizGenerator;