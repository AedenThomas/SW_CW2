import React from 'react';
import './App.css';
import Game from './components/Game';
import CarGarage from './components/CarGarage';
import { HashRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <HashRouter>
        <Routes>
          <Route path="/" element={<Game />} />
          <Route path="/garage" element={<CarGarage onBack={() => window.history.back()} />} />
        </Routes>
      </HashRouter>
    </div>
  );
}

export default App;
