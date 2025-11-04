import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentTimetable, setCurrentTimetable] = useState(null);
  const [stats, setStats] = useState({
    activeTimetables: 0,
    completedTopics: 0,
    quizSessions: 0,
    studyHours: 0
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    try {
      // Load current timetable
      const savedTimetable = localStorage.getItem('currentTimetable');
      if (savedTimetable) {
        const timetable = JSON.parse(savedTimetable);
        setCurrentTimetable(timetable);
        
        // Calculate stats
        const completedSessions = timetable.daily_schedule.reduce((total, day) => 
          total + day.sessions.filter(s => s.completed).length, 0
        );
        
        const totalStudyHours = timetable.daily_schedule.reduce((total, day) => 
          total + day.sessions
            .filter(s => s.completed)
            .reduce((sessionTotal, session) => sessionTotal + session.duration_hours, 0), 0
        );

        setStats({
          activeTimetables: 1,
          completedTopics: completedSessions,
          quizSessions: 0,
          studyHours: totalStudyHours
        });
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const features = [
    {
      id: 'timetable',
      title: 'Generate Timetable',
      description: 'Create AI-powered study schedules based on your exam dates and available time',
      icon: '📅',
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      comingSoon: false,
      route: '/generate-timetable'
    },
    {
      id: 'my-timetable',
      title: 'My Timetable',
      description: 'View and manage your current study schedule with progress tracking',
      icon: '✅',
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      comingSoon: false,
      route: '/my-timetable',
      disabled: !currentTimetable
    },
    {
      id: 'quiz',
      title: 'Quiz Generator',
      description: 'Generate custom quizzes from your notes and PDFs using AI and RAG',
      icon: '🧠',
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      comingSoon: false, // Set to false to enable
      route: '/quiz-generator'
    }
  ];

  const dashboardStats = [
    {
      label: 'Active Timetables',
      value: stats.activeTimetables,
      icon: '📋',
      color: 'text-blue-600'
    },
    {
      label: 'Completed Topics',
      value: stats.completedTopics,
      icon: '✅',
      color: 'text-green-600'
    },
    {
      label: 'Quiz Sessions',
      value: stats.quizSessions,
      icon: '🎯',
      color: 'text-purple-600'
    },
    {
      label: 'Study Hours',
      value: `${stats.studyHours}h`,
      icon: '⏱️',
      color: 'text-orange-600'
    }
  ];

  const handleFeatureClick = (feature) => {
    if (feature.comingSoon) {
      alert('This feature is coming soon! Stay tuned.');
      return;
    }
    
    if (feature.disabled) {
      alert('Please generate a timetable first to access this feature.');
      return;
    }
    
    navigate(feature.route);
  };

  const getProgressPercentage = () => {
    if (!currentTimetable) return 0;
    
    const totalSessions = currentTimetable.daily_schedule.reduce(
      (total, day) => total + day.sessions.length, 0
    );
    const completedSessions = currentTimetable.daily_schedule.reduce(
      (total, day) => total + day.sessions.filter(s => s.completed).length, 0
    );
    
    return totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  };

  const getRemainingDays = () => {
    if (!currentTimetable) return 0;
    
    const examDate = new Date(currentTimetable.daily_schedule[currentTimetable.daily_schedule.length - 1]?.date);
    const today = new Date();
    const diffTime = examDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Welcome Section */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="mt-2 text-lg text-gray-600">
              Ready to boost your exam preparation with AI-powered study tools?
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {dashboardStats.map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <span className="text-2xl">{stat.icon}</span>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Current Timetable Summary */}
        {currentTimetable && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">📋 Current Timetable Progress</h2>
              <button
                onClick={() => navigate('/my-timetable')}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
              >
                View Full Timetable
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{getProgressPercentage()}%</div>
                <div className="text-sm text-gray-600">Progress Complete</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-500">{getRemainingDays()}</div>
                <div className="text-sm text-gray-600">Days Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">{currentTimetable.total_hours}h</div>
                <div className="text-sm text-gray-600">Total Study Hours</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${getProgressPercentage()}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Main Features */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Study Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.id}
                onClick={() => handleFeatureClick(feature)}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 transition-all duration-200 ${
                  feature.comingSoon || feature.disabled
                    ? 'opacity-75 cursor-not-allowed' 
                    : 'hover:shadow-md cursor-pointer transform hover:-translate-y-1'
                }`}
              >
                <div className="flex items-center mb-4">
                  <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center text-white text-xl`}>
                    {feature.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">{feature.title}</h3>
                    {feature.comingSoon && (
                      <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                        Coming Soon
                      </span>
                    )}
                    {feature.disabled && (
                      <span className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
                        Generate Timetable First
                      </span>
                    )}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
                <div className={`w-full py-2 px-4 rounded-lg text-white font-medium text-center transition-colors ${
                  feature.comingSoon || feature.disabled
                    ? 'bg-gray-400 cursor-not-allowed'
                    : `${feature.color} ${feature.hoverColor}`
                }`}>
                  {feature.comingSoon ? 'Coming Soon' : feature.disabled ? 'Disabled' : 'Get Started'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/generate-timetable')}
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <span className="text-2xl mr-3">⚡</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">Quick Timetable</p>
                <p className="text-sm text-gray-600">Generate a basic study plan</p>
              </div>
            </button>
            
            <button 
              onClick={() => currentTimetable ? navigate('/my-timetable') : alert('Generate a timetable first!')}
              className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <span className="text-2xl mr-3">📚</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">Continue Study</p>
                <p className="text-sm text-gray-600">Resume your current session</p>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/quiz-generator')}
              className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <span className="text-2xl mr-3">🧠</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">Generate Quiz</p>
                <p className="text-sm text-gray-600">Create quiz from notes</p>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Recent Activity</h2>
          
          {currentTimetable ? (
            <div className="space-y-3">
              {currentTimetable.daily_schedule
                .flatMap(day => day.sessions.map(session => ({ ...session, date: day.date })))
                .filter(session => session.completed)
                .slice(-5) // Show last 5 completed sessions
                .reverse()
                .map((session, index) => (
                  <div key={index} className="flex items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-green-600 mr-3">✅</span>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{session.subject}: {session.topic}</p>
                      <p className="text-sm text-gray-600">
                        Completed on {new Date(session.date).toLocaleDateString()} • {session.duration_hours}h
                      </p>
                    </div>
                  </div>
                ))}
              
              {currentTimetable.daily_schedule
                .flatMap(day => day.sessions)
                .filter(session => session.completed).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-4 block">🎯</span>
                  <p>Complete your first study session to see activity here!</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-4 block">📊</span>
              <p>No recent activity yet. Start using the study tools to see your progress here!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;