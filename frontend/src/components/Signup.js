import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const Signup = ({ onToggleMode }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordMatch, setPasswordMatch] = useState(true);

  const { signup, loading, error, clearError } = useAuth();

  useEffect(() => {
    clearError();
  }, [clearError]);

  useEffect(() => {
    if (formData.password && formData.confirmPassword) {
      setPasswordMatch(formData.password === formData.confirmPassword);
    } else {
      setPasswordMatch(true);
    }
  }, [formData.password, formData.confirmPassword]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!passwordMatch) {
      return;
    }

    if (formData.password.length < 6) {
      return;
    }

    await signup(formData.name, formData.email, formData.password);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Gradient Section (Keep as original) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-green-600 via-blue-600 to-purple-700 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <img 
            src="/images/patterns/pattern-2.svg" 
            alt="Background Pattern"
            className="w-full h-full object-cover"
          />
        </div>
        
        {/* Main Hero Content */}
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="text-center text-white space-y-6 max-w-md">
            {/* Hero Illustration */}
            <div className="mb-8">
              <img 
                src="/images/study-illustration.png" 
                alt="Join Smart Study"
                className="w-80 h-80 mx-auto object-contain drop-shadow-2xl"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              {/* Fallback Icon */}
              <div className="hidden w-80 h-80 mx-auto bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-8xl">🎓</span>
              </div>
            </div>
            
            {/* Hero Text */}
            <div>
              <h1 className="text-4xl font-bold mb-4">
                Join Smart Study
              </h1>
              <p className="text-xl text-green-100 leading-relaxed">
                Start your intelligent exam preparation journey today
              </p>
            </div>
            
            {/* Benefits List */}
            <div className="space-y-3 text-left">
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-sm">✨</span>
                </div>
                <span className="text-green-100">Free to get started</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-sm">🎯</span>
                </div>
                <span className="text-green-100">Personalized study plans</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <span className="text-sm">📈</span>
                </div>
                <span className="text-green-100">Track your progress</span>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="absolute top-10 right-10 w-20 h-20 bg-white bg-opacity-10 rounded-full animate-pulse"></div>
            <div className="absolute bottom-10 left-10 w-16 h-16 bg-white bg-opacity-10 rounded-full animate-pulse" style={{animationDelay: '1s'}}></div>
            <div className="absolute top-1/3 left-20 w-12 h-12 bg-white bg-opacity-10 rounded-full animate-pulse" style={{animationDelay: '2s'}}></div>
          </div>
        </div>
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-transparent opacity-50"></div>
      </div>

      {/* Right Side - Signup Form with Background Image */}
      <div 
        className="w-full lg:w-1/2 flex items-center justify-center p-8 relative"
        style={{
          backgroundImage: `url('/images/login-hero.jpg')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* Background Overlay for better readability */}
        <div className="absolute inset-0 bg-white bg-opacity-90"></div>
        
        {/* Signup Form Container */}
        <div className="max-w-md w-full space-y-8 relative z-10">
          {/* Logo and Header */}
          <div className="text-center">
            <div className="mx-auto h-16 w-16 flex items-center justify-center rounded-full bg-green-500 mb-4 shadow-lg">
              <img 
                src="/images/logo.png" 
                alt="Logo"
                className="h-12 w-12 object-contain"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextElementSibling.style.display = 'block';
                }}
              />
              <span className="text-white text-2xl hidden">🎓</span>
            </div>
            <h2 className="text-3xl font-bold text-gray-900">
              Create Account
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Join thousands of students boosting their exam preparation
            </p>
          </div>
          
          {/* Signup Form with Glass Effect */}
          <div className="bg-white bg-opacity-95 backdrop-blur-sm rounded-2xl shadow-xl p-8 border border-white border-opacity-20">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-red-400">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm bg-white bg-opacity-90"
                      placeholder="Enter your full name"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">👤</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-3 py-3 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm bg-white bg-opacity-90"
                      placeholder="Enter your email"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">📧</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="appearance-none relative block w-full px-3 py-3 pl-10 pr-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm bg-white bg-opacity-90"
                      placeholder="Create a password (min 6 characters)"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">🔒</span>
                    </div>
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      <span className="text-gray-400 text-sm">
                        {showPassword ? '🙈' : '👁️'}
                      </span>
                    </button>
                  </div>
                  {formData.password && formData.password.length < 6 && (
                    <p className="mt-1 text-sm text-red-600">Password must be at least 6 characters</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className={`appearance-none relative block w-full px-3 py-3 pl-10 border placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm bg-white bg-opacity-90 ${
                        !passwordMatch ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Confirm your password"
                    />
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-400 text-sm">🔐</span>
                    </div>
                  </div>
                  {!passwordMatch && formData.confirmPassword && (
                    <p className="mt-1 text-sm text-red-600">Passwords do not match</p>
                  )}
                </div>
              </div>

              {/* Terms and Conditions */}
              <div className="flex items-center">
                <input
                  id="agree-terms"
                  name="agree-terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="agree-terms" className="ml-2 block text-sm text-gray-900">
                  I agree to the{' '}
                  <a href="#" className="text-green-600 hover:text-green-500">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="#" className="text-green-600 hover:text-green-500">
                    Privacy Policy
                  </a>
                </label>
              </div>

              {/* Submit Button */}
              <div>
                <button
                  type="submit"
                  disabled={loading || !passwordMatch || formData.password.length < 6}
                  className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white ${
                    loading || !passwordMatch || formData.password.length < 6
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500'
                  } transition-colors shadow-lg`}
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating account...
                    </div>
                  ) : (
                    <>
                      <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                        <span className="text-green-500 group-hover:text-green-400">🎯</span>
                      </span>
                      Create Account
                    </>
                  )}
                </button>
              </div>

              {/* Toggle to Login */}
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={onToggleMode}
                    className="font-medium text-green-600 hover:text-green-500 transition-colors"
                  >
                    Sign in here
                  </button>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;