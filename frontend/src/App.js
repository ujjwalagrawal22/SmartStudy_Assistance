import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import TimetableGenerator from './components/TimetableGenerator';
import MyTimetable from './components/MyTimetable';
import Navbar from './components/Navbar';
import './App.css';

// Import QuizGenerator only if it exists, otherwise create a placeholder
let QuizGenerator;
try {
  QuizGenerator = require('./components/QuizGenerator').default;
} catch (error) {
  console.log('QuizGenerator not found, using placeholder');
  QuizGenerator = () => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Quiz Generator Coming Soon</h2>
        <p className="text-gray-600 mb-6">This feature is currently under development.</p>
        <button
          onClick={() => window.history.back()}
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          ← Go Back
        </button>
      </div>
    </div>
  );
}

const AuthWrapper = () => {
  const { isAuthenticated, loading } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return isLoginMode ? (
      <Login onToggleMode={toggleMode} />
    ) : (
      <Signup onToggleMode={toggleMode} />
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/generate-timetable" element={<TimetableGenerator />} />
          <Route path="/my-timetable" element={<MyTimetable />} />
          <Route path="/quiz-generator" element={<QuizGenerator />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

function App() {
  return (
    <AuthProvider>
      <div className="App">
        <AuthWrapper />
      </div>
    </AuthProvider>
  );
}

export default App;