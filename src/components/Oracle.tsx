import { motion, AnimatePresence } from 'framer-motion';
import { Question } from '../types/game';
import React from 'react';

interface OracleButtonProps {
  onClick: () => void;
  isActive: boolean;
}

export function OracleButton({ onClick, isActive }: OracleButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`fixed top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center 
                 transition-colors z-50 ${
                   isActive ? 'bg-blue-600' : 'bg-blue-500 hover:bg-blue-600'
                 }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <span className="text-2xl">🔮</span>
    </motion.button>
  );
}

interface OracleModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  previousAnswer?: number;
}

export function OracleModal({ isOpen, onClose, question, previousAnswer }: OracleModalProps) {
  // Handle click outside to close
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const getFeedbackMessage = (question: Question, previousAnswer?: number): string => {
    if (previousAnswer === undefined) return question.oracleHelp.hint;
    
    return previousAnswer === question.correctAnswer
      ? question.oracleHelp.correctAnswerInsight
      : question.oracleHelp.wrongAnswerFeedback[previousAnswer.toString()] || 
        question.oracleHelp.hint;
  };

  return (
    <AnimatePresence>
      {isOpen && question && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-40"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-lg p-8 max-w-2xl w-full mx-4 relative"
            onClick={e => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Question */}
              <div>
                <h3 className="text-xl font-semibold mb-2">Previous Question</h3>
                <p className="text-gray-700">{question.text}</p>
              </div>

              {/* Correct Answer */}
              <div>
                <h3 className="text-xl font-semibold mb-2">Correct Answer</h3>
                <div className="w-32 h-32 relative">
                  <img 
                    src={question.options[question.correctAnswer]} 
                    alt="Correct sign"
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>

              {/* Explanation */}
              <div>
                <h3 className="text-xl font-semibold mb-2">Explanation</h3>
                <p className="text-gray-700">
                  {getFeedbackMessage(question, previousAnswer)}
                </p>
              </div>

              {/* Oracle Icon */}
              <div className="absolute bottom-4 right-4">
                <span className="text-3xl">🔮</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 