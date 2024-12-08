import React, { useEffect, useState } from 'react';
import './App.css';
import Game from './components/Game';
import CarGarage from './components/CarGarage';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { audioManager } from './utils/audio'; // Add this import

const DEBUG_AUDIO = true;
const debugAudio = (message: string, data?: any) => {
  if (DEBUG_AUDIO) {
    console.log(`🎮 [App Audio]: ${message}`, data || '');
  }
};

function App() {
  const [hasInteracted, setHasInteracted] = useState(false);
  const [audioInitialized, setAudioInitialized] = useState(false);

  useEffect(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    debugAudio('Device detection', { isIOS, isSafari, userAgent: navigator.userAgent });

    const handleUserInteraction = async (event: Event) => {
      debugAudio('User interaction detected', { type: event.type });
      if (!hasInteracted) {
        event.preventDefault();
        setHasInteracted(true);
        
        try {
          if (isIOS) {
            debugAudio('iOS detected, performing setup');
            // Create audio context first
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const tempContext = new AudioContext();
            debugAudio('Temporary context created', { state: tempContext.state });
            
            // Resume context immediately
            if (tempContext.state === 'suspended') {
              await tempContext.resume();
              debugAudio('Temporary context resumed', { state: tempContext.state });
            }
            
            // Small delay to ensure context is ready
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          if (isSafari) {
            debugAudio('Safari detected, performing setup');
            // Create a temporary audio context and oscillator
            const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
            const tempContext = new AudioContext();
            debugAudio('Temporary context created', { state: tempContext.state });
            
            // Create and play a brief silent sound
            const oscillator = tempContext.createOscillator();
            const gainNode = tempContext.createGain();
            gainNode.gain.value = 0.01;
            oscillator.connect(gainNode);
            gainNode.connect(tempContext.destination);
            oscillator.start(0);
            oscillator.stop(0.1);
            
            await new Promise(resolve => setTimeout(resolve, 100));
          }

          debugAudio('Initializing audio manager');
          const success = await audioManager.handleUserInteraction();
          debugAudio('Audio initialization result', { success });
          
          if (success) {
            // Small delay before starting music on iOS
            await new Promise(resolve => setTimeout(resolve, 100));
            debugAudio('Starting background music');
            await audioManager.playBackgroundMusicGameless();
          }
        } catch (error) {
          debugAudio('Audio initialization failed', error);
          alert('Tap again to enable game audio');
        }
      }
    };

    if (!hasInteracted) {
      const events = ['click', 'touchstart', 'pointerdown'];
      events.forEach(event => 
        window.addEventListener(event, handleUserInteraction, { once: true })
      );

      return () => {
        events.forEach(event => 
          window.removeEventListener(event, handleUserInteraction)
        );
      };
    }
  }, [hasInteracted]);

  // Add handler for route changes
  const handleRouteChange = (isGame: boolean) => {
    if (isGame) {
      // Pause menu music during gameplay
      audioManager.pauseBackgroundMusicGameless();
    } else {
      // Resume menu music when not in game
      audioManager.playBackgroundMusicGameless();
    }
  };

  return (
    <div className="App">
      <HashRouter>
        <Routes>
        <Route 
    path="/" 
    element={
        <Game 
            onGameStateChange={handleRouteChange}
        />
    } 
/>
          <Route 
            path="/garage" 
            element={<CarGarage onBack={() => {
              handleRouteChange(false);
              window.history.back();
            }} />} 
          />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;