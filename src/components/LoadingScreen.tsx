import { Html } from "@react-three/drei";

export function LoadingScreen() {
    return (
      <Html center>
        <div className="relative flex flex-col items-center justify-center p-8 rounded-xl bg-[#4A63B4]/90 border-2 border-white/30 backdrop-blur-md shadow-2xl">
          {/* Animated car icon */}
          <div className="relative mb-6">
            <svg
              className="w-16 h-16 text-white"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55-.45 1-1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.85 7h10.29l1.08 3.11H5.77L6.85 7zM19 17H5v-5h14v5z"/>
              <circle cx="7.5" cy="14.5" r="1.5"/>
              <circle cx="16.5" cy="14.5" r="1.5"/>
            </svg>
            {/* Animated pulse circles */}
            <div className="absolute inset-0 -z-10">
              <div className="absolute inset-0 animate-ping rounded-full bg-white/20"></div>
              <div className="absolute inset-0 animate-pulse rounded-full bg-white/10"></div>
            </div>
          </div>

          {/* Loading text */}
          <h2 className="text-2xl font-bold text-white mb-4">Loading Game</h2>
          
          {/* Progress bar */}
          <div className="w-48 h-2 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white/80 rounded-full animate-loading-progress"></div>
          </div>

          {/* Loading message */}
          <p className="mt-4 text-white/80 text-sm">Please wait while we prepare your driving experience...</p>
        </div>
      </Html>
    );
  }