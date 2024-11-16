import { Canvas, useFrame } from '@react-three/fiber';
import { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { Environment, PerspectiveCamera, useGLTF, Text, Sky, Stars, Html } from '@react-three/drei';
import { Vector3, Quaternion, Euler } from 'three';
import { questions, getOptionsForQuestion } from '../data/questions';
import { lerp } from 'three/src/math/MathUtils';
import * as THREE from 'three';
import { EnvironmentDecorations } from './Environment';
import { GAME_SPEED, LANE_SWITCH_SPEED, LANE_SWITCH_COOLDOWN } from '../constants/game';
import { GameState, Question, GameMode } from '../types/game'; // Import Question and GameMode types
import { UserData } from '../types/userData';
import { OracleButton, OracleModal } from './Oracle';
import { TrafficObstacle, NUM_OBSTACLES } from './TrafficObstacle';
import { FuelIcon } from './FuelIcon';
import { LevelMap } from './LevelMap';
import { Road } from './Road';
import { PlayerCar } from './PlayerCar';
import {MovingAnswerOptions} from './MovingAnswerOptions';
import { MovingLaneDividers } from './MovingLaneDividers';
import { PauseButton } from './PauseButton';


// Add debug logging utility
const DEBUG = true;
const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
  }
};

// Add these constants at the top of the file
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger lane change
const SWIPE_TIMEOUT = 300; // Maximum time in ms for a swipe

// Update these constants at the top of the file
export const LANE_POSITIONS = [-5, 0, 5]; // Make sure these match your desired positions


// Inside the Game component, add touch handling
const initialGameState: GameState = {
  currentLane: 1,
  score: 0,
  speed: 1,
  lives: 3,
  combo: 0,
  multiplier: 1,
  isGameOver: false,
  currentQuestion: null,
  isMoving: true,
  coinsCollected: 0,
  oracleMode: false,
  oracleFeedback: null,
  isPlaying: false,
  mistakeCount: 0,
  hintsUsed: 0,
  consecutiveCorrect: 0,
  showingCorrectAnswer: false,
  isPaused: false,
  gameMode: null as GameMode | null,
  currentLevel: 0,
};

