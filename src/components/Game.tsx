import { Canvas } from '@react-three/fiber';
import { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Physics } from '@react-three/rapier';
import { PerspectiveCamera, useGLTF, Sky, Stars } from '@react-three/drei';
import { questions, getOptionsForQuestion, getLevelQuestions } from '../data/questions';
import { LANE_SWITCH_COOLDOWN, SAFE_ZONE_AFTER, SAFE_ZONE_BEFORE } from '../constants/game';
import { GameState, Question, GameMode } from '../types/game'; // Import Question and GameMode types
import { OracleButton, OracleModal } from './Oracle';
import { TrafficObstacle, NUM_OBSTACLES } from './TrafficObstacle';
import { FuelIcon } from './FuelIcon';
import { LevelMap } from './LevelMap';
import { Road } from './Road';
import { PlayerCar } from './PlayerCar';
import {MovingAnswerOptions} from './MovingAnswerOptions';
import { MovingLaneDividers } from './MovingLaneDividers';
import { PauseButton } from './PauseButton';
import { LoadingScreen } from './LoadingScreen';
import { saveLevelProgress } from '../utils/storage';
import { SignIndex } from './SignIndex';

// Add debug logging utility
const DEBUG = true;
const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
  }
};

// Add this near the top of the file, after other constants
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger lane change
const SWIPE_TIMEOUT = 300; // Maximum time in ms for a swipe
const MAX_SPEED = 3; // Maximum possible speed in the game

export const LANE_POSITIONS = [-5, 0, 5]; // Make sure these match your desired positions

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
  gameMode: null as GameMode | null,  // Explicitly type this as GameMode | null
  currentLevel: 0,
  levelQuestions: [], // Add this new property
  askedQuestions: new Set<number>(), // Add this new property
  activeOptionZones: [], // Add this new property to track active option zones
  questionsAnswered: 0,  // Add this new property
};

