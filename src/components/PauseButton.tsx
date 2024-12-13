import CustomButton from './CustomButton';

interface PauseButtonProps {
  isPaused: boolean;
  onClick: () => void;
  disabled?: boolean;
}

export const PauseButton: React.FC<PauseButtonProps> = ({ isPaused, onClick, disabled }) => {
  return (
    <CustomButton
      onClick={onClick}
      disabled={disabled}
      className={`z-20 p-3 rounded-lg transition-all duration-300 
                 ${disabled 
                   ? 'bg-gray-400 cursor-not-allowed opacity-50'
                   : 'bg-white hover:bg-gray-100 active:bg-gray-200'
                 } shadow-lg`}
      aria-label={isPaused ? "Resume" : "Pause"}
    >
      {isPaused ? (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      ) : (
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
      )}
    </CustomButton>
  );
};