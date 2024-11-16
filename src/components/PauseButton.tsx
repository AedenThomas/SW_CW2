

export function PauseButton({ isPaused, onClick }: { isPaused: boolean, onClick: () => void }) {
    return (
      <button
        onClick={onClick}
        className="fixed top-4 right-20 z-50 bg-white/80 hover:bg-white/90 p-2 rounded-full shadow-lg transition-all duration-200 backdrop-blur-sm"
        aria-label={isPaused ? "Resume game" : "Pause game"}
      >
        {isPaused ? (
          // Play icon
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        ) : (
          // Pause icon
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        )}
      </button>
    );
  }