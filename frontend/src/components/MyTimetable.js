import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const MyTimetable = () => {
  const { user } = useAuth();
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState(0);
  const [completionStatus, setCompletionStatus] = useState({});
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);

  useEffect(() => {
    loadTimetable();
  }, []);

  const loadTimetable = () => {
    try {
      // Load timetable from localStorage (in real app, this would come from backend)
      const savedTimetable = localStorage.getItem('currentTimetable');
      if (savedTimetable) {
        const parsed = JSON.parse(savedTimetable);
        setTimetable(parsed);
        setCompletionStatus(parsed.completion_status || {});
      } else {
        setError('No timetable found. Please generate a timetable first.');
      }
    } catch (err) {
      setError('Failed to load timetable.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSessionCompletion = (dayIndex, sessionId) => {
    if (!timetable) return;

    const updatedTimetable = { ...timetable };
    const session = updatedTimetable.daily_schedule[dayIndex].sessions.find(
      s => s.session_id === sessionId
    );
    
    if (session) {
      session.completed = !session.completed;
      
      // Update completion status
      const subjectName = session.subject;
      const updatedStatus = { ...completionStatus };
      
      if (!updatedStatus[subjectName]) {
        updatedStatus[subjectName] = { completed: 0, total: 0 };
      }
      
      if (session.completed) {
        updatedStatus[subjectName].completed += 1;
      } else {
        updatedStatus[subjectName].completed -= 1;
      }
      
      setCompletionStatus(updatedStatus);
      setTimetable(updatedTimetable);
      
      // Save to localStorage
      localStorage.setItem('currentTimetable', JSON.stringify(updatedTimetable));
    }
  };

  const addSessionNotes = (dayIndex, sessionId, notes) => {
    if (!timetable) return;

    const updatedTimetable = { ...timetable };
    const session = updatedTimetable.daily_schedule[dayIndex].sessions.find(
      s => s.session_id === sessionId
    );
    
    if (session) {
      session.notes = notes;
      setTimetable(updatedTimetable);
      localStorage.setItem('currentTimetable', JSON.stringify(updatedTimetable));
    }
  };

  const getProgressPercentage = () => {
    if (!timetable) return 0;

    const totalSessions = timetable.daily_schedule.reduce(
      (total, day) => total + day.sessions.length, 0
    );
    const completedSessions = timetable.daily_schedule.reduce(
      (total, day) => total + day.sessions.filter(s => s.completed).length, 0
    );

    return totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  };

  const getRemainingDays = () => {
    if (!timetable) return 0;
    const examDate = new Date(timetable.daily_schedule[timetable.daily_schedule.length - 1]?.date);
    const today = new Date();
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  const getCompletedTopics = () => {
    if (!timetable) return [];
    
    const completed = [];
    timetable.daily_schedule.forEach(day => {
      day.sessions.forEach(session => {
        if (session.completed) {
          completed.push(`${session.subject}: ${session.topic}`);
        }
      });
    });
    return completed;
  };

  const handleReschedule = async () => {
    setRescheduleLoading(true);
    setError('');

    try {
      const completedTopics = getCompletedTopics();
      const remainingDays = getRemainingDays();

      const response = await axios.post('http://localhost:8000/reschedule-timetable', {
        timetable_id: timetable.id,
        completed_topics: completedTopics,
        remaining_days: remainingDays,
        user_id: user.id
      });

      if (response.data.success) {
        // In a real app, you might generate a completely new timetable
        // For now, we'll just show the recommendations
        alert(`Timetable rescheduled! ${response.data.new_timetable?.ai_recommendations || 'Check the recommendations in the dashboard.'}`);
        setShowRescheduleModal(false);
      }
    } catch (err) {
      setError('Failed to reschedule timetable. Please try again.');
    } finally {
      setRescheduleLoading(false);
    }
  };

  const getCurrentDayIndex = () => {
    if (!timetable) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const todayIndex = timetable.daily_schedule.findIndex(day => day.date === today);
    return todayIndex >= 0 ? todayIndex : 0;
  };

  useEffect(() => {
    if (timetable) {
      setSelectedDay(getCurrentDayIndex());
    }
  }, [timetable]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your timetable...</p>
        </div>
      </div>
    );
  }

  if (error || !timetable) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Timetable Found</h2>
          <p className="text-gray-600 mb-6">{error || 'You need to generate a timetable first.'}</p>
          <button
            onClick={() => window.location.href = '/generate-timetable'}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Generate Timetable
          </button>
        </div>
      </div>
    );
  }

  const currentDay = timetable.daily_schedule[selectedDay];
  const progressPercentage = getProgressPercentage();
  const remainingDays = getRemainingDays();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                📋 My Study Timetable
              </h1>
              <p className="text-gray-600">
                Track your progress and manage your study schedule
              </p>
            </div>
            
            <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setShowRescheduleModal(true)}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                🔄 Reschedule
              </button>
              <button
                onClick={() => window.location.href = '/generate-timetable'}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                ➕ New Timetable
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progress Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📊 Progress Overview</h2>
              
              {/* Progress Circle */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative w-24 h-24">
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      className="text-blue-500"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressPercentage / 100)}`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-gray-900">{progressPercentage}%</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Remaining</span>
                  <span className="font-semibold text-red-500">{remainingDays}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Days</span>
                  <span className="font-semibold">{timetable.total_days}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Hours</span>
                  <span className="font-semibold">{timetable.total_hours}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Completed Sessions</span>
                  <span className="font-semibold text-green-500">
                    {timetable.daily_schedule.reduce((total, day) => 
                      total + day.sessions.filter(s => s.completed).length, 0
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Subject Progress */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">📚 Subject Progress</h2>
              <div className="space-y-3">
                {Object.entries(timetable.subject_hours).map(([subject, totalHours]) => {
                  const completedHours = timetable.daily_schedule.reduce((total, day) => {
                    return total + day.sessions
                      .filter(s => s.subject === subject && s.completed)
                      .reduce((sessionTotal, session) => sessionTotal + session.duration_hours, 0);
                  }, 0);
                  const percentage = totalHours > 0 ? Math.round((completedHours / totalHours) * 100) : 0;

                  return (
                    <div key={subject}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{subject}</span>
                        <span className="text-gray-600">{completedHours}h / {totalHours}h</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Daily Schedule */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2 sm:mb-0">
                  📅 Daily Schedule
                </h2>
                
                {/* Day Navigation */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSelectedDay(Math.max(0, selectedDay - 1))}
                    disabled={selectedDay === 0}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                  >
                    ◀️
                  </button>
                  
                  <select
                    value={selectedDay}
                    onChange={(e) => setSelectedDay(parseInt(e.target.value))}
                    className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {timetable.daily_schedule.map((day, index) => (
                      <option key={index} value={index}>
                        Day {day.day} - {new Date(day.date).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  
                  <button
                    onClick={() => setSelectedDay(Math.min(timetable.daily_schedule.length - 1, selectedDay + 1))}
                    disabled={selectedDay === timetable.daily_schedule.length - 1}
                    className="p-2 text-gray-400 hover:text-gray-600 disabled:cursor-not-allowed"
                  >
                    ▶️
                  </button>
                </div>
              </div>

              {/* Current Day Info */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-900">
                      Day {currentDay.day} - {new Date(currentDay.date).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </h3>
                    <p className="text-blue-700 text-sm">
                      {currentDay.sessions.length} sessions scheduled • {' '}
                      {currentDay.sessions.filter(s => s.completed).length} completed
                    </p>
                  </div>
                  
                  {selectedDay === getCurrentDayIndex() && (
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                      Today
                    </span>
                  )}
                </div>
              </div>

              {/* Sessions */}
              <div className="space-y-4">
                {currentDay.sessions.map((session, sessionIndex) => (
                  <div
                    key={session.session_id}
                    className={`border rounded-lg p-4 transition-all duration-200 ${
                      session.completed 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-white border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <button
                          onClick={() => toggleSessionCompletion(selectedDay, session.session_id)}
                          className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                            session.completed
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400'
                          }`}
                        >
                          {session.completed && '✓'}
                        </button>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className={`font-semibold ${
                              session.completed ? 'text-green-800 line-through' : 'text-gray-900'
                            }`}>
                              {session.subject}
                            </h4>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {session.duration_hours}h
                            </span>
                          </div>
                          
                          <p className={`text-sm mb-2 ${
                            session.completed ? 'text-green-700' : 'text-gray-600'
                          }`}>
                            {session.topic}
                          </p>
                          
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>🕐 {session.time_slot}</span>
                            <span>📝 Session {sessionIndex + 1}</span>
                          </div>
                        </div>
                      </div>
                      
                      {session.completed && (
                        <span className="text-green-600 text-sm font-medium">
                          ✅ Completed
                        </span>
                      )}
                    </div>
                    
                    {/* Notes Section */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <textarea
                        placeholder="Add your notes for this session..."
                        value={session.notes || ''}
                        onChange={(e) => addSessionNotes(selectedDay, session.session_id, e.target.value)}
                        className="w-full p-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        rows="2"
                      />
                    </div>
                  </div>
                ))}
                
                {currentDay.sessions.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">🏖️</div>
                    <p>No sessions scheduled for this day</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">🔄 Reschedule Timetable</h3>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-3">
                  Based on your current progress, AI will suggest optimizations for your remaining study time.
                </p>
                
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <div className="flex justify-between mb-1">
                    <span>Completed Sessions:</span>
                    <span className="font-medium">{getCompletedTopics().length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Days Remaining:</span>
                    <span className="font-medium">{remainingDays}</span>
                  </div>
                </div>
              </div>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-sm rounded">
                  {error}
                </div>
              )}
              
              <div className="flex space-x-3">
                <button
                  onClick={handleReschedule}
                  disabled={rescheduleLoading}
                  className="flex-1 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-300 transition-colors"
                >
                  {rescheduleLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Rescheduling...
                    </div>
                  ) : (
                    'Get AI Recommendations'
                  )}
                </button>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyTimetable;