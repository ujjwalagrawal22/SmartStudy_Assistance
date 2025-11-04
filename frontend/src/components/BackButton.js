import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ 
  to = null, 
  label = 'Back', 
  className = '', 
  showIcon = true,
  variant = 'default' // 'default', 'primary', 'secondary'
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      window.history.back();
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center px-4 py-2 rounded-lg font-medium transition-colors';
    
    switch (variant) {
      case 'primary':
        return `${baseClasses} bg-blue-500 text-white hover:bg-blue-600`;
      case 'secondary':
        return `${baseClasses} bg-gray-500 text-white hover:bg-gray-600`;
      default:
        return `${baseClasses} bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`;
    }
  };

  return (
    <button
      onClick={handleBack}
      className={`${getButtonClasses()} ${className}`}
    >
      {showIcon && (
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      )}
      {label}
    </button>
  );
};

export default BackButton;