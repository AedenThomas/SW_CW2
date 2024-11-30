import { motion, AnimatePresence } from "framer-motion";
import { Question } from "../types/game";
import React from "react";

interface OracleButtonProps {
  onClick: () => void;
  isActive: boolean;
  disabled: boolean;
}

export function OracleButton({ onClick, isActive, disabled }: OracleButtonProps) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-12 h-12 rounded-full flex items-center justify-center 
                 transition-colors z-50 ${
                   disabled ? "bg-gray-400 cursor-not-allowed" :
                   isActive ? "bg-blue-600" : "bg-blue-500 hover:bg-blue-600"
                 }`}
      whileHover={{ scale: disabled ? 1 : 1.05 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      disabled={disabled}
    >
      <span className={`text-2xl ${disabled ? 'opacity-50' : ''}`}>🔮</span>
    </motion.button>
  );
}

interface OracleModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: Question | null;
  previousAnswer?: number;
}

export function OracleModal({
  isOpen,
  onClose,
  question,
  previousAnswer,
}: OracleModalProps) {
  // Handle click outside to close
  const modalRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space" && isOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const getFeedbackMessage = (
    question: Question,
    previousAnswer?: number
  ): string => {
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
          onClick={handleBackdropClick}
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#272D45] rounded-lg p-8 max-w-md w-full mx-4 relative shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                {/* Sign Image */}
                <div className="flex justify-center mb-6">
                  <div className="w-32 h-32 relative">
                    <img
                      src={question.options[question.correctAnswer]}
                      alt="Correct sign"
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>

                {/* Text Content */}
                <div className="text-center text-white">
                  <h3 className="text-xl mb-4">
                  {question.oracleHelp.hint}
                  </h3>
                  
                </div>

                {/* Oracle Icon */}
              </div>
            </motion.div>

            {/* Sticker overlapping the modal */}
            <div className="absolute -bottom-16 -right-16 w-36 h-36">
              <img
                src={process.env.PUBLIC_URL + "/images/happy1.svg"}
                alt="Happy stickers"
                className="w-full h-full"
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
