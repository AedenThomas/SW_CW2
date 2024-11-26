import React from 'react';
import { Canvas } from '@react-three/fiber';
import { useState, useEffect, useRef, Suspense } from 'react';
import { motion } from 'framer-motion';
import { Physics } from '@react-three/rapier';
import { PerspectiveCamera, useGLTF, Sky, Stars, Html } from '@react-three/drei';
import { questions, getOptionsForQuestion, getLevelQuestions } from '../data/questions';
import { LANE_SWITCH_COOLDOWN, SAFE_ZONE_AFTER, SAFE_ZONE_BEFORE, initialZ, LANE_POSITIONS } from '../constants/game';
import { GameState, Question, GameMode } from '../types/game'; // Import Question and GameMode types
import { OracleButton, OracleModal } from './Oracle';
import { TrafficObstacle, NUM_OBSTACLES } from './TrafficObstacle';
import { FuelIcon } from './FuelIcon';
import { LevelMap } from './LevelMap';
import { Road } from './Road';
import { PlayerCar } from './PlayerCar';
import { MovingAnswerOptions } from './MovingAnswerOptions';
import { MovingLaneDividers } from './MovingLaneDividers';
import { PauseButton } from './PauseButton';
import { LoadingScreen } from './LoadingScreen';
import { saveLevelProgress } from '../utils/storage';
import { SignIndex } from './SignIndex';
import { LevelProgressMap } from '../types/game';
import { getAllLevelProgress } from '../utils/storage';
import Coins from './Coins';
import { Scenery } from './Scenery';
import * as THREE from 'three';

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
  targetLane: null,
  coinsScore: 0,  // Add this new property
};

// Add this helper function near the top of the file
const isInfiniteModeUnlocked = (levelProgress: LevelProgressMap): boolean => {
  return levelProgress[1]?.completed ?? false;
};

// Update the color constants
const SKY_COLOR_TOP = 'rgba(54, 185, 233, 1)';     // #36B9E9
const SKY_COLOR_BOTTOM = 'rgba(142, 226, 233, 1)'; // #8EE2E9
// const SKY_COLOR_TOP = 'rgba(142, 226, 233, 1)'; // #8EE2E9
// const SKY_COLOR_BOTTOM = 'rgba(54, 185, 233, 1)'; // #36B9E9
const GROUND_COLOR_TOP = 'rgba(56, 118, 40, 1)';   // Green (#387628)
const GROUND_COLOR_BOTTOM = 'rgba(86, 162, 50, 1)'; 
// const GROUND_COLOR_BOTTOM = 'rgba(255, 0, 0, 1)';   // Red (#FF0000)  