export default function Game() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const targetLanePosition = useRef(LANE_POSITIONS[1]);
  const questionTimer = useRef<NodeJS.Timeout | null>(null);
  const lastLaneSwitch = useRef(0);
  const questionIdCounter = useRef(1);

  // Add these refs for touch handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  // Add state for device type
  const [isMobile, setIsMobile] = useState(false);

  // Detect mobile devices
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize first question
  useEffect(() => {
    showNextQuestion();
  }, []);

  // Prefetch 3D assets
  useEffect(() => {
    useGLTF.preload(`${process.env.PUBLIC_URL}/models/car.glb`);
    // Add more preload calls if there are additional models
  }, []);

  const showNextQuestion = () => {
    // Select a random sign group
    const signGroup = questions[Math.floor(Math.random() * questions.length)];
    
    // Select a random question from that sign's questions
    const questionIndex = Math.floor(Math.random() * signGroup.questions.length);
    const baseQuestion = signGroup.questions[questionIndex];
    
    // Get options with correct answer first
    const options = getOptionsForQuestion(signGroup.signPath);
    
    // Create the full question object
    const question: Question = {
      ...baseQuestion,
      id: questionIdCounter.current++,
      signPath: signGroup.signPath,
      options: options,
      correctAnswer: 0, // Always 0 since correct answer is first in options
      oracleHelp: signGroup.oracleHelp
    };
    
    setGameState(prev => ({
      ...prev,
      currentQuestion: question
    }));
  };

  const handleCollision = (isCorrect: boolean) => {
    // Store the previous question and answer before updating state
    if (gameState.currentQuestion) {
      setPreviousQuestion(gameState.currentQuestion);
      setPreviousAnswer(gameState.currentLane);
    }

    if (gameState.oracleMode) {
      const currentQuestion = gameState.currentQuestion;
      if (!currentQuestion) {
        debugLog('No current question found in Oracle mode');
        return;
      }

      if (isCorrect) {
        debugLog('Correct answer in Oracle mode', {
          previousScore: gameState.score,
          newScore: gameState.score + 100
        });

        setGameState(prev => ({
          ...prev,
          score: prev.score + 100,
          oracleFeedback: {
            message: currentQuestion.oracleHelp.correctAnswerInsight,
            type: 'praise',
            shown: true
          }
        }));
      } else {
        const wrongOption = gameState.currentLane;
        debugLog('Wrong answer in Oracle mode', {
          wrongOption,
          feedback: currentQuestion.oracleHelp.wrongAnswerFeedback[wrongOption]
        });

        setGameState(prev => ({
          ...prev,
          mistakeCount: prev.mistakeCount + 1,
          oracleFeedback: {
            message: currentQuestion.oracleHelp.wrongAnswerFeedback[wrongOption],
            type: 'correction',
            shown: true
          }
        }));
      }

      // Clear feedback after delay
      setTimeout(() => {
        debugLog('Clearing Oracle feedback');
        setGameState(prev => ({
          ...prev,
          oracleFeedback: null
        }));
        showNextQuestion();
      }, 4000);
    } else {
      if (isCorrect) {
        debugLog('Correct answer in normal mode', {
          previousScore: gameState.score,
          newScore: gameState.score + 100
        });

        setGameState(prev => {
          const newConsecutiveCorrect = prev.consecutiveCorrect + 1;
          const speedIncrease = Math.floor(newConsecutiveCorrect / 3);
          const newSpeed = 1 + (speedIncrease * 0.5); // Increase speed by 0.5 for every 3 correct answers
          
          // Calculate bonus based on speed level
          const speedLevel = Math.floor((newConsecutiveCorrect - 1) / 3);
          const baseScore = 100;
          const bonus = speedLevel > 0 ? speedLevel * 10 : 0;
          const scoreIncrease = baseScore + bonus;
      
          return {
            ...prev,
            score: prev.score + scoreIncrease,
            currentQuestion: null,
            consecutiveCorrect: newConsecutiveCorrect,
            speed: newSpeed
          };
        });
        setTimeout(showNextQuestion, 200);
      } else {
        debugLog('Wrong answer in normal mode', {
          currentLives: gameState.lives,
          newLives: gameState.lives - 1
        });

        // Show the correct answer
        setGameState(prev => {
          const newLives = prev.lives - 1;
          return {
            ...prev,
            lives: newLives,
            isGameOver: newLives <= 0,
            consecutiveCorrect: 0,
            speed: 1,
            showingCorrectAnswer: true
          };
        });

        // Hide the correct answer and show next question after delay
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            showingCorrectAnswer: false
          }));
          showNextQuestion();
        }, 3000); // Show for 3 seconds
      }
    }
  };

  // Add hint request handler
  const handleHintRequest = () => {
    if (!gameState.currentQuestion || !gameState.oracleMode) return;
    
    setGameState(prev => ({
      ...prev,
      hintsUsed: prev.hintsUsed + 1,
      oracleFeedback: {
        message: gameState.currentQuestion!.oracleHelp.hint,
        type: 'hint',
        shown: true
      }
    }));

    // Clear hint after delay
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        oracleFeedback: null
      }));
    }, 3000);
  };

  // Update keyboard controls with debugging
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState.isGameOver || !gameState.isPlaying) return;

      const now = performance.now();
      const timeSinceLastSwitch = now - lastLaneSwitch.current;
      
      if (timeSinceLastSwitch < LANE_SWITCH_COOLDOWN) return;

      setGameState((prev) => { // Use functional update
        let newLane = prev.currentLane;

        switch (e.key) {
          case 'ArrowLeft':
            if (prev.currentLane > 0) {
              newLane = prev.currentLane - 1;
              lastLaneSwitch.current = now;
              targetLanePosition.current = LANE_POSITIONS[newLane];
            }
            break;
          case 'ArrowRight':
            if (prev.currentLane < 2) {
              newLane = prev.currentLane + 1;
              lastLaneSwitch.current = now;
              targetLanePosition.current = LANE_POSITIONS[newLane];
            }
            break;
        }

        if (newLane !== prev.currentLane) {
          return { ...prev, currentLane: newLane, isMoving: true };
        }
        return prev;
      });
    };

    // Create wrapper functions for touch events
    const touchStartHandler = (e: globalThis.TouchEvent) => handleTouchStart(e);
    const touchEndHandler = (e: globalThis.TouchEvent) => handleTouchEnd(e);

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', touchStartHandler);
    window.addEventListener('touchend', touchEndHandler);

    return () => {
      window.addEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', touchStartHandler);
      window.removeEventListener('touchend', touchEndHandler);
      if (questionTimer.current) {
        clearTimeout(questionTimer.current);
      }
    };
  }, [gameState.isGameOver, gameState.isPlaying]); // Remove currentLane from dependencies

  // Add debug logging for game state changes
  useEffect(() => {
    debugLog('Game state updated:', {
      score: gameState.score,
      coinsCollected: gameState.coinsCollected,
      multiplier: gameState.multiplier,
      currentLane: gameState.currentLane,
      updateType: 'state-change',
      timestamp: performance.now()
    });
  }, [gameState.score, gameState.multiplier, gameState.currentLane, gameState.coinsCollected]);

  const handleCoinCollect = (id: number) => {
    debugLog(`handleCoinCollect execution started:`, {
      id,
      currentState: {
        coinsCollected: gameState.coinsCollected,
        score: gameState.score // Add score to debug output
      }
    });
    
    // Update ONLY coinsCollected, remove any score changes
    setGameState(prev => ({
      ...prev,
      coinsCollected: prev.coinsCollected + 1,
      // Do NOT modify score here
    }));
    
    debugLog('Coin collection completed:', {
      newCoinsCollected: gameState.coinsCollected + 1,
      score: gameState.score, // Add score to verify it's unchanged
      coinId: id
    });
  };

  // Add new function to handle game start
  const startGame = (mode: GameMode) => {
    setGameState({ 
      ...initialGameState,
      isPlaying: true,
      gameMode: mode,
    });
    if (mode === 'infinite') {
      showNextQuestion();
    }
  };

  // Add toggle pause function
  const togglePause = () => {
    if (gameState.isPlaying && !gameState.isGameOver) {
      setGameState(prev => ({ ...prev, isPaused: !prev.isPaused }));
    }
  };

  // Update keyboard controls to handle pause
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && gameState.isPlaying && !gameState.isGameOver) {
        togglePause();
      }
      // ...existing key handlers...
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState.isPlaying, gameState.isGameOver]);

  // Update the touch handler types
  const handleTouchStart = (e: globalThis.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchStartTime.current = performance.now();
  };

  const handleTouchEnd = (e: globalThis.TouchEvent) => {
    if (
      touchStartX.current === null || 
      touchStartY.current === null || 
      gameState.isGameOver
    ) {
      return;
    }

    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const touchEndTime = performance.now();

    // Calculate swipe distance and angle
    const deltaX = touchEndX - touchStartX.current;
    const deltaY = touchEndY - touchStartY.current;
    const swipeTime = touchEndTime - touchStartTime.current;

    // Only process quick swipes (within SWIPE_TIMEOUT)
    if (swipeTime > SWIPE_TIMEOUT) {
      return;
    }

    // Check if horizontal swipe (more horizontal than vertical movement)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Check if swipe is long enough
      if (Math.abs(deltaX) >= SWIPE_THRESHOLD) {
        const now = performance.now();
        const timeSinceLastSwitch = now - lastLaneSwitch.current;

        if (timeSinceLastSwitch < LANE_SWITCH_COOLDOWN) {
          return;
        }

        let newLane = gameState.currentLane;

        if (deltaX > 0 && gameState.currentLane < 2) {
          // Swipe right
          newLane = gameState.currentLane + 1;
        } else if (deltaX < 0 && gameState.currentLane > 0) {
          // Swipe left
          newLane = gameState.currentLane - 1;
        }

        if (newLane !== gameState.currentLane) {
          lastLaneSwitch.current = now;
          setGameState(prev => ({
            ...prev,
            currentLane: newLane,
          }));
          targetLanePosition.current = LANE_POSITIONS[newLane];
        }
      }
    }

    // Reset touch tracking
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const [isOracleActive, setIsOracleActive] = useState(false);
  const [previousQuestion, setPreviousQuestion] = useState<Question | null>(null);
  const [previousAnswer, setPreviousAnswer] = useState<number | undefined>();

  const toggleOracle = () => {
    if (gameState.isPlaying || isOracleActive) {
      setIsOracleActive(!isOracleActive);
      setGameState(prev => ({ 
        ...prev, 
        isPlaying: isOracleActive // Resume game if closing Oracle, pause if opening
      }));
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault(); // Prevent space from scrolling
        toggleOracle();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOracleActive]); // Add isOracleActive to dependencies

  // Update the SPAWN_INTERVAL to ensure obstacles spawn sufficiently far from options
  const SPAWN_INTERVAL = 50; // Increased from 40 to 50 to provide more spacing

  // Adjust initialZ to position obstacles away from options
  const obstacleInitialZ = -200; // Increased from -100 for better spacing

  // Add LoadingScreen component
  function LoadingScreen() {
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

  // Add new state for showing level map
  const [showLevelMap, setShowLevelMap] = useState(false);

  // Add level selection handler
  const handleLevelSelect = (levelId: number) => {
    setShowLevelMap(false);
    setGameState({
      ...initialGameState,
      isPlaying: true,
      gameMode: 'levels',
      currentLevel: levelId,
    });
    // TODO: Load level-specific questions and configuration
    showNextQuestion();
  };

  return (
    // Add touch-action CSS to prevent default touch behaviors
    <div className="w-full h-screen" style={{ touchAction: 'none' }} onTouchStart={(e: React.TouchEvent) => handleTouchStart(e.nativeEvent)} onTouchEnd={(e: React.TouchEvent) => handleTouchEnd(e.nativeEvent)}>
      {/* Game Menu */}
      {!gameState.isPlaying && !showLevelMap && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-30"
          style={{
            backgroundImage: `url(${process.env.PUBLIC_URL}/images/background.jpg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="flex flex-col items-center gap-8">
            {/* Title */}
            <div className="bg-[#4A63B4] px-12 py-6 rounded-lg shadow-lg border-2 border-white">
              <h1 className="text-4xl font-bold text-white">Road Sign Rush</h1>
            </div>
            
            {/* Game Mode Buttons */}
            <div className="flex flex-col gap-4">
              <button
                onClick={() => startGame('infinite')}
                className="bg-[#333333] hover:bg-[#444444] text-white px-8 py-3 
                         rounded-lg font-bold text-xl transition-colors flex items-center gap-4
                         shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M8 5v14l11-7z"/>
                </svg>
                Infinite Mode
              </button>
              
              <button
                onClick={() => setShowLevelMap(true)}
                className="bg-[#4A63B4] hover:bg-[#5A73C4] text-white px-8 py-3 
                         rounded-lg font-bold text-xl transition-colors flex items-center gap-4
                         shadow-lg"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                  <path d="M3 5v14h18V5H3zm16 12H5V7h14v10z"/>
                  <path d="M8.5 11.5l2.5 3 3.5-4.5 4.5 6H5z"/>
                </svg>
                Levels Mode
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Level Selection Screen */}
      {showLevelMap && (
        <LevelMap
          onSelectLevel={handleLevelSelect}
          onBack={() => setShowLevelMap(false)}
        />
      )}

      {/* Oracle Feedback Modal */}
      {gameState.oracleMode && gameState.oracleFeedback && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="absolute inset-0 flex items-center justify-center z-25 pointer-events-none"
        >
          <div className="bg-gradient-to-b from-purple-600/90 to-indigo-900/90 p-6 rounded-lg 
                        shadow-2xl max-w-md text-white backdrop-blur-sm border border-purple-400/30">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-purple-400/20 flex items-center justify-center">
                  <span className="text-2xl">🔮</span>
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Oracle's Wisdom</h3>
                <p className="text-purple-100 mb-4">
                  {gameState.oracleFeedback?.message || ''}
                </p>
                <div className="text-sm text-purple-200 italic">
                  "Learn from this wisdom, and your journey shall improve."
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Game UI Overlay */}
      <div className={`absolute top-0 left-0 w-full p-4 z-10 ${isMobile ? 'pt-24' : ''}`}> {/* Added conditional padding-top for mobile */}
        {/* Score display */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {/* Score text */}
          <div className="flex items-center gap-2">
            <span className="text-black text-2xl font-semibold">Score: {gameState.score}</span>
          </div>
          
          {/* Fuel display with text */}
          <div className="flex items-center gap-2">
            <span className="text-black text-2xl">Fuel:</span>
            {Array.from({ length: 3 }).map((_, i) => (
              <FuelIcon 
                key={i} 
                depleted={i >= gameState.lives}
              />
            ))}
          </div>
        </div>

        {/* Question display with background and truss */}
        {(gameState.currentQuestion || gameState.showingCorrectAnswer) && (
          <>
            <div className="relative max-w-4xl mx-auto">
              <div className="bg-[#3B50A1] border-4 border-white text-white p-4 rounded-lg">
                <div className="mt-4 flex flex-col items-center">
                  {gameState.showingCorrectAnswer ? (
                    <div className="flex flex-col items-center gap-4">
                      <p className="text-xl text-center">The correct answer was:</p>
                      <img 
                        src={gameState.currentQuestion?.options[gameState.currentQuestion.correctAnswer]} 
                        alt="Correct answer"
                        className="w-32 h-32 object-contain border-2 border-white rounded-lg"
                      />
                    </div>
                  ) : (
                    <p className="text-xl mb-4 text-center max-w-2xl">
                      {gameState.currentQuestion?.text}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {/* Full-width truss pattern with connecting vertical lines */}
            <div className="absolute left-0 right-0 h-16"> {/* Increased height to accommodate vertical lines */}
              <svg 
                className="w-full h-full"
                viewBox="0 0 1920 64" // Increased viewBox height
                preserveAspectRatio="none"
              >
                {/* Vertical connecting lines - we'll add 4 evenly spaced lines */}
                <line x1="480" y1="0" x2="480" y2="16" stroke="#666" strokeWidth="3"/>
                <line x1="800" y1="0" x2="800" y2="16" stroke="#666" strokeWidth="3"/>
                <line x1="1120" y1="0" x2="1120" y2="16" stroke="#666" strokeWidth="3"/>
                <line x1="1440" y1="0" x2="1440" y2="16" stroke="#666" strokeWidth="3"/>

                {/* Truss pattern - moved down by 16 units */}
                <g transform="translate(0, 16)">
                  {/* Top horizontal line */}
                  <line x1="0" y1="0" x2="1920" y2="0" stroke="#666" strokeWidth="3"/>
                  {/* Bottom horizontal line */}
                  <line x1="0" y1="48" x2="1920" y2="48" stroke="#666" strokeWidth="3"/>
                  
                  {/* Generate zigzag pattern */}
                  {Array.from({ length: 24 }).map((_, i) => {
                    const x = i * 80;
                    return (
                      <g key={i}>
                        <line 
                          x1={x} y1="48" 
                          x2={x + 40} y2="0" 
                          stroke="#666" 
                          strokeWidth="3"
                        />
                        <line 
                          x1={x + 40} y1="0" 
                          x2={x + 80} y2="48" 
                          stroke="#666" 
                          strokeWidth="3"
                        />
                        <line 
                          x1={x} y1="0" 
                          x2={x} y2="48" 
                          stroke="#666" 
                          strokeWidth="3"
                        />
                      </g>
                    );
                  })}
                  <line x1="1920" y1="0" x2="1920" y2="48" stroke="#666" strokeWidth="3"/>
                </g>
              </svg>
            </div>
          </>
        )}
      </div>

      {/* Game Over Screen */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-lg text-center"
          >
            <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
            <button
              onClick={() => {
                // Reset game state - using initialGameState to ensure all properties are included
                setGameState({
                  ...initialGameState,
                  isPlaying: true,
                  isPaused: false
                });
                showNextQuestion();
              }}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Play Again
            </button>
          </motion.div>
        </div>
      )}

      {/* Add pause overlay */}
      {gameState.isPaused && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/50">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-lg text-center"
          >
            <h2 className="text-3xl font-bold mb-4">Game Paused</h2>
            <button
              onClick={togglePause}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Resume Game
            </button>
          </motion.div>
        </div>
      )}

      {/* 3D Game Scene */}
      <Canvas shadows>
        <Suspense fallback={<LoadingScreen />}>
          <PerspectiveCamera 
            makeDefault 
            position={isMobile ? [0, 6, 22] : [0, 5, 10]} 
            fov={isMobile ? 60 : 75}
          />
          
          {/* Add Sky and Stars */}
          <Sky 
            distance={450000}
            sunPosition={[0, 1, 0]}
            inclination={0.5}
            azimuth={0.25}
          />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade />
          
          {/* Enhanced lighting */}
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <hemisphereLight color="#b1e1ff" groundColor="#000000" intensity={0.5} />
          
          <Physics paused={!gameState.isPlaying || gameState.isPaused}>
            <Road />
            {gameState.isPlaying && (
              <>
                <PlayerCar 
                  position={[LANE_POSITIONS[gameState.currentLane], 1.0, 0]}
                  targetPosition={targetLanePosition.current}
                  handleCoinCollect={handleCoinCollect}
                />
                <MovingLaneDividers gameState={gameState} />
                {Array.from({ length: NUM_OBSTACLES }).map((_, index) => (
                  <TrafficObstacle 
                    key={index}
                    index={index}
                    gameState={gameState}
                    setGameState={setGameState}
                    onRespawn={() => {}}
                    initialZ={obstacleInitialZ}
                  />
                ))}
                {/* Only show options when not showing correct answer */}
                {gameState.currentQuestion && !gameState.showingCorrectAnswer && (
                  <MovingAnswerOptions 
                    question={gameState.currentQuestion}
                    onCollision={handleCollision}
                    gameState={gameState}
                  />
                )}
              </>
            )}
          </Physics>
        </Suspense>
      </Canvas>

      {/* Add PauseButton next to Oracle button */}
      {gameState.isPlaying && !gameState.isGameOver && (
        <PauseButton 
          isPaused={gameState.isPaused} 
          onClick={togglePause}
        />
      )}

      {/* Add Oracle Button */}
      <OracleButton 
        onClick={toggleOracle}
        isActive={isOracleActive}
      />

      {/* Add Oracle Modal */}
      <OracleModal
        isOpen={isOracleActive}
        onClose={toggleOracle}
        question={previousQuestion}
        previousAnswer={previousAnswer}
      />
    </div>
  );
}