export default function Game() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);

  const [targetLanePosition, setTargetLanePosition] = useState<number>(
    LANE_POSITIONS[gameState.currentLane]
  );

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
    // Create a local variable for the gameMode with proper type guard
    const isLevelMode = gameState.gameMode === 'levels';
    
    // IMPORTANT: Only use levelQuestions if in level mode, otherwise use all questions
    let availableQuestions = isLevelMode 
      ? [...gameState.levelQuestions] // Create a copy to avoid mutations
      : [...questions];

    if (availableQuestions.length === 0) {
      return;
    }

    // Filter out sign groups that have all questions asked
    availableQuestions = availableQuestions.filter(signGroup => {
      // Check if any question in this sign group hasn't been asked yet
      return signGroup.questions.some(q => !gameState.askedQuestions.has(q.id));
    });

    if (availableQuestions.length === 0) {
      if (isLevelMode) {
        setGameState(prev => ({
          ...prev,
          isGameOver: true
        }));
        return;
      }
      // Reset asked questions if in infinite mode
      setGameState(prev => ({
        ...prev,
        askedQuestions: new Set()
      }));
      availableQuestions = isLevelMode
        ? [...gameState.levelQuestions]
        : [...questions];
    }

    // Log available questions for debugging

    // Select a random sign group from available questions
    const signGroup = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    
    // Get questions from this sign group that haven't been asked yet
    const availableSignQuestions = signGroup.questions.filter(q => 
      !gameState.askedQuestions.has(q.id)
    );
    
    const baseQuestion = availableSignQuestions[Math.floor(Math.random() * availableSignQuestions.length)];
    const options = getOptionsForQuestion(signGroup.signPath);
    
    const question = {
      ...baseQuestion,
      signPath: signGroup.signPath,
      options: options,
      correctAnswer: 0,
      oracleHelp: signGroup.oracleHelp
    };
    
    // Define the safe zone based on the question's position
    const optionZPosition = 0;
    const newSafeZone = {
      start: optionZPosition - SAFE_ZONE_BEFORE,
      end: optionZPosition + SAFE_ZONE_AFTER,
    };

    setGameState(prev => ({
      ...prev,
      currentQuestion: question,
      askedQuestions: new Set([...Array.from(prev.askedQuestions), question.id]),
      activeOptionZones: [newSafeZone],
    }));
  };

  const handleCollision = (isCorrect: boolean) => {
    // Store the previous question and answer before updating state
    if (gameState.currentQuestion) {
      setPreviousQuestion(gameState.currentQuestion);
      setPreviousAnswer(gameState.currentLane);
    }

    setGameState(prev => ({
      ...prev,
      questionsAnswered: prev.questionsAnswered + 1  // Increment questions answered
    }));

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

        // Show the green flash effect
        setShowCorrectAnswerFlash(true);

        setGameState(prev => {
          const newConsecutiveCorrect = prev.consecutiveCorrect + 1;
          const speedIncrease = Math.floor(newConsecutiveCorrect / 3);
          const newSpeed = 1 + (speedIncrease * 0.5);
          
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

        // Hide the flash effect after 1.5 seconds
        setTimeout(() => {
          setShowCorrectAnswerFlash(false);
        }, 1500);

        setTimeout(showNextQuestion, 200);
      } else {
        debugLog('Wrong answer in normal mode', {
          currentLives: gameState.lives,
          newLives: gameState.lives - 1
        });

        // Show the correct answer and flash effect
        setShowWrongAnswerFlash(true);
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

        // Hide the flash effect after 1.5 seconds instead of 500ms
        setTimeout(() => {
          setShowWrongAnswerFlash(false);
        }, 1500);

        // Hide the correct answer and show next question after delay
        setTimeout(() => {
          setGameState(prev => ({
            ...prev,
            showingCorrectAnswer: false
          }));
          showNextQuestion();
        }, 3000);
      }
    }
  };

  // Update keyboard controls with debugging
  const [targetLane, setTargetLane] = useState<number | null>(null);

  // Add a ref to keep track of the latest currentLane
  const currentLaneRef = useRef<number>(gameState.currentLane);

  // Update the ref whenever currentLane changes
  useEffect(() => {
    currentLaneRef.current = gameState.currentLane; // Debug log
  }, [gameState.currentLane]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState.isGameOver || !gameState.isPlaying) return;

      const now = performance.now();
      const timeSinceLastSwitch = now - lastLaneSwitch.current;
      
      if (timeSinceLastSwitch < LANE_SWITCH_COOLDOWN) return;

      // Determine the base lane: use targetLane if a lane change is in progress
      const baseLane = targetLane !== null ? targetLane : currentLaneRef.current;

      switch (e.key) {
        case 'ArrowLeft':
          if (baseLane > 0) {
            const newLane = baseLane - 1;
            setTargetLane(newLane);
            setTargetLanePosition(LANE_POSITIONS[newLane]); // Update targetLanePosition via state
            lastLaneSwitch.current = now; // Debug log
          }
          break;
        case 'ArrowRight':
          if (baseLane < LANE_POSITIONS.length - 1) {
            const newLane = baseLane + 1;
            setTargetLane(newLane);
            setTargetLanePosition(LANE_POSITIONS[newLane]); // Update targetLanePosition via state
            lastLaneSwitch.current = now; // Debug log
          }
          break;
      }
    };

    // Modify the touchEndHandler similarly
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

          // Determine the base lane: use targetLane if a lane change is in progress
          const baseLane = targetLane !== null ? targetLane : currentLaneRef.current;

          let newLane = baseLane;

          if (deltaX > 0 && baseLane < 2) {
            // Swipe right
            newLane = baseLane + 1;
          } else if (deltaX < 0 && baseLane > 0) {
            // Swipe left
            newLane = baseLane - 1;
          }

          if (newLane !== baseLane) {
            setTargetLane(newLane);
            setTargetLanePosition(LANE_POSITIONS[newLane]); // Update targetLanePosition via state
            lastLaneSwitch.current = now; // Debug log
          }
        }
      }

      // Reset touch tracking
      touchStartX.current = null;
      touchStartY.current = null;
    };

    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
      if (questionTimer.current) {
        clearTimeout(questionTimer.current);
      }
    };
  }, [gameState.isGameOver, gameState.isPlaying, targetLane]); // Added targetLane to dependencies

  // Define a callback for when lane change is complete
  const onLaneChangeComplete = () => {
    if (targetLane !== null) { // Debug log
      setGameState(prev => ({
        ...prev,
        currentLane: targetLane,
        isMoving: false
      }));
      setTargetLane(null);
    }
  };

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
    setGameState(prev => ({ 
      ...initialGameState,
      isPlaying: true,
      gameMode: mode,
    }));
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
          setTargetLanePosition(LANE_POSITIONS[newLane]);
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

  // Add new state for showing level map
  const [showLevelMap, setShowLevelMap] = useState(false);

  // Add level selection handler
  const handleLevelSelect = (levelId: number) => {
    const levelQuestions = getLevelQuestions(levelId);
    
    setShowLevelMap(false); // Hide the level map first
    
    // Reset game state completely
    setGameState(prev => ({
      ...initialGameState,
      isPlaying: true,
      gameMode: 'levels',
      currentLevel: levelId,
      levelQuestions: levelQuestions,
      askedQuestions: new Set() // Make sure to reset asked questions
    }));
  };

  // Add this new effect to handle game initialization
  useEffect(() => {
    // Only initialize if we're in playing state and have a game mode set
    if (gameState.isPlaying && gameState.gameMode) {
      
      // Small delay to ensure state is properly updated
      const timer = setTimeout(() => {
        showNextQuestion();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [gameState.isPlaying, gameState.gameMode]); // Dependencies

  useEffect(() => {
    if (gameState.isGameOver && gameState.gameMode === 'levels') {
      // Save progress when game ends
      saveLevelProgress(gameState.currentLevel, {
        highScore: gameState.score,
        remainingLives: gameState.lives,
        completed: gameState.lives > 0, // Consider level completed if player didn't lose all lives
        lastPlayed: new Date().toISOString()
      });
    }
  }, [gameState.isGameOver]);

  // Add this near the top with other state declarations
  const [showWrongAnswerFlash, setShowWrongAnswerFlash] = useState(false);
  const [showCorrectAnswerFlash, setShowCorrectAnswerFlash] = useState(false);

  const [showSignIndex, setShowSignIndex] = useState(false);

  // Move getGameOverMessage inside the Game component
  const getGameOverMessage = (gameState: GameState) => {
    if (gameState.gameMode === 'levels') {
      if (gameState.lives > 0) {
        return {
          title: "Level Complete! 🎉",
          message: `You scored ${gameState.score} points!`,
          buttons: [
            {
              text: "Next Level",
              action: () => {
                // Instead of starting next level directly, show the level map
                setGameState({
                  ...initialGameState,
                  isPlaying: false,
                  gameMode: null
                });
                setShowLevelMap(true); // Show the level map
              },
              className: "bg-green-500 hover:bg-green-600 text-white"
            },
            {
              text: "Main Menu",
              action: () => {
                setGameState({
                  ...initialGameState,
                  isPlaying: false,
                  gameMode: null
                });
              },
              className: "border-2 border-gray-300 hover:bg-gray-100"
            }
          ]
        };
      } else {
        return {
          title: "Level Failed",
          message: "Keep practicing! You'll get better!",
          buttons: [
            {
              text: "Try Again",
              action: () => {
                // Replay current level
                const levelQuestions = getLevelQuestions(gameState.currentLevel);
                setGameState({
                  ...initialGameState,
                  isPlaying: true,
                  isPaused: false,
                  gameMode: 'levels',
                  currentLevel: gameState.currentLevel,
                  levelQuestions: levelQuestions
                });
                showNextQuestion();
              },
              className: "bg-blue-500 hover:bg-blue-600 text-white"
            },
            {
              text: "Main Menu",
              action: () => {
                setGameState({
                  ...initialGameState,
                  isPlaying: false,
                  gameMode: null
                });
              },
              className: "border-2 border-gray-300 hover:bg-gray-100"
            }
          ]
        };
      }
    } else { // infinite mode
      return {
        title: "Game Over",
        message: `Final Score: ${gameState.score}`,
        buttons: [
          {
            text: "Play Again",
            action: () => {
              setGameState({
                ...initialGameState,
                isPlaying: true,
                gameMode: 'infinite'
              });
              showNextQuestion();
            },
            className: "bg-blue-500 hover:bg-blue-600 text-white"
          }
        ]
      };
    }
  };

  return (
    // Add touch-action CSS to prevent default touch behaviors
    <div className="w-full h-screen" style={{ touchAction: 'none' }} onTouchStart={(e: React.TouchEvent) => handleTouchStart(e.nativeEvent)} onTouchEnd={(e: React.TouchEvent) => handleTouchEnd(e.nativeEvent)}>
      {/* Wrong Answer Flash Effect */}
      {showWrongAnswerFlash && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-red-500/70 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-red-500/70 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-500/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-red-500/70 to-transparent" />
        </div>
      )}
      {/* Correct Answer Flash Effect */}
      {showCorrectAnswerFlash && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-green-500/70 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-green-500/70 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-green-500/70 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-green-500/70 to-transparent" />
        </div>
      )}
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
          {/* Sign Index Button - Positioned absolutely in top left */}
          <div className="absolute top-4 left-4">
            <button
              onClick={() => setShowSignIndex(true)}
              className="bg-[#505050] hover:bg-[#505050] text-white px-4 py-2 
                         rounded-lg transition-colors flex items-center gap-2 shadow-md"
            >
               📖 Sign Index 📖
            </button>
          </div>

          {/* Centered Menu Content */}
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

        {/* Repositioned speedometer */}
        {gameState.isPlaying && (
          <div className="absolute right-32 top-1/4 transform -translate-y-1/2 z-20">
            <div className="bg-black/80 rounded-lg p-3 backdrop-blur-sm border border-white/20 flex flex-col items-center">
              <span className="text-white text-xs mb-1">SPEED</span>
              {/* Speedometer bar - made slightly smaller */}
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all duration-300"
                  style={{ 
                    width: `${(gameState.speed / MAX_SPEED) * 100}%`,
                  }}
                />
              </div>
              {/* Speed multiplier text */}
              <span className="text-white text-sm mt-1 font-bold">
                {gameState.speed.toFixed(1)}x
              </span>
              {/* Speed indicator arrows */}
              <div className="flex gap-1 mt-0.5">
                {Array.from({ length: Math.floor((gameState.speed - 1) * 2) }).map((_, i) => (
                  <svg 
                    key={i}
                    className="w-2 h-2 text-yellow-500 animate-pulse"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Game Over Screen */}
      {gameState.isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-lg text-center max-w-md w-full mx-4"
          >
            <h2 className={`text-3xl font-bold mb-2 ${
              gameState.gameMode === 'levels' && gameState.lives > 0 
                ? 'text-green-600' 
                : gameState.gameMode === 'levels' 
                  ? 'text-red-600'
                  : 'text-gray-900'
            }`}>
              {getGameOverMessage(gameState).title}
            </h2>
            <p className="text-gray-700 text-xl mb-6">
              {getGameOverMessage(gameState).message}
            </p>
            <div className="flex flex-col gap-3">
              {getGameOverMessage(gameState).buttons.map((button, index) => (
                <button
                  key={index}
                  onClick={button.action}
                  className={`px-6 py-3 rounded-lg font-semibold transition-colors ${button.className}`}
                >
                  {button.text}
                </button>
              ))}
            </div>
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
                  targetPosition={targetLanePosition}
                  handleCoinCollect={handleCoinCollect}
                  onLaneChangeComplete={onLaneChangeComplete} // Passed callback prop
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
                    activeOptionZones={gameState.activeOptionZones} // Pass activeOptionZones
                  />
                ))}
                {/* Only show options when not showing correct answer */}
                {gameState.currentQuestion && !gameState.showingCorrectAnswer && (
                  <MovingAnswerOptions 
                    question={gameState.currentQuestion}
                    onCollision={handleCollision}
                    gameState={gameState}
                    targetLane={targetLane}
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

      {/* Add Oracle Button - only show during gameplay */}
      {gameState.isPlaying && !gameState.isGameOver && (
        <OracleButton 
          onClick={toggleOracle}
          isActive={isOracleActive}
          disabled={gameState.questionsAnswered === 0}
        />
      )}

      {/* Add Oracle Modal */}
      <OracleModal
        isOpen={isOracleActive}
        onClose={toggleOracle}
        question={previousQuestion}
        previousAnswer={previousAnswer}
      />

      {showSignIndex && (
        <SignIndex onBack={() => setShowSignIndex(false)} />
      )}
    </div>
  );
}



