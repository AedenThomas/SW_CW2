import React, { useState } from 'react';
import { questions } from '../data/questions';
import '../styles/book.css';

interface SignIndexProps {
  onBack: () => void;
}

const ITEMS_PER_PAGE = 4; // Number of signs per page

export const SignIndex: React.FC<SignIndexProps> = ({ onBack }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE);
  const isLastPage = currentPage >= totalPages - 2; // -2 because we show 2 pages at once

  // Add useEffect to trigger opening animation after mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onBack();
    }, 1500); // Reduced from 3000ms to 1500ms to match new animation duration
  };

  const handleNextPage = () => {
    if (currentPage < totalPages - 2) {
      setCurrentPage(prev => prev + 2);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 2);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-gray-800/90 overflow-hidden flex items-center justify-center">
      <div className={`book-wrapper ${isOpen ? 'book-opening' : ''} ${isClosing ? 'book-closing' : ''}`}>
        {/* Book Container */}
        <div className="relative w-[1000px] h-[700px] bg-white rounded-lg overflow-hidden
                      shadow-[0_0_20px_rgba(0,0,0,0.3)] book-container">
          {/* Book Cover */}
          <div className="book-cover">
            <div className="cover-decoration"></div>
            <div className="cover-title">Traffic Signs</div>
            <div className="cover-subtitle">A Complete Guide to Road Safety</div>
            <div className="mt-8 text-sm opacity-70">
              Ministry of Transportation
            </div>
          </div>
          
          {/* Book Pages */}
          <div className="book-pages"></div>

          {/* Book Content */}
          <div className="absolute inset-0 flex book-content">
            {/* Left Page */}
            <div className="flex-1 p-8 bg-white left-page overflow-y-auto">
              <div className="mb-8">
                <h1 className="text-4xl font-bold text-gray-800 text-center p-4 
                             bg-gray-800 text-white rounded-lg shadow-md">
                  📖 Sign Index 📖
                </h1>
                <div className="text-center mt-4 text-gray-600">
                  Page {currentPage + 1}-{currentPage + 2} of {totalPages}
                </div>
              </div>

              {/* Signs Grid - Left Page */}
              <div className="grid grid-cols-2 gap-4">
                {questions.slice(currentPage * ITEMS_PER_PAGE, (currentPage * ITEMS_PER_PAGE) + ITEMS_PER_PAGE).map((signGroup, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 shadow-md 
                                          hover:shadow-lg transition-shadow border border-gray-200">
                    <div className="flex flex-col items-center">
                      <img 
                        src={signGroup.signPath}
                        alt={`Traffic Sign ${index + 1}`}
                        className="w-20 h-20 object-contain mb-2"
                      />
                      <div className="text-center">
                        {signGroup.questions.map((q, qIndex) => (
                          <p key={qIndex} className="text-xs text-gray-700 mb-1 line-clamp-2">
                            {q.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Page */}
            <div className="flex-1 p-8 bg-white right-page overflow-y-auto">
              {/* Navigation Controls */}
              <div className="flex justify-between items-center mb-8">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage === 0}
                  className={`${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''} 
                           bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 
                           rounded-lg transition-colors flex items-center gap-2`}
                >
                  ← Previous
                </button>
                <button
                  onClick={handleClose}
                  className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 
                           rounded-lg transition-colors flex items-center gap-2"
                >
                  Close Book
                </button>
                <button
                  onClick={handleNextPage}
                  disabled={isLastPage}
                  className={`${isLastPage ? 'opacity-50 cursor-not-allowed' : ''} 
                           bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 
                           rounded-lg transition-colors flex items-center gap-2`}
                >
                  Next →
                </button>
              </div>

              {/* Signs Grid - Right Page */}
              <div className="grid grid-cols-2 gap-4">
                {questions.slice((currentPage * ITEMS_PER_PAGE) + ITEMS_PER_PAGE, (currentPage * ITEMS_PER_PAGE) + (ITEMS_PER_PAGE * 2)).map((signGroup, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 shadow-md 
                                          hover:shadow-lg transition-shadow border border-gray-200">
                    <div className="flex flex-col items-center">
                      <img 
                        src={signGroup.signPath}
                        alt={`Traffic Sign ${index + 1}`}
                        className="w-20 h-20 object-contain mb-2"
                      />
                      <div className="text-center">
                        {signGroup.questions.map((q, qIndex) => (
                          <p key={qIndex} className="text-xs text-gray-700 mb-1 line-clamp-2">
                            {q.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 