// Add this new constant near the top of the file
const MAX_SPEED_ANGLE = 180; // Maximum angle for the speedometer needle

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
          const newSpeed = 1 + (speedIncrease * 0.2);
          
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

        // Show the wrong answer flash effect
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

        // Hide the flash effect after 1.5 seconds
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
            setTargetLanePosition(LANE_POSITIONS[newLane]);
            setGameState(prev => ({
              ...prev,
              targetLane: newLane
            }));
            lastLaneSwitch.current = now;
          }
          break;
        case 'ArrowRight':
          if (baseLane < LANE_POSITIONS.length - 1) {
            const newLane = baseLane + 1;
            setTargetLane(newLane);
            setTargetLanePosition(LANE_POSITIONS[newLane]);
            setGameState(prev => ({
              ...prev,
              targetLane: newLane
            }));
            lastLaneSwitch.current = now;
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
    if (targetLane !== null) {
      setGameState(prev => ({
        ...prev,
        currentLane: targetLane,
        targetLane: null,
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
    debugLog('Collecting coin', {
      coinId: id,
      lane: getLaneFromId(id),
      currentCoins: gameState.coinsCollected,
    });
    
    setGameState(prev => ({
      ...prev,
      coinsCollected: prev.coinsCollected + 1,
      coinsScore: prev.coinsScore + 1, // Changed from +10 to +1
    }));
  };

  // Helper function to determine lane from coin ID
  const getLaneFromId = (id: number): number => {
    return Math.floor(id / 10000);
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
        isPaused: !isOracleActive // Pause game when oracle is active
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
      if (gameState.lives > 0 && gameState.questionsAnswered > 0) {
        return {
          title: "Level Complete! 🎉",
          message: `You scored ${gameState.score} points!`,
          buttons: [
            {
              text: "Next Level",
              action: () => {
                setGameState({
                  ...initialGameState,
                  isPlaying: false,
                  gameMode: null
                });
                setShowLevelMap(true);
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
                // Get fresh questions for the level
                const levelQuestions = getLevelQuestions(gameState.currentLevel);
                
                // Reset game state with the new questions
                setGameState(prev => ({
                  ...initialGameState,
                  isPlaying: true,
                  isPaused: false,
                  gameMode: 'levels',
                  currentLevel: prev.currentLevel,
                  levelQuestions: levelQuestions,
                  askedQuestions: new Set(), // Reset asked questions
                  isGameOver: false
                }));

                // Small delay to ensure state is updated before showing first question
                setTimeout(() => {
                  showNextQuestion();
                }, 100);
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

  // In the Game component, add this state
  const [levelProgress, setLevelProgress] = useState<LevelProgressMap>({});

  // Add this useEffect to load level progress
  useEffect(() => {
    setLevelProgress(getAllLevelProgress());
  }, []);

  // Add new state for obstacle collision flash
  const [showObstacleCollisionFlash, setShowObstacleCollisionFlash] = useState(false);

  // Add this state to manage multiple Z positions for coin groups
  const [coinGroups, setCoinGroups] = useState<number[]>([]);

  // Function to spawn a new group of coins
  const spawnCoinGroup = () => {
    const lastGroupZ = coinGroups.length > 0 ? coinGroups[coinGroups.length - 1] : initialZ;
    const newGroupZ = lastGroupZ - 200; // Adjust spacing as needed
    setCoinGroups(prev => [...prev, newGroupZ]);
  };

  // Initialize coin groups
  useEffect(() => {
    const initialGroups = Array.from({ length: 10 }).map((_, index) => initialZ - index * 200);
    setCoinGroups(initialGroups);
  }, [initialZ]);

  // Periodically spawn new coin groups
  useEffect(() => {
    const interval = setInterval(() => {
      spawnCoinGroup();
    }, 5000); // Spawn every 5 seconds, adjust as needed

    return () => clearInterval(interval);
  }, [coinGroups]);

  const newLocal = `
                uniform vec3 colorTop;
                uniform vec3 colorBottom;
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                  // Adjust transition to visible ground area
                  // Start green from the horizon (where ground meets sky)
                  // Transition to red at 80% of the visible ground area
                  float t = smoothstep(50.0, 150.0, vPosition.y);
                  vec3 color = mix(colorTop, colorBottom, t);
                  gl_FragColor = vec4(color, 1.0);
                }
              `;
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
      
      {/* Obstacle Collision Flash Effect - 25% less intense */}
      {showObstacleCollisionFlash && (
        <div className="absolute inset-0 pointer-events-none z-50">
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-red-500/50 to-transparent" />
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-red-500/50 to-transparent" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-500/50 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-red-500/50 to-transparent" />
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
              <div className="relative group">
                <button
                  onClick={() => startGame('infinite')}
                  disabled={!isInfiniteModeUnlocked(levelProgress)}
                  className={`w-full bg-[#333333] px-8 py-3 rounded-lg font-bold text-xl 
                           flex items-center justify-center gap-4 shadow-lg transition-all duration-300
                           ${isInfiniteModeUnlocked(levelProgress) 
                             ? 'hover:bg-[#444444] text-white hover:shadow-xl transform hover:-translate-y-0.5' 
                             : 'bg-[#2A2A2A] cursor-not-allowed text-gray-400'}`}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                  Infinite Mode
                  {!isInfiniteModeUnlocked(levelProgress) && (
                    <svg 
                      className="w-6 h-6 ml-2" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 15v2m0 0v2m0-2h2m-2 0H8m4-6V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h8a2 2 0 002-2v-3" 
                      />
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M15 11h3m0 0h3m-3 0v3m0-3V8" 
                      />
                    </svg>
                  )}
                </button>

                {/* Hover tooltip for locked state */}
                {!isInfiniteModeUnlocked(levelProgress) && (
                  <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 
                                group-hover:opacity-100 transition-all duration-300 pointer-events-none">
                    <div className="bg-[#1A1A1A] text-white px-4 py-2 rounded-lg shadow-xl 
                                  flex items-center gap-2 whitespace-nowrap">
                      <svg 
                        className="w-5 h-5 text-yellow-500" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth={2} 
                          d="M12 15v2m0 0v2m0-2h2m-2 0H8m4-6V4a2 2 0 00-2-2H6a2 2 0 00-2 2v16a2 2 0 002 2h8a2 2 0 002-2v-3" 
                        />
                      </svg>
                      <span className="font-medium">Complete Level 3 to unlock</span>
                    </div>
                    {/* Arrow pointer */}
                    <div className="w-4 h-4 bg-[#1A1A1A] transform rotate-45 absolute -bottom-2 left-1/2 -translate-x-1/2" />
                  </div>
                )}
              </div>
              
              <button
                onClick={() => setShowLevelMap(true)}
                className="bg-[#4A63B4] hover:bg-[#5A73C4] text-white px-8 py-3 
                         rounded-lg font-bold text-xl transition-all duration-300 
                         flex items-center gap-4 shadow-lg hover:shadow-xl 
                         transform hover:-translate-y-0.5"
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
      <div className="absolute top-0 left-0 w-full p-4 z-20">
        {/* Score display */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {/* Score text */}
          <div className="flex items-center gap-2">
            <span className="text-black text-2xl font-semibold">Score: {gameState.score}</span>
          </div>
          
          {/* Coins Score display */}
          <div className="flex items-center gap-2">
            <span className="text-black text-2xl font-semibold">
              Coins: {gameState.coinsScore}
            </span>
          </div>
        </div>

        {/* Fuel display - adjusted positioning and added background for better visibility */}
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-white/80 px-3 py-1 rounded-lg">
          <span className="text-black text-2xl">Fuel:</span>
          <div className="flex gap-1">
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
            <div className="relative max-w-4xl mx-auto mt-16">
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

      {/* Speedometer - Now positioned independently at bottom left */}
      {gameState.isPlaying && (
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-black/80 p-4 rounded-lg backdrop-blur-sm border border-white/20">
            {/* Speedometer Gauge */}
            <div className="relative w-24 h-12">
              {/* Gauge Background with tick marks */}
              <div className="absolute inset-0 bg-gray-800 rounded-t-full overflow-hidden">
                {Array.from({ length: 11 }).map((_, i) => {
                  const angle = -90 + (i * (MAX_SPEED_ANGLE / 10));
                  const isMainTick = i % 2 === 0;
                  return (
                    <div
                      key={i}
                      className={`absolute bottom-0 left-1/2 origin-bottom ${isMainTick ? 'h-3 w-0.5' : 'h-2 w-0.5'}`}
                      style={{
                        background: 'white',
                        transform: `translateX(-50%) rotate(${angle}deg)`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Speed Value */}
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2">
                <div className="text-white text-lg font-bold">
                  {gameState.speed.toFixed(1)}x
                </div>
              </div>

              {/* Needle */}
              <div
                className="absolute bottom-0 left-1/2 w-[2px] h-[90%] bg-red-500 origin-bottom transition-transform duration-300"
                style={{
                  transform: `translateX(-50%) rotate(${((gameState.speed - 1) / (MAX_SPEED - 1)) * MAX_SPEED_ANGLE - 90}deg)`
                }}
              >
                <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
              </div>
            </div>

            {/* Speed Indicators */}
            <div className="flex justify-between px-1 mt-1">
              <span className="text-white text-[10px]">1.0x</span>
              <span className="text-white text-[10px]">3.0x</span>
            </div>

            {/* Speed Boost Indicators */}
            <div className="flex gap-1 mt-1 justify-center">
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
            <h2 className="text-3xl font-bold mb-6">Game Paused</h2>
            <div className="flex flex-col gap-4">
              <button
                onClick={togglePause}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Resume Game
              </button>
              <button
                onClick={() => {
                  setGameState({
                    ...initialGameState,
                    isPlaying: false,
                    gameMode: null
                  });
                }}
                className="border-2 border-gray-300 hover:bg-gray-100 px-6 py-3 rounded-lg font-semibold transition-colors"
              >
                Main Menu
              </button>
            </div>
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
          
          {/* Background gradient sky */}
          <mesh>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
              uniforms={{
                colorTop: { value: new THREE.Color(SKY_COLOR_TOP) },
                colorBottom: { value: new THREE.Color(SKY_COLOR_BOTTOM) }
              }}
              vertexShader={`
                varying vec2 vUv;
                void main() {
                  vUv = uv;
                  gl_Position = vec4(position.xy, 1.0, 1.0);
                }
              `}
              fragmentShader={`
                uniform vec3 colorTop;
                uniform vec3 colorBottom;
                varying vec2 vUv;
                void main() {
                  // Scale the UV coordinates to focus on top half of screen
                  float yCoord = (vUv.y - 0.5) * 2.0;
                  
                  // Wider transition range (0.2-0.8 instead of 0.45-0.55)
                  float startY = 0.2;
                  float endY = 0.8;
                  float t = smoothstep(startY, endY, yCoord);
                  
                  vec3 color = mix(colorBottom, colorTop, t);
                  gl_FragColor = vec4(color, 1.0);
                }
              `}
            />
          </mesh>

          {/* Ground with gradient */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
            <planeGeometry args={[1000, 1000]} />
            <shaderMaterial
              uniforms={{
                colorTop: { value: new THREE.Color(GROUND_COLOR_TOP) },
                colorBottom: { value: new THREE.Color(GROUND_COLOR_BOTTOM) }
              }}
              vertexShader={`
                varying vec2 vUv;
                varying vec3 vPosition;
                void main() {
                  vUv = uv;
                  vPosition = position;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `}
              fragmentShader={`
                uniform vec3 colorTop;
                uniform vec3 colorBottom;
                varying vec2 vUv;
                void main() {
                  // Adjusted for 50-50 split with smooth transition in the middle
                  float startY = 0.45;  // Start transition at 45%
                  float endY = 0.55;    // End transition at 55%
                  float t = smoothstep(startY, endY, vUv.y);
                  vec3 color = mix(colorBottom, colorTop, t);
                  gl_FragColor = vec4(color, 1.0);
                }
              `}
            />
          </mesh>

          {/* Enhanced lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <hemisphereLight 
            color={SKY_COLOR_TOP} 
            groundColor={GROUND_COLOR_BOTTOM} 
            intensity={0.8} 
          />
          
          <Physics paused={!gameState.isPlaying || gameState.isPaused || gameState.isGameOver}>
            {/* Adjusted Y position to align perfectly with ground */}
            <group position={[0, 0, 0]}>
              {/* Road is now positioned slightly above ground to prevent z-fighting */}
              <Road />
              <Scenery 
                speed={gameState.speed} 
                isPaused={gameState.isPaused || gameState.isGameOver}
              />
              {gameState.isPlaying && !gameState.isGameOver && (
                <>
                  <PlayerCar 
                    position={[LANE_POSITIONS[gameState.currentLane], 1.0, 0]}
                    targetPosition={targetLanePosition}
                    handleCoinCollect={handleCoinCollect}
                    onLaneChangeComplete={onLaneChangeComplete}
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
                      activeOptionZones={gameState.activeOptionZones}
                      setShowObstacleCollisionFlash={setShowObstacleCollisionFlash}
                    />
                  ))}

                  {/* {{ edit_2 }} Render Coins in synchronized groups across all lanes */}
                  {gameState.gameMode === 'infinite' && (
                    <>
                      {coinGroups.map((groupZ, groupIndex) => (
                        <React.Fragment key={`coin-group-${groupIndex}`}>
                          {LANE_POSITIONS.map((position, laneIndex) => (
                            <Coins 
                              key={`coin-${laneIndex}-${groupIndex}`}
                              lane={laneIndex}
                              startingZ={groupZ} // {{ edit_3 }} Pass starting Z position
                              gameState={gameState} 
                              onCollect={handleCoinCollect} 
                            />
                          ))}
                        </React.Fragment>
                      ))}
                    </>
                  )}

                  {gameState.currentQuestion && !gameState.showingCorrectAnswer && (
                    <MovingAnswerOptions 
                      question={gameState.currentQuestion}
                      onCollision={handleCollision}
                      gameState={gameState}
                    />
                  )}
                </>
              )}
            </group>
          </Physics>
        </Suspense>
      </Canvas>

      {/* Update the Oracle and Pause button positioning */}
      {gameState.isPlaying && !gameState.isGameOver && (
        <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
          <PauseButton 
            isPaused={gameState.isPaused} 
            onClick={togglePause}
            disabled={isOracleActive}
          />
          <OracleButton 
            onClick={toggleOracle}
            isActive={isOracleActive}
            disabled={gameState.questionsAnswered === 0}
          />
        </div>
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



