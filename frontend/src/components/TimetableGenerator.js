import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const TimetableGenerator = () => {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [debugInfo, setDebugInfo] = useState('');
  
  // Enhanced form state with individual exam dates
  const [formData, setFormData] = useState({
    subjects: [{ 
      name: '', 
      topics: [''],
      examDate: '', // Individual exam date for each subject
      priority: 1,
      estimatedHours: 20
    }],
    studyHoursPerDay: 4,
    preferredTimeSlots: ['09:00-11:00', '14:00-16:00'],
    manualWeightage: true
  });
  
  // Topic weightage state
  const [topicWeightage, setTopicWeightage] = useState({});
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [generatedTimetable, setGeneratedTimetable] = useState(null);

  // Test AI Backend connection on component mount
  useEffect(() => {
    testBackendConnection();
  }, []);

  const testBackendConnection = async () => {
    try {
      const response = await axios.get('http://localhost:8000/health');
      console.log('✅ AI Backend connected:', response.data);
      setDebugInfo('✅ AI Backend connected - LLM-powered timetable generation available');
    } catch (error) {
      console.error('❌ AI Backend connection failed:', error);
      setDebugInfo('❌ AI Backend not reachable. Please start: python main.py');
      setError('AI Backend is not running. Please start the AI backend service for LLM-powered features.');
    }
  };

  // Enhanced subject management with individual exam dates
  const updateSubject = (index, field, value) => {
    const newSubjects = [...formData.subjects];
    newSubjects[index][field] = value;
    
    // Auto-calculate priority based on exam date
    if (field === 'examDate' && value) {
      const examDate = new Date(value);
      const today = new Date();
      const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
      
      // Priority: 1 (highest) for exams within 7 days, decreasing as days increase
      const priority = daysUntilExam <= 7 ? 1 : 
                     daysUntilExam <= 14 ? 2 :
                     daysUntilExam <= 30 ? 3 : 4;
      
      newSubjects[index].priority = priority;
    }
    
    setFormData({ ...formData, subjects: newSubjects });
  };

  const updateTopic = (subjectIndex, topicIndex, value) => {
    const newSubjects = [...formData.subjects];
    newSubjects[subjectIndex].topics[topicIndex] = value;
    setFormData({ ...formData, subjects: newSubjects });
  };

  const addSubject = () => {
    setFormData({
      ...formData,
      subjects: [...formData.subjects, { 
        name: '', 
        topics: [''],
        examDate: '',
        priority: 1,
        estimatedHours: 20
      }]
    });
  };

  const addTopic = (subjectIndex) => {
    const newSubjects = [...formData.subjects];
    newSubjects[subjectIndex].topics.push('');
    setFormData({ ...formData, subjects: newSubjects });
  };

  const removeSubject = (index) => {
    if (formData.subjects.length > 1) {
      const newSubjects = formData.subjects.filter((_, i) => i !== index);
      setFormData({ ...formData, subjects: newSubjects });
    }
  };

  const removeTopic = (subjectIndex, topicIndex) => {
    const newSubjects = [...formData.subjects];
    if (newSubjects[subjectIndex].topics.length > 1) {
      newSubjects[subjectIndex].topics = newSubjects[subjectIndex].topics.filter((_, i) => i !== topicIndex);
      setFormData({ ...formData, subjects: newSubjects });
    }
  };

  // Enhanced file upload for automatic weightage
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    setUploadedFiles(files);
    setLoading(true);
    setError('');

    try {
      const formDataUpload = new FormData();
      files.forEach(file => {
        formDataUpload.append('files', file);
      });

      console.log('📄 Uploading files for LLM analysis...');
      const response = await axios.post('http://localhost:8000/analyze-papers', formDataUpload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000
      });

      console.log('📊 LLM Analysis response:', response.data);

      if (response.data.success) {
        setTopicWeightage(response.data.topic_weightage);
        setFormData(prev => ({ ...prev, manualWeightage: false }));
        setDebugInfo('✅ Question papers analyzed by LLM successfully');
      }
    } catch (err) {
      console.error('❌ File upload error:', err);
      setError(`Failed to analyze question papers with LLM: ${err.response?.data?.detail || err.message}`);
      setDebugInfo('❌ LLM analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle manual weightage changes
  const updateManualWeightage = (subject, topic, weight) => {
    setTopicWeightage(prev => ({
      ...prev,
      [`${subject}_${topic}`]: parseFloat(weight) || 0
    }));
  };

  // Enhanced timetable generation with full LLM integration
  const generateTimetable = async () => {
    console.log('🚀 Starting LLM-powered timetable generation...');
    setLoading(true);
    setError('');
    setDebugInfo('🔄 Generating AI-powered timetable...');

    try {
      // Validate form data
      const validSubjects = formData.subjects.filter(subject => 
        subject.name.trim() && 
        subject.topics.some(topic => topic.trim()) && 
        subject.examDate
      );

      if (validSubjects.length === 0) {
        throw new Error('Please add at least one subject with topics and exam date');
      }

      // Check if all subjects have exam dates
      const missingDates = validSubjects.filter(subject => !subject.examDate);
      if (missingDates.length > 0) {
        throw new Error('Please set exam dates for all subjects');
      }

      // Sort subjects by priority (exam date)
      const sortedSubjects = validSubjects.sort((a, b) => {
        const dateA = new Date(a.examDate);
        const dateB = new Date(b.examDate);
        return dateA - dateB; // Earlier exams first
      });

      // Prepare enhanced subjects data with weightage for LLM
      const subjectsWithWeightage = sortedSubjects.map(subject => {
        const validTopics = subject.topics.filter(topic => topic.trim() !== '');
        
        let weightageObj = {};
        
        if (formData.manualWeightage) {
          // Use manual weightage
          validTopics.forEach(topic => {
            const key = `${subject.name}_${topic}`;
            weightageObj[topic] = topicWeightage[key] || 0.5;
          });
        } else {
          // Use LLM-generated weightage
          Object.keys(topicWeightage).forEach(key => {
            const topicName = key.toLowerCase();
            validTopics.forEach(topic => {
              if (topic.toLowerCase().includes(topicName) || topicName.includes(topic.toLowerCase())) {
                weightageObj[topic] = topicWeightage[key];
              }
            });
          });
          
          // Fill missing weightage with default values
          validTopics.forEach(topic => {
            if (!weightageObj[topic]) {
              weightageObj[topic] = 0.5;
            }
          });
        }

        return {
          name: subject.name.trim(),
          topics: validTopics,
          weightage: weightageObj,
          examDate: subject.examDate,
          priority: subject.priority,
          estimatedHours: subject.estimatedHours || 20
        };
      });

      // Enhanced request data for LLM processing
      const requestData = {
        subjects: subjectsWithWeightage,
        study_hours_per_day: formData.studyHoursPerDay,
        preferred_time_slots: formData.preferredTimeSlots,
        manual_weightage: formData.manualWeightage,
        user_id: user.id || 'default-user',
        generation_type: 'multi_subject_prioritized',
        llm_features: {
          priority_optimization: true,
          smart_scheduling: true,
          adaptive_allocation: true,
          study_recommendations: true
        }
      };

      console.log('📤 Sending enhanced request data to LLM:', requestData);

      // Check if backend is reachable
      await axios.get('http://localhost:8000/health', { timeout: 5000 });

      const response = await axios.post('http://localhost:8000/generate-enhanced-timetable', requestData, {
        timeout: 120000, // 2 minute timeout for LLM processing
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('📅 LLM Timetable response:', response.data);

      if (response.data.success) {
        setGeneratedTimetable(response.data.timetable);
        setStep(4); // Move to results step
        setDebugInfo('✅ LLM-powered timetable generated successfully!');
        
        // Save timetable to localStorage
        localStorage.setItem('currentTimetable', JSON.stringify(response.data.timetable));
      } else {
        throw new Error('LLM timetable generation failed - no success flag');
      }
    } catch (err) {
      console.error('❌ LLM Timetable generation error:', err);
      
      let errorMessage = 'Failed to generate LLM-powered timetable. ';
      
      if (err.code === 'ECONNREFUSED' || err.message.includes('Network Error')) {
        errorMessage += 'AI Backend with LLM is not running. Please start: python main.py';
        setDebugInfo('❌ Cannot connect to LLM Backend');
      } else if (err.response?.status === 500) {
        errorMessage += 'LLM server error. Check AI Backend logs.';
        setDebugInfo(`❌ LLM Server error: ${err.response?.data?.detail || 'Internal server error'}`);
      } else if (err.response?.data?.detail) {
        errorMessage += err.response.data.detail;
        setDebugInfo(`❌ LLM API error: ${err.response.data.detail}`);
      } else {
        errorMessage += err.message;
        setDebugInfo(`❌ Error: ${err.message}`);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced subject priority calculation
  const calculateSubjectPriority = (subjects) => {
    const today = new Date();
    return subjects.map(subject => {
      if (subject.examDate) {
        const examDate = new Date(subject.examDate);
        const daysUntilExam = Math.ceil((examDate - today) / (1000 * 60 * 60 * 24));
        return {
          ...subject,
          daysUntilExam,
          urgencyLevel: daysUntilExam <= 7 ? 'High' : 
                       daysUntilExam <= 14 ? 'Medium' : 'Low'
        };
      }
      return subject;
    }).sort((a, b) => (a.daysUntilExam || 999) - (b.daysUntilExam || 999));
  };

  // Time slot options
  const timeSlotOptions = [
    '06:00-08:00', '08:00-10:00', '09:00-11:00', '10:00-12:00',
    '12:00-14:00', '14:00-16:00', '16:00-18:00', '18:00-20:00',
    '20:00-22:00', '22:00-00:00'
  ];

  const handleTimeSlotChange = (slot) => {
    const currentSlots = formData.preferredTimeSlots;
    if (currentSlots.includes(slot)) {
      setFormData({
        ...formData,
        preferredTimeSlots: currentSlots.filter(s => s !== slot)
      });
    } else {
      setFormData({
        ...formData,
        preferredTimeSlots: [...currentSlots, slot]
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📅 AI-Powered Smart Timetable Generator
          </h1>
          <p className="text-gray-600">
            Create personalized study schedules with individual exam dates and LLM-powered optimization
          </p>
          
          {/* Debug Info */}
          {debugInfo && (
            <div className={`mt-3 p-2 rounded text-sm ${
              debugInfo.includes('✅') ? 'bg-green-50 text-green-700' : 
              debugInfo.includes('❌') ? 'bg-red-50 text-red-700' : 
              'bg-blue-50 text-blue-700'
            }`}>
              {debugInfo}
            </div>
          )}
          
          {/* Progress indicator */}
          <div className="mt-6 flex items-center">
            {[1, 2, 3, 4].map((stepNum) => (
              <div key={stepNum} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= stepNum ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNum}
                </div>
                {stepNum < 4 && (
                  <div className={`w-16 h-1 mx-2 ${step > stepNum ? 'bg-blue-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-2 flex justify-between text-sm text-gray-600">
            <span>Subjects & Dates</span>
            <span>Study Settings</span>
            <span>Weightage</span>
            <span>AI Timetable</span>
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

        {/* Step 1: Enhanced Subjects with Individual Exam Dates */}
        {step === 1 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 1: Add Subjects with Individual Exam Dates
            </h2>
            
            <div className="space-y-6">
              {formData.subjects.map((subject, subjectIndex) => {
                const subjectWithPriority = subject.examDate ? {
                  ...subject,
                  daysUntilExam: Math.ceil((new Date(subject.examDate) - new Date()) / (1000 * 60 * 60 * 24))
                } : subject;

                return (
                  <div key={subjectIndex} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Subject Name */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Subject Name
                          </label>
                          <input
                            type="text"
                            value={subject.name}
                            onChange={(e) => updateSubject(subjectIndex, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="e.g., Mathematics, Physics"
                          />
                        </div>

                        {/* Individual Exam Date */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Exam Date
                          </label>
                          <input
                            type="date"
                            value={subject.examDate}
                            onChange={(e) => updateSubject(subjectIndex, 'examDate', e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          {subjectWithPriority.daysUntilExam && subjectWithPriority.daysUntilExam > 0 && (
                            <p className={`text-xs mt-1 ${
                              subjectWithPriority.daysUntilExam <= 7 ? 'text-red-600' :
                              subjectWithPriority.daysUntilExam <= 14 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {subjectWithPriority.daysUntilExam} days remaining
                            </p>
                          )}
                        </div>

                        {/* Estimated Study Hours */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Est. Hours Needed
                          </label>
                          <select
                            value={subject.estimatedHours}
                            onChange={(e) => updateSubject(subjectIndex, 'estimatedHours', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            {[1,2,3,4,5,6,7,8,9,10, 15, 20, 25, 30, 40, 50].map(hours => (
                              <option key={hours} value={hours}>{hours} hours</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      
                      {formData.subjects.length > 1 && (
                        <button
                          onClick={() => removeSubject(subjectIndex)}
                          className="ml-4 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {/* Priority Indicator */}
                    {subject.examDate && (
                      <div className="mb-4">
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          subject.priority === 1 ? 'bg-red-100 text-red-800' :
                          subject.priority === 2 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {subject.priority === 1 ? '🔥 High Priority' :
                           subject.priority === 2 ? '⚡ Medium Priority' : '📚 Low Priority'}
                        </div>
                      </div>
                    )}
                    
                    {/* Topics */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Topics
                      </label>
                      <div className="space-y-2">
                        {subject.topics.map((topic, topicIndex) => (
                          <div key={topicIndex} className="flex items-center">
                            <input
                              type="text"
                              value={topic}
                              onChange={(e) => updateTopic(subjectIndex, topicIndex, e.target.value)}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., Calculus, Algebra, Trigonometry"
                            />
                            
                            {subject.topics.length > 1 && (
                              <button
                                onClick={() => removeTopic(subjectIndex, topicIndex)}
                                className="ml-2 p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                ❌
                              </button>
                            )}
                          </div>
                        ))}
                        
                        <button
                          onClick={() => addTopic(subjectIndex)}
                          className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors"
                        >
                          + Add Topic
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              <button
                onClick={addSubject}
                className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors font-medium"
              >
                + Add Subject
              </button>
            </div>

            {/* Subject Priority Summary */}
            {formData.subjects.some(s => s.examDate) && (
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">📊 Subject Priority Summary</h3>
                <div className="space-y-2">
                  {calculateSubjectPriority(formData.subjects.filter(s => s.examDate && s.name)).map((subject, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{subject.name}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">{subject.daysUntilExam} days</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          subject.urgencyLevel === 'High' ? 'bg-red-100 text-red-800' :
                          subject.urgencyLevel === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {subject.urgencyLevel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!formData.subjects.some(s => s.name && s.topics.some(t => t.trim()) && s.examDate)}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Next: Study Settings
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Study Settings */}
        {step === 2 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 2: Study Settings & Preferences
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Study Hours Per Day
                </label>
                <select
                  value={formData.studyHoursPerDay}
                  onChange={(e) => setFormData({ ...formData, studyHoursPerDay: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(hours => (
                    <option key={hours} value={hours}>{hours} hours</option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-1">
                  Recommended: 4-6 hours for effective learning
                </p>
              </div>
            </div>
            
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Preferred Time Slots (select multiple)
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {timeSlotOptions.map(slot => (
                  <button
                    key={slot}
                    onClick={() => handleTimeSlotChange(slot)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
                      formData.preferredTimeSlots.includes(slot)
                        ? 'bg-blue-500 text-white border-blue-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={formData.preferredTimeSlots.length === 0}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                Next: Topic Weightage
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Topic Weightage */}
        {step === 3 && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Step 3: Topic Weightage (LLM-Powered)
            </h2>
            
            <div className="mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={formData.manualWeightage}
                      onChange={() => setFormData({ ...formData, manualWeightage: true })}
                      className="mr-2"
                    />
                    <span className="font-medium">Manual Weightage</span>
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Manually assign importance (1-10) for each topic
                  </p>
                </div>
                
                <div className="flex-1">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      checked={!formData.manualWeightage}
                      onChange={() => setFormData({ ...formData, manualWeightage: false })}
                      className="mr-2"
                    />
                    <span className="font-medium">LLM Auto Weightage</span>
                  </label>
                  <p className="text-sm text-gray-600 mt-1">
                    Upload previous year papers for AI analysis
                  </p>
                </div>
              </div>
            </div>
            
            {!formData.manualWeightage && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🤖 Upload Previous Year Question Papers for LLM Analysis
                </label>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.png"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-600 mt-1">
                  AI will analyze patterns and assign intelligent weightage
                </p>
                
                {uploadedFiles.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-700">Uploaded files:</p>
                    <ul className="text-sm text-gray-600">
                      {uploadedFiles.map((file, index) => (
                        <li key={index}>• {file.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {Object.keys(topicWeightage).length > 0 && (
                  <div className="mt-3 p-3 bg-green-50 rounded border">
                    <p className="text-sm font-medium text-green-800">✅ LLM Analysis Complete!</p>
                    <p className="text-xs text-green-600">AI has analyzed your papers and assigned intelligent topic weightage.</p>
                  </div>
                )}
              </div>
            )}
            
            {formData.manualWeightage && (
              <div className="space-y-4">
                {formData.subjects.map((subject, subjectIndex) => (
                  <div key={subjectIndex} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-medium text-gray-900 mb-3">{subject.name}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {subject.topics.filter(topic => topic.trim()).map((topic, topicIndex) => (
                        <div key={topicIndex} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{topic}</span>
                          <input
                            type="range"
                            min="1"
                            max="10"
                            value={topicWeightage[`${subject.name}_${topic}`] * 10 || 5}
                            onChange={(e) => updateManualWeightage(subject.name, topic, e.target.value / 10)}
                            className="w-20 ml-3"
                          />
                          <span className="text-sm font-medium w-8 text-center">
                            {Math.round((topicWeightage[`${subject.name}_${topic}`] * 10) || 5)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-6 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={generateTimetable}
                disabled={loading}
                className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    LLM Generating...
                  </div>
                ) : (
                  '🤖 Generate LLM Timetable'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Generated Timetable */}
        {step === 4 && generatedTimetable && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  🎉 Your LLM-Powered Smart Timetable
                </h2>
                <p className="text-gray-600">
                  Optimized by AI with priority-based scheduling
                </p>
              </div>
              <button
                onClick={() => {
                  setStep(1);
                  setGeneratedTimetable(null);
                  setError('');
                  setDebugInfo('');
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Generate New
              </button>
            </div>
            
            {/* LLM Insights */}
            {generatedTimetable.llm_insights && (
              <div className="mb-6 p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">🧠 LLM Insights & Recommendations</h3>
                <div className="text-sm text-purple-800 whitespace-pre-line">
                  {generatedTimetable.llm_insights}
                </div>
              </div>
            )}

            {/* Priority-Based Schedule */}
            {generatedTimetable.priority_analysis && (
              <div className="mb-6 p-4 bg-red-50 rounded-lg">
                <h3 className="font-medium text-red-900 mb-2">🔥 Priority Analysis</h3>
                <div className="space-y-2">
                  {generatedTimetable.priority_analysis.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{item.subject}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-600">{item.days_remaining} days</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          item.priority === 'High' ? 'bg-red-100 text-red-800' :
                          item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.priority}
                        </span>
                        <span className="text-blue-600 font-medium">{item.allocated_hours}h</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* AI Recommendations */}
            {generatedTimetable.ai_recommendations && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium text-blue-900 mb-2">🤖 AI Study Recommendations</h3>
                <div className="text-sm text-blue-800 whitespace-pre-line">
                  {generatedTimetable.ai_recommendations}
                </div>
              </div>
            )}
            
            {/* Subject Hours Distribution */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">📊 Smart Hours Allocation</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Object.entries(generatedTimetable.subject_hours).map(([subject, hours]) => (
                  <div key={subject} className="bg-gray-50 p-3 rounded-lg text-center">
                    <div className="text-lg font-semibold text-blue-600">{hours}h</div>
                    <div className="text-sm text-gray-600">{subject}</div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Daily Schedule Preview */}
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-3">📅 Optimized Daily Schedule (First 5 Days)</h3>
              <div className="space-y-4">
                {generatedTimetable.daily_schedule.slice(0, 5).map((day) => (
                  <div key={day.day} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-gray-900">
                        Day {day.day} - {new Date(day.date).toLocaleDateString()}
                      </h4>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600">
                          {day.sessions.length} sessions
                        </span>
                        {day.focus_subject && (
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                            Focus: {day.focus_subject}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {day.sessions.map((session) => (
                        <div key={session.session_id} className="bg-gray-50 p-3 rounded border-l-4 border-blue-500">
                          <div className="font-medium text-gray-900">{session.subject}</div>
                          <div className="text-sm text-gray-600">{session.topic}</div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center justify-between">
                            <span>{session.time_slot} • {session.duration_hours}h</span>
                            {session.priority && (
                              <span className={`px-1 py-0.5 rounded text-xs ${
                                session.priority === 'high' ? 'bg-red-100 text-red-600' :
                                session.priority === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-green-100 text-green-600'
                              }`}>
                                {session.priority}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              {generatedTimetable.daily_schedule.length > 5 && (
                <p className="text-center text-gray-600 mt-4">
                  ... and {generatedTimetable.daily_schedule.length - 5} more days of optimized scheduling
                </p>
              )}
            </div>

            {/* Study Tips */}
            {generatedTimetable.study_tips && (
              <div className="mb-6 p-4 bg-green-50 rounded-lg">
                <h3 className="font-medium text-green-900 mb-2">💡 LLM Study Tips</h3>
                <ul className="text-sm text-green-800 space-y-1">
                  {generatedTimetable.study_tips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </div>
            )}
            
            <div className="flex justify-center">
              <button
                onClick={() => window.location.href = '/my-timetable'}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
              >
                📋 View Complete Timetable
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimetableGenerator;