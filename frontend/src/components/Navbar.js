import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
  };

  const handleBack = () => {
    // Custom back logic based on current route
    if (location.pathname === '/generate-timetable' || 
        location.pathname === '/my-timetable' || 
        location.pathname === '/quiz-generator') {
      navigate('/dashboard');
    } else {
      window.history.back();
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/dashboard':
        return '📚 Dashboard';
      case '/generate-timetable':
        return '📅 Generate Timetable';
      case '/my-timetable':
        return '📋 My Timetable';
      case '/quiz-generator':
        return '🧠 Quiz Generator';
      default:
        return '📚 Smart Study';
    }
  };

  const showBackButton = location.pathname !== '/dashboard' && location.pathname !== '/';

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Back Button */}
            {showBackButton && (
              <button
                onClick={handleBack}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Go back"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            )}
            
            {/* Logo and Title */}
            <div className="flex-shrink-0 flex items-center">
              <button 
                onClick={() => navigate('/dashboard')}
                className="text-2xl font-bold text-primary-600 hover:text-primary-700 transition-colors"
              >
                {getPageTitle()}
              </button>
            </div>
          </div>
          
          {/* Right side - User info and logout */}
          <div className="flex items-center space-x-4">
            {/* Navigation Links */}
            <div className="hidden md:flex space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/dashboard' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Dashboard
              </button>
              
              <button
                onClick={() => navigate('/generate-timetable')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/generate-timetable' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Timetable
              </button>
              
              <button
                onClick={() => navigate('/quiz-generator')}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === '/quiz-generator' 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Quiz
              </button>
            </div>

            {/* User Profile */}
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden sm:block text-gray-700 font-medium">{user?.name}</span>
            </div>
            
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;