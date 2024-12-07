import React, { useEffect } from 'react';
import './App.css';
import Game from './components/Game';
import CarGarage from './components/CarGarage';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { audioManager } from './utils/audio'; // Add this import

function App() {
  // Add this useEffect to manage background music
  useEffect(() => {
    // Start playing menu music when component mounts
    audioManager.playBackgroundMusicGameless();

    // Return cleanup function
    return () => {
      audioManager.pauseBackgroundMusicGameless();
    };
  }, []); // Empty dependency array means this runs once on mount

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