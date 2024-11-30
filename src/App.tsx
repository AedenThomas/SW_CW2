import React from 'react';
import './App.css';
import Game from './components/Game';
import CarGarage from './components/CarGarage';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';

function App() {
  return (
    <div className="App">
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <Routes>
          <Route path="/" element={<Game />} />
          <Route path="/garage" element={<CarGarage onBack={() => window.history.back()} />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
