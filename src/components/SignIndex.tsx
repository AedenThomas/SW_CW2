import React, { useState } from 'react';
import { questions } from '../data/questions';
import '../styles/book.css';
import { getAllLevelProgress } from '../utils/storage';
import { LevelProgressMap } from '../types/game';

interface SignIndexProps {
  onBack: () => void;
}

const ITEMS_PER_PAGE = 4; // Number of signs per page
const ANIMATION_DURATION = 1500; // matches CSS animation duration of 1.5s
const PAGE_SWITCH_DELAY = ANIMATION_DURATION / 2;

export const SignIndex: React.FC<SignIndexProps> = ({ onBack }) => {
  const [isClosing, setIsClosing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [levelProgress, setLevelProgress] = useState<LevelProgressMap>({});
  const [isPageTurning, setIsPageTurning] = useState(false);
  const [pageDirection, setPageDirection] = useState<'forward' | 'backward'>('forward');
  const [isMobile, setIsMobile] = useState(false);

  const totalPages = Math.ceil(questions.length / ITEMS_PER_PAGE);
  const isLastPage = currentPage >= totalPages - 2; // -2 because we show 2 pages at once

  // Add useEffect to trigger opening animation after mount
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Add useEffect to load level progress
  React.useEffect(() => {
    setLevelProgress(getAllLevelProgress());
  }, []);

  // Add useEffect to detect mobile screens
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Add helper function to check if a sign should be greyed out
  const isSignGreyedOut = (levelId: number) => {
    return !levelProgress[levelId]?.completed;
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onBack();
    }, 1500); // Reduced from 3000ms to 1500ms to match new animation duration
  };

  const handleNextPage = () => {
    const maxPages = isMobile ? totalPages : totalPages - 1;
    if (currentPage < maxPages && !isPageTurning) {
      setIsPageTurning(true);
      setPageDirection('forward');
      setTimeout(() => {
        setCurrentPage(prev => prev + (isMobile ? 1 : 2));
        setIsPageTurning(false);
      }, PAGE_SWITCH_DELAY);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0 && !isPageTurning) {
      setIsPageTurning(true);
      setPageDirection('backward');
      setTimeout(() => {
        setCurrentPage(prev => prev - (isMobile ? 1 : 2));
        setIsPageTurning(false);
      }, PAGE_SWITCH_DELAY);
    }
  };

  // Update the formatInsightText function
  const formatInsightText = (text: string, levelId: number) => {
    if (isSignGreyedOut(levelId)) {
      // Show first 5 words followed by ellipsis
      const words = text.split(' ');
      const visiblePart = words.slice(0, 5).join(' ');
      return (
        <div className="relative py-4 flex flex-col items-center justify-center">
          <p className="text-gray-400 line-clamp-2 leading-relaxed">{visiblePart}...</p>
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <svg 
              className="w-5 h-5 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <span className="text-sm font-medium text-gray-400">
              Locked
            </span>
          </div>
        </div>
      );
    }
    return (
      <div className="w-full py-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          {text}
        </p>
      </div>
    );
  };

  // Update the renderSignCard function
  const renderSignCard = (signGroup: any, index: number) => (
    <div 
      key={index} 
      className={`bg-gray-50 rounded-lg p-6 shadow-md 
                  hover:shadow-lg transition-shadow border border-gray-200
                  ${isSignGreyedOut(signGroup.levelId) ? 'hover:bg-gray-50/80' : 'hover:bg-white'}
                  flex flex-col`}
    >
      {/* Image Container */}
      <div className="relative mb-4 flex-shrink-0">
        <img 
          src={signGroup.signPath}
          alt={`Traffic Sign ${index + 1}`}
          className={`w-24 h-24 object-contain transition-all mx-auto
                   ${isSignGreyedOut(signGroup.levelId) ? 'grayscale opacity-50' : ''}`}
        />
        {isSignGreyedOut(signGroup.levelId) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="p-2.5 rounded-full bg-gray-100/80 backdrop-blur-sm">
              <svg 
                className="w-6 h-6 text-gray-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Text Container */}
      <div className="flex flex-col">
        <div className="text-center">
          {formatInsightText(signGroup.oracleHelp.correctAnswerInsight, signGroup.levelId)}
        </div>
        {isSignGreyedOut(signGroup.levelId) && (
          <div className="text-center mt-2">
            <span className="inline-block px-4 py-1.5 text-sm font-medium text-gray-500 bg-gray-100 rounded-full">
              Complete Level {signGroup.levelId}
            </span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-50 bg-gray-800/90 overflow-hidden flex items-center justify-center">
      <div className={`book-wrapper ${isOpen ? 'book-opening' : ''} ${isClosing ? 'book-closing' : ''}`}>
        <div className="book-container">
          {/* Book Cover */}
          <div className="book-cover">
            <div className="cover-decoration"></div>
            <div className="cover-title">Traffic Signs</div>
            <div className="cover-subtitle">A Complete Guide to Road Safety</div>
            <div className="mt-8 text-sm opacity-70">
              Ministry of Transportation
            </div>
          </div>

          {/* Book Content */}
          <div className="book-content">
            {/* Current Pages */}
            <div 
              className={`page-content ${isPageTurning && pageDirection === 'forward' ? 'page-turning' : ''} 
                        ${isPageTurning && pageDirection === 'backward' ? 'page-turning-reverse' : ''}`}
            >
              <div className="flex h-full">
                {/* Left Page */}
                <div className={`flex-1 p-8 bg-white left-page overflow-y-auto mobile-single-page`}>
                  <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-800 text-center p-4 
                                 bg-gray-800 text-white rounded-lg shadow-md">
                      📖 Sign Index 📖
                    </h1>
                    <div className="text-center mt-4 text-gray-600">
                      {isMobile ? (
                        `Page ${currentPage + 1} of ${totalPages}`
                      ) : (
                        `Page ${currentPage + 1}-${currentPage + 2} of ${totalPages}`
                      )}
                    </div>
                  </div>

                  {/* Navigation Controls - Show on top for mobile */}
                  {isMobile && (
                    <div className="flex justify-between items-center mb-8 mobile-nav">
                      <button
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
                        className={`${currentPage === 0 ? 'opacity-50 cursor-not-allowed' : ''} 
                                 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 
                                 rounded-lg transition-colors flex items-center gap-2 w-full`}
                      >
                        ← Previous
                      </button>
                      <button
                        onClick={handleClose}
                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 
                                 rounded-lg transition-colors flex items-center gap-2 w-full"
                      >
                        Close Book
                      </button>
                      <button
                        onClick={handleNextPage}
                        disabled={isLastPage}
                        className={`${isLastPage ? 'opacity-50 cursor-not-allowed' : ''} 
                                 bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 
                                 rounded-lg transition-colors flex items-center gap-2 w-full`}
                      >
                        Next →
                      </button>
                    </div>
                  )}

                  {/* Signs Grid - Left Page */}
                  <div className="grid grid-cols-2 gap-4">
                    {questions
                      .slice(
                        currentPage * (isMobile ? ITEMS_PER_PAGE / 2 : ITEMS_PER_PAGE),
                        (currentPage * (isMobile ? ITEMS_PER_PAGE / 2 : ITEMS_PER_PAGE)) + 
                        (isMobile ? ITEMS_PER_PAGE / 2 : ITEMS_PER_PAGE)
                      )
                      .map((signGroup, index) => renderSignCard(signGroup, index))}
                  </div>
                </div>

                {/* Right Page - Hide on mobile */}
                {!isMobile && (
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
                    <div className="grid grid-cols-2 gap-4 mt-[68px]">
                      {questions.slice((currentPage * ITEMS_PER_PAGE) + ITEMS_PER_PAGE, (currentPage * ITEMS_PER_PAGE) + (ITEMS_PER_PAGE * 2)).map((signGroup, index) => (
                        renderSignCard(signGroup, index)
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Next Pages */}
            {isPageTurning && (
              <div className="page-content page-next">
                <div className="flex h-full">
                  {/* Next Left Page */}
                  <div className="flex-1 p-8 bg-white left-page overflow-y-auto">
                    <div className="mb-8">
                      <h1 className="text-4xl font-bold text-gray-800 text-center p-4 
                                    bg-gray-800 text-white rounded-lg shadow-md">
                        📖 Sign Index 📖
                      </h1>
                      <div className="text-center mt-4 text-gray-600">
                        Page {pageDirection === 'forward' ? currentPage + 3 : currentPage - 1}-
                              {pageDirection === 'forward' ? currentPage + 4 : currentPage} of {totalPages}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {questions.slice(
                        pageDirection === 'forward' 
                          ? ((currentPage + 2) * ITEMS_PER_PAGE)
                          : ((currentPage - 2) * ITEMS_PER_PAGE),
                        pageDirection === 'forward'
                          ? ((currentPage + 2) * ITEMS_PER_PAGE) + ITEMS_PER_PAGE
                          : ((currentPage - 2) * ITEMS_PER_PAGE) + ITEMS_PER_PAGE
                      ).map((signGroup, index) => renderSignCard(signGroup, index))}
                    </div>
                  </div>

                  {/* Next Right Page */}
                  <div className="flex-1 p-8 bg-white right-page overflow-y-auto">
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
                    <div className="grid grid-cols-2 gap-4 mt-[68px]">
                      {questions.slice(
                        pageDirection === 'forward'
                          ? ((currentPage + 2) * ITEMS_PER_PAGE) + ITEMS_PER_PAGE
                          : ((currentPage - 2) * ITEMS_PER_PAGE) + ITEMS_PER_PAGE,
                        pageDirection === 'forward'
                          ? ((currentPage + 2) * ITEMS_PER_PAGE) + (ITEMS_PER_PAGE * 2)
                          : ((currentPage - 2) * ITEMS_PER_PAGE) + (ITEMS_PER_PAGE * 2)
                      ).map((signGroup, index) => renderSignCard(signGroup, index))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}; 