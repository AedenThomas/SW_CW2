import React from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  useState,
  useEffect,
  useRef,
  Suspense,
  useCallback,
  useMemo,
} from "react";
import { motion } from "framer-motion";
import { Physics } from "@react-three/rapier";
import {
  PerspectiveCamera,
  useGLTF,
  Sky,
  Stars,
  Html,
} from "@react-three/drei";
import {
  questions,
  getOptionsForQuestion,
  getLevelQuestions,
  initializeQuestions,
} from "../data/questions";
import {
  LANE_SWITCH_COOLDOWN,
  SAFE_ZONE_AFTER,
  SAFE_ZONE_BEFORE,
  initialZ,
  LANE_POSITIONS,
} from "../constants/game";
import { GameState, Question, GameMode } from "../types/game"; // Import Question and GameMode types
import { OracleButton, OracleModal } from "./Oracle";
import { TrafficObstacle, NUM_OBSTACLES } from "./TrafficObstacle";
import { FuelIcon } from "./FuelIcon";
import { LevelMap } from "./LevelMap";
import { Road } from "./Road";
import { PlayerCar } from "./PlayerCar";
import { MovingAnswerOptions } from "./MovingAnswerOptions";
import { MovingLaneDividers } from "./MovingLaneDividers";
import { PauseButton } from "./PauseButton";
import { LoadingScreen } from "./LoadingScreen";
import { saveLevelProgress } from "../utils/storage";
import { SignIndex } from "./SignIndex";
import { LevelProgressMap } from "../types/game";
import { getAllLevelProgress } from "../utils/storage";
import Coins from "./Coins";
import { Scenery } from "./Scenery";
import * as THREE from "three";
import { useNavigate } from "react-router-dom";
import { getStoredCoins, saveCoins } from "../utils/storage";
import { memo } from "react";
import MagnetPowerup from "./MagnetPowerup";

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
  speed: 0,
  lives: 3,
  combo: 0,
  multiplier: 1,
  isGameOver: false,
  currentQuestion: null,
  isMoving: false,
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
  levelQuestions: [],
  askedQuestions: new Set<number>(),
  activeOptionZones: [],
  questionsAnswered: 0,
  targetLane: null,
  coinsScore: getStoredCoins(),
  magnetActive: false,
  magnetTimer: null,
  showMagnet: false,
};

// Add this helper function near the top of the file
const isInfiniteModeUnlocked = (levelProgress: LevelProgressMap): boolean => {
  return levelProgress[1]?.completed ?? false;
};

// Update the color constants
const SKY_COLOR_TOP = "rgba(54, 185, 233, 1)"; // #36B9E9
const SKY_COLOR_BOTTOM = "rgba(142, 226, 233, 1)"; // #8EE2E9
// const SKY_COLOR_TOP = 'rgba(142, 226, 233, 1)'; // #8EE2E9
// const SKY_COLOR_BOTTOM = 'rgba(54, 185, 233, 1)'; // #36B9E9
const GROUND_COLOR_TOP = "rgba(56, 118, 40, 1)"; // Green (#387628)
const GROUND_COLOR_BOTTOM = "rgba(86, 162, 50, 1)";
// const GROUND_COLOR_BOTTOM = 'rgba(255, 0, 0, 1)';   // Red (#FF0000)

// Add this new constant near the top of the file
const MAX_SPEED_ANGLE = 180; // Maximum angle for the speedometer needle

// Add this constant for coin group management
const MAX_COIN_GROUPS = 15; // Maximum number of coin groups to maintain
const COIN_GROUP_SPACING = 200; // Distance between coin groups

// Add near the top of the file
const PHYSICS_UPDATE_RATE = 1 / 60; // 60 FPS physics update rate

// Memoize UI components
const GameScore = memo(
  ({
    score,
    coinsScore,
    coinTextAnimating,
    lives,
  }: {
    score: number;
    coinsScore: number;
    coinTextAnimating: boolean;
    lives: number;
  }) => (
    <div className="absolute top-4 left-4 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div
          className={`flex items-center gap-2 text-2xl ${
            coinTextAnimating
              ? "text-yellow-500 scale-110 transform"
              : "text-white"
          }`}
        >
          <img
            src={`${process.env.PUBLIC_URL}/images/coin.svg`}
            alt="Coin"
            className="w-8 h-8"
          />
          <span className="orbitron-score font-semibold">{coinsScore}</span>
        </div>
      </div>
      <FuelDisplay lives={lives} />
    </div>
  )
);

const FuelDisplay = memo(({ lives }: { lives: number }) => (
  <div className="flex items-center gap-2">
    <div className="flex gap-1">
      {Array.from({ length: 3 }).map((_, i) => (
        <FuelIcon key={i} depleted={i >= lives} />
      ))}
    </div>
  </div>
));

const QuestionDisplay = memo(
  ({
    question,
    showingCorrectAnswer,
  }: {
    question: Question | null;
    showingCorrectAnswer: boolean;
  }) => {
    if (!question && !showingCorrectAnswer) return null;

    return (
      <>
        <div className="relative max-w-4xl mx-auto mt-16">
          <div className="bg-[#3B50A1] border-4 border-white text-white p-4 rounded-lg">
            <div className="mt-4 flex flex-col items-center">
              {showingCorrectAnswer ? (
                <div className="flex flex-col items-center gap-4">
                  <p className="text-xl text-center">The correct answer was:</p>
                  <img
                    src={question?.options[question.correctAnswer]}
                    alt="Correct answer"
                    className="w-32 h-32 object-contain border-2 border-white rounded-lg"
                  />
                </div>
              ) : (
                <p className="text-xl mb-4 text-center max-w-2xl">
                  {question?.text}
                </p>
              )}
            </div>
          </div>
        </div>
        {/* Truss pattern remains the same */}
      </>
    );
  }
);

// Add this new component before the main Game component
const GameUpdater = memo(
  ({
    isPlaying,
    isPaused,
    isGameOver,
    onFrameUpdate,
  }: {
    isPlaying: boolean;
    isPaused: boolean;
    isGameOver: boolean;
    onFrameUpdate: (delta: number) => void;
  }) => {
    const physicsAccumulator = useRef(0);
    const lastTime = useRef(performance.now());
    const frameCount = useRef(0);
    const lastFpsUpdate = useRef(performance.now());
    const fps = useRef(60);

    useFrame((state, delta) => {
      if (!isPlaying || isPaused || isGameOver) {
        lastTime.current = performance.now();
        return;
      }

      // Handle all frame updates here
      const now = performance.now();
      const frameTime = Math.min(delta, 0.1);

      // Update FPS counter
      frameCount.current++;
      if (now - lastFpsUpdate.current >= 1000) {
        fps.current = Math.round(
          (frameCount.current * 1000) / (now - lastFpsUpdate.current)
        );
        frameCount.current = 0;
        lastFpsUpdate.current = now;
      }

      // Physics update
      physicsAccumulator.current += frameTime;
      while (physicsAccumulator.current >= PHYSICS_UPDATE_RATE) {
        onFrameUpdate(PHYSICS_UPDATE_RATE);
        physicsAccumulator.current -= PHYSICS_UPDATE_RATE;
      }
    });

    return null;
  }
);

// Add these constants for object pooling and cleanup
const CLEANUP_INTERVAL = 10000; // 10 seconds
const OBJECT_POOL_SIZE = 50;
const COLLISION_CHECK_INTERVAL = 100; // 100ms

// Add object pooling utility
interface PooledObject extends THREE.Object3D {
  isActive?: boolean;
  reset?: () => void;
}

// Update object pool implementation
const objectPool = {
  obstacles: [] as PooledObject[],
  coins: [] as PooledObject[],
  getObject: function (type: "obstacle" | "coin"): PooledObject | null {
    const pool = type === "obstacle" ? this.obstacles : this.coins;
    const obj = pool.find((o) => !o.isActive);
    if (obj) {
      obj.isActive = true;
      obj.reset?.();
      return obj;
    }
    return null;
  },
  returnObject: function (type: "obstacle" | "coin", object: PooledObject) {
    object.isActive = false;
    const pool = type === "obstacle" ? this.obstacles : this.coins;
    if (pool.length < OBJECT_POOL_SIZE && !pool.includes(object)) {
      pool.push(object);
    }
  },
};

// Add performance monitoring
const performanceMetrics = {
  lastFrameTime: 0,
  frameCount: 0,
  fps: 0,
  updateFPS: function () {
    const now = performance.now();
    const delta = now - this.lastFrameTime;
    this.frameCount++;

    if (delta >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / delta);
      this.frameCount = 0;
      this.lastFrameTime = now;
    }
    return this.fps;
  },
};

// Add this near the top of the file after other imports
const DEBUG_MAGNET = true;

export default function Game() {
  const [gameState, setGameState] = useState<GameState>(initialGameState);
  const [coinTextAnimating, setCoinTextAnimating] = useState(false);
  const [magnetLane, setMagnetLane] = useState<number | null>(null);

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

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    const isLevelMode = gameState.gameMode === "levels";

    // IMPORTANT: Only use levelQuestions if in level mode, otherwise use all questions
    let availableQuestions = isLevelMode
      ? [...gameState.levelQuestions] // Create a copy to avoid mutations
      : [...questions];

    if (availableQuestions.length === 0) {
      return;
    }

    // Filter out sign groups that have all questions asked
    availableQuestions = availableQuestions.filter((signGroup) => {
      // Check if any question in this sign group hasn't been asked yet
      return signGroup.questions.some(
        (q) => !gameState.askedQuestions.has(q.id)
      );
    });

    if (availableQuestions.length === 0) {
      if (isLevelMode) {
        setGameState((prev) => ({
          ...prev,
          isGameOver: true,
        }));
        return;
      }
      // Reset asked questions if in infinite mode
      setGameState((prev) => ({
        ...prev,
        askedQuestions: new Set(),
      }));
      availableQuestions = isLevelMode
        ? [...gameState.levelQuestions]
        : [...questions];
    }

    // Log available questions for debugging

    // Select a random sign group from available questions
    const signGroup =
      availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    // Get questions from this sign group that haven't been asked yet
    const availableSignQuestions = signGroup.questions.filter(
      (q) => !gameState.askedQuestions.has(q.id)
    );

    const baseQuestion =
      availableSignQuestions[
        Math.floor(Math.random() * availableSignQuestions.length)
      ];
    const options = getOptionsForQuestion(signGroup.signPath);

    const question = {
      ...baseQuestion,
      signPath: signGroup.signPath,
      options: options,
      correctAnswer: 0,
      oracleHelp: signGroup.oracleHelp,
    };

    // Define the safe zone based on the question's position
    const optionZPosition = 0;
    const newSafeZone = {
      start: optionZPosition - SAFE_ZONE_BEFORE,
      end: optionZPosition + SAFE_ZONE_AFTER,
    };

    setGameState((prev) => ({
      ...prev,
      currentQuestion: question,
      askedQuestions: new Set([
        ...Array.from(prev.askedQuestions),
        question.id,
      ]),
      activeOptionZones: [newSafeZone],
    }));
  };

  // Update the activeGameObjects computation
  const activeGameObjects = useMemo(() => {
    const isActive =
      gameState.isPlaying && !gameState.isGameOver && !gameState.isPaused;
    return {
      shouldRenderObstacles: isActive,
      shouldRenderCoins: isActive && gameState.gameMode === "infinite",
    };
  }, [
    gameState.isPlaying,
    gameState.isGameOver,
    gameState.isPaused,
    gameState.gameMode,
  ]);

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
      const baseLane =
        targetLane !== null ? targetLane : currentLaneRef.current;

      switch (e.key) {
        case "ArrowLeft":
          if (baseLane > 0) {
            const newLane = baseLane - 1;
            setTargetLane(newLane);
            setTargetLanePosition(LANE_POSITIONS[newLane]);
            setGameState((prev) => ({
              ...prev,
              targetLane: newLane,
            }));
            lastLaneSwitch.current = now;
          }
          break;
        case "ArrowRight":
          if (baseLane < LANE_POSITIONS.length - 1) {
            const newLane = baseLane + 1;
            setTargetLane(newLane);
            setTargetLanePosition(LANE_POSITIONS[newLane]);
            setGameState((prev) => ({
              ...prev,
              targetLane: newLane,
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
        gameState.isGameOver ||
        !gameState.isPlaying
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
          const baseLane =
            targetLane !== null ? targetLane : currentLaneRef.current;

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
            setTargetLanePosition(LANE_POSITIONS[newLane]);
            setGameState((prev) => ({
              ...prev,
              targetLane: newLane,
              isMoving: true, // Add this to ensure smooth animation
            }));
            lastLaneSwitch.current = now;
          }
        }
      }

      // Reset touch tracking
      touchStartX.current = null;
      touchStartY.current = null;
    };

    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      if (questionTimer.current) {
        clearTimeout(questionTimer.current);
      }
    };
  }, [gameState.isGameOver, gameState.isPlaying, targetLane]); // Added targetLane to dependencies

  // Define a callback for when lane change is complete
  const onLaneChangeComplete = () => {
    if (targetLane !== null) {
      setGameState((prev) => ({
        ...prev,
        currentLane: targetLane,
        targetLane: null,
        isMoving: false,
      }));
      setTargetLane(null);
    }
  };

  // Add debug logging for game state changes
  useEffect(() => {
    debugLog("Game state updated:", {
      score: gameState.score,
      coinsCollected: gameState.coinsCollected,
      multiplier: gameState.multiplier,
      currentLane: gameState.currentLane,
      updateType: "state-change",
      timestamp: performance.now(),
    });
  }, [
    gameState.score,
    gameState.multiplier,
    gameState.currentLane,
    gameState.coinsCollected,
  ]);

  const handleCoinCollect = (id: number) => {
    debugLog("Collecting coin", {
      coinId: id,
      lane: getLaneFromId(id),
      currentCoins: gameState.coinsCollected,
    });

    setGameState((prev) => ({
      ...prev,
      coinsCollected: prev.coinsCollected + 1,
    }));

    // Trigger animation
    setCoinTextAnimating(true);
    setTimeout(() => {
      setCoinTextAnimating(false);
    }, 1000);
  };

  // Helper function to determine lane from coin ID
  const getLaneFromId = (id: number): number => {
    return Math.floor(id / 10000);
  };

  // Add new function to handle game start
  const startGame = (mode: GameMode) => {
    setGameState((prev) => ({
      ...initialGameState,
      isPlaying: true,
      isPaused: false,
      speed: 1,
      gameMode: mode,
    }));
  };

  // Add toggle pause function
  const togglePause = () => {
    if (gameState.isPlaying && !gameState.isGameOver) {
      setGameState((prev) => ({
        ...prev,
        isPaused: !prev.isPaused,
        isMoving: prev.isPaused,
      }));
    }
  };

  // Update keyboard controls to handle pause
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Escape" && gameState.isPlaying && !gameState.isGameOver) {
        togglePause();
      }
      // ...existing key handlers...
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
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
      gameState.isGameOver ||
      !gameState.isPlaying
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
        const baseLane =
          targetLane !== null ? targetLane : currentLaneRef.current;

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
          setTargetLanePosition(LANE_POSITIONS[newLane]);
          setGameState((prev) => ({
            ...prev,
            targetLane: newLane,
            isMoving: true, // Add this to ensure smooth animation
          }));
          lastLaneSwitch.current = now;
        }
      }
    }

    // Reset touch tracking
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const [isOracleActive, setIsOracleActive] = useState(false);
  const [previousQuestion, setPreviousQuestion] = useState<Question | null>(
    null
  );
  const [previousAnswer, setPreviousAnswer] = useState<number | undefined>();

  const toggleOracle = () => {
    if (gameState.isPlaying || isOracleActive) {
      setIsOracleActive(!isOracleActive);
      setGameState((prev) => ({
        ...prev,
        isPaused: !isOracleActive, // Pause game when oracle is active
      }));
    }
  };

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault(); // Prevent space from scrolling
        toggleOracle();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
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

    // Reset game state completely with proper initial values
    setGameState({
      ...initialGameState,
      isPlaying: true,
      isPaused: false, // Make sure to start unpaused
      speed: 1, // Set initial speed
      isMoving: true, // Enable movement
      gameMode: "levels",
      currentLevel: levelId,
      levelQuestions: levelQuestions,
      askedQuestions: new Set(), // Reset asked questions
    });

    // Small delay to ensure state is properly updated
    setTimeout(() => {
      showNextQuestion();
    }, 100);
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
    if (gameState.isGameOver && gameState.gameMode === "levels") {
      // Save progress when game ends
      saveLevelProgress(gameState.currentLevel, {
        highScore: gameState.score,
        remainingLives: gameState.lives,
        completed: gameState.lives > 0, // Consider level completed if player didn't lose all lives
        lastPlayed: new Date().toISOString(),
      });
    }
  }, [gameState.isGameOver]);

  // Add this near the top with other state declarations
  const [showWrongAnswerFlash, setShowWrongAnswerFlash] = useState(false);
  const [showCorrectAnswerFlash, setShowCorrectAnswerFlash] = useState(false);

  const [showSignIndex, setShowSignIndex] = useState(false);

  // Add these new states near the top of the Game component
  const [animatingFinalCoins, setAnimatingFinalCoins] = useState(false);
  const [displayedCoins, setDisplayedCoins] = useState(0);
  const [finalCoinsReached, setFinalCoinsReached] = useState(false);
  const [highScore, setHighScore] = useState(() => {
    const stored = localStorage.getItem("infiniteHighScore");
    return stored ? parseInt(stored, 10) : 0;
  });

  // Add this function to handle high score updates
  const updateHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem("infiniteHighScore", newScore.toString());
    }
  };

  // Update the effect that handles game over
  useEffect(() => {
    if (gameState.isGameOver && gameState.gameMode === "infinite") {
      // Update high score if needed
      updateHighScore(gameState.score);

      // Start coin animation
      if (!animatingFinalCoins) {
        setAnimatingFinalCoins(true);
        setDisplayedCoins(0);

        const startTime = Date.now();
        const duration = 2000;
        const coinsCollected = gameState.coinsCollected;

        // Save the new coins immediately to prevent state loss
        const newTotalCoins = gameState.coinsScore + coinsCollected;

        // Update both the stored coins and the game state
        saveCoins(newTotalCoins);
        setGameState((prev) => ({
          ...prev,
          coinsScore: newTotalCoins,
          coinsCollected: 0, // Reset collected coins
        }));

        const animateCoins = () => {
          const currentTime = Date.now();
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);

          const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);
          const easedProgress = easeOutQuart(progress);

          setDisplayedCoins(Math.floor(easedProgress * coinsCollected));

          if (progress < 1) {
            requestAnimationFrame(animateCoins);
          } else {
            setFinalCoinsReached(true);
          }
        };

        requestAnimationFrame(animateCoins);
      }
    }
  }, [
    gameState.isGameOver,
    gameState.gameMode,
    gameState.coinsCollected,
    gameState.score,
    gameState.coinsScore,
  ]);

  // Update the getGameOverMessage function's infinite mode section
  const getGameOverMessage = (gameState: GameState) => {
    if (gameState.gameMode === "levels") {
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
                  gameMode: null,
                });
                setShowLevelMap(true);
              },
              className: "bg-green-500 hover:bg-green-600 text-white",
            },
            {
              text: "Main Menu",
              action: () => {
                setGameState({
                  ...initialGameState,
                  isPlaying: false,
                  gameMode: null,
                });
              },
              className: "border-2 border-gray-300 hover:bg-gray-100",
            },
          ],
        };
      } else {
        return {
          title: "Level Failed",
          message: "Keep practicing! You'll get better!",
          buttons: [
            {
              text: "Try Again",
              action: () => {
                const levelQuestions = getLevelQuestions(
                  gameState.currentLevel
                );
                setGameState({
                  ...initialGameState,
                  isPlaying: true,
                  isPaused: false,
                  speed: 1,
                  gameMode: "levels",
                  currentLevel: gameState.currentLevel,
                  levelQuestions: levelQuestions,
                  askedQuestions: new Set(),
                  isGameOver: false,
                  isMoving: true,
                });

                // Important: Reset the target lane position
                setTargetLanePosition(LANE_POSITIONS[1]); // Reset to middle lane
                setTargetLane(null);

                // Show first question after a small delay
                setTimeout(() => {
                  showNextQuestion();
                }, 100);
              },
              className: "bg-blue-500 hover:bg-blue-600 text-white",
            },
            {
              text: "Main Menu",
              action: () => {
                setGameState({
                  ...initialGameState,
                  isPlaying: false,
                  gameMode: null,
                });
              },
              className: "border-2 border-gray-300 hover:bg-gray-100",
            },
          ],
        };
      }
    } else {
      // infinite mode
      return {
        title: "Game Over",
        message: "", // We'll handle the message in the JSX
        buttons: [
          {
            text: "Play Again",
            action: () => {
              // Get the updated total coins
              const currentTotalCoins = getStoredCoins();

              setGameState({
                ...initialGameState,
                isPlaying: true,
                isPaused: false,
                speed: 1,
                gameMode: "infinite",
                isMoving: true,
                isGameOver: false,
                coinsScore: currentTotalCoins, // Set the updated coins
              });

              // Reset animation states
              setAnimatingFinalCoins(false);
              setDisplayedCoins(0);
              setFinalCoinsReached(false);

              // Reset positions
              setTargetLanePosition(LANE_POSITIONS[1]);
              setTargetLane(null);

              setTimeout(showNextQuestion, 100);
            },
            className: "bg-blue-600 hover:bg-blue-700",
          },
          {
            text: "Main Menu",
            action: () => {
              setGameState({
                ...initialGameState,
                isPlaying: false,
                gameMode: null,
              });

              // Reset animation states
              setAnimatingFinalCoins(false);
              setDisplayedCoins(0);
              setFinalCoinsReached(false);
            },
            className: "bg-gray-600 hover:bg-gray-700",
          },
        ],
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
  const [showObstacleCollisionFlash, setShowObstacleCollisionFlash] =
    useState(false);

  // Replace the coin groups state and management
  const [coinGroups, setCoinGroups] = useState<number[]>(() =>
    Array.from({ length: 10 }).map(
      (_, index) => initialZ - index * COIN_GROUP_SPACING
    )
  );

  // Optimize coin group management
  useEffect(() => {
    if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver)
      return;

    const interval = setInterval(() => {
      setCoinGroups((prevGroups) => {
        // Remove groups that are too far behind
        const filteredGroups = prevGroups.filter((z) => z > -1000);

        // Add new groups if needed
        const lastGroupZ =
          filteredGroups[filteredGroups.length - 1] || initialZ;
        const newGroups = [];

        while (filteredGroups.length + newGroups.length < MAX_COIN_GROUPS) {
          newGroups.push(
            lastGroupZ - COIN_GROUP_SPACING * (newGroups.length + 1)
          );
        }

        return [...filteredGroups, ...newGroups];
      });
    }, 2000); // Reduced frequency of updates

    return () => clearInterval(interval);
  }, [gameState.isPlaying, gameState.isPaused, gameState.isGameOver]);

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

  const navigate = useNavigate();

  // Add this function inside the Game component
  const handleMagnetCollect = () => {
    setGameState((prev) => ({
      ...prev,
      magnetActive: true,
      showMagnet: false,
    }));

    // Start magnet timer
    const timer = setTimeout(() => {
      setGameState((prev) => ({
        ...prev,
        magnetActive: false,
      }));
    }, 10000); // 10 seconds

    setGameState((prev) => ({
      ...prev,
      magnetTimer: timer,
    }));
  };

  // Update the handleCollision function
  const handleCollision = useCallback(
    (isCorrect: boolean) => {
      if (gameState.currentQuestion) {
        setPreviousQuestion(gameState.currentQuestion);
        setPreviousAnswer(gameState.currentLane);
      }

      if (gameState.oracleMode) {
        const currentQuestion = gameState.currentQuestion;
        if (!currentQuestion) {
          debugLog("No current question found in Oracle mode");
          return;
        }

        if (isCorrect) {
          debugLog("Correct answer in Oracle mode", {
            previousScore: gameState.score,
            newScore: gameState.score + 100,
          });

          setGameState((prev) => ({
            ...prev,
            score: prev.score + 100,
            oracleFeedback: {
              message: currentQuestion.oracleHelp.correctAnswerInsight,
              type: "praise",
              shown: true,
            },
          }));
        } else {
          const wrongOption = gameState.currentLane;
          debugLog("Wrong answer in Oracle mode", {
            wrongOption,
            feedback:
              currentQuestion.oracleHelp.wrongAnswerFeedback[wrongOption],
          });

          setGameState((prev) => ({
            ...prev,
            mistakeCount: prev.mistakeCount + 1,
            oracleFeedback: {
              message:
                currentQuestion.oracleHelp.wrongAnswerFeedback[wrongOption],
              type: "correction",
              shown: true,
            },
          }));
        }

        // Clear feedback after delay
        setTimeout(() => {
          debugLog("Clearing Oracle feedback");
          setGameState((prev) => ({
            ...prev,
            oracleFeedback: null,
          }));
          showNextQuestion();
        }, 4000);
      } else {
        if (isCorrect) {
          if (DEBUG_MAGNET)
            console.log(
              "Correct answer, current questions answered:",
              gameState.questionsAnswered
            );

          setShowCorrectAnswerFlash(true);

          setGameState((prev) => {
            const newQuestionsAnswered = prev.questionsAnswered + 1;
            const newConsecutiveCorrect = prev.consecutiveCorrect + 1;
            const speedIncrease = Math.floor(newConsecutiveCorrect / 3);
            const newSpeed = 1 + speedIncrease * 0.2;

            if (DEBUG_MAGNET)
              console.log("New questions answered:", newQuestionsAnswered);

            // Show magnet after 3 questions only in infinite mode
            if (newQuestionsAnswered === 1 && prev.gameMode === "infinite") {
              const randomLane = Math.floor(Math.random() * 3);
              if (DEBUG_MAGNET)
                console.log("Showing magnet in lane:", randomLane);
              setMagnetLane(randomLane);
              return {
                ...prev,
                questionsAnswered: newQuestionsAnswered,
                score: prev.score + 100,
                currentQuestion: null,
                consecutiveCorrect: newConsecutiveCorrect,
                speed: newSpeed,
                showMagnet: true,
              };
            }

            return {
              ...prev,
              questionsAnswered: newQuestionsAnswered,
              score: prev.score + 100,
              currentQuestion: null,
              consecutiveCorrect: newConsecutiveCorrect,
              speed: newSpeed,
            };
          });

          setTimeout(() => {
            setShowCorrectAnswerFlash(false);
          }, 1500);

          setTimeout(showNextQuestion, 200);
        } else {
          debugLog("Wrong answer in normal mode", {
            currentLives: gameState.lives,
            newLives: gameState.lives - 1,
          });

          // Show the wrong answer flash effect
          setShowWrongAnswerFlash(true);

          setGameState((prev) => {
            const newLives = prev.lives - 1;
            const isGameOver = newLives <= 0;

            const updatedState = {
              ...prev,
              lives: newLives,
              isGameOver,
              isPaused: isGameOver, // Also set isPaused when game is over
              consecutiveCorrect: 0,
              speed: 1,
              showingCorrectAnswer: true,
            };

            debugLog("Game state updated:", {
              isGameOver: updatedState.isGameOver,
              isPaused: updatedState.isPaused,
            });

            return updatedState;
          });

          // Hide the flash effect after 1.5 seconds
          setTimeout(() => {
            setShowWrongAnswerFlash(false);
          }, 1500);

          // Hide the correct answer and show next question after delay
          setTimeout(() => {
            setGameState((prev) => ({
              ...prev,
              showingCorrectAnswer: false,
            }));
            showNextQuestion();
          }, 3000);
        }
      }
    },
    [
      gameState.oracleMode,
      gameState.currentQuestion,
      gameState.currentLane,
      gameState.lives,
      gameState.score,
      showNextQuestion,
    ]
  );

  // Add cleanup interval
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Clean up disposed objects
      objectPool.obstacles = objectPool.obstacles.filter(
        (obj) => obj.parent !== null
      );
      objectPool.coins = objectPool.coins.filter((obj) => obj.parent !== null);

      // Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
    }, CLEANUP_INTERVAL);

    return () => clearInterval(cleanupInterval);
  }, []);

  // Optimize collision detection with spatial partitioning
  const spatialGrid = useMemo(() => {
    const grid: Record<string, Set<THREE.Object3D>> = {};
    const cellSize = 10;

    return {
      add: (obj: THREE.Object3D) => {
        const cell = `${Math.floor(obj.position.x / cellSize)},${Math.floor(
          obj.position.z / cellSize
        )}`;
        if (!grid[cell]) grid[cell] = new Set();
        grid[cell].add(obj);
      },
      remove: (obj: THREE.Object3D) => {
        const cell = `${Math.floor(obj.position.x / cellSize)},${Math.floor(
          obj.position.z / cellSize
        )}`;
        grid[cell]?.delete(obj);
      },
      getNearby: (position: THREE.Vector3) => {
        const cell = `${Math.floor(position.x / cellSize)},${Math.floor(
          position.z / cellSize
        )}`;
        return Array.from(grid[cell] || []);
      },
    };
  }, []);

  // Optimize game state updates
  const updateGameState = useCallback((updates: Partial<GameState>) => {
    setGameState((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  // Optimize frame updates
  const frameUpdate = useCallback(
    (state: any, delta: number) => {
      if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver)
        return;

      // Update performance metrics
      const currentFPS = performanceMetrics.updateFPS();

      // Throttle updates if FPS drops too low
      if (currentFPS < 30) {
        // Reduce visual effects
        // Reduce particle effects
        // Reduce draw distance
      }

      // Batch state updates
      const stateUpdates: Partial<GameState> = {};

      // Update game logic here

      if (Object.keys(stateUpdates).length > 0) {
        updateGameState(stateUpdates);
      }
    },
    [
      gameState.isPlaying,
      gameState.isPaused,
      gameState.isGameOver,
      updateGameState,
    ]
  );

  // Update the renderGameObjects memo condition
  const renderGameObjects = useMemo(() => {
    if (!gameState.isPlaying || gameState.isGameOver || gameState.isPaused) {
      return null;
    }

    if (DEBUG_MAGNET) {
    }

    return (
      <>
        <PlayerCar
          position={[LANE_POSITIONS[gameState.currentLane], 1.0, 0]}
          targetPosition={targetLanePosition}
          handleCoinCollect={handleCoinCollect}
          onLaneChangeComplete={onLaneChangeComplete}
          key={`player-${gameState.currentLane}`}
        />
        {activeGameObjects.shouldRenderObstacles &&
          Array.from({ length: NUM_OBSTACLES }).map((_, index) => (
            <TrafficObstacle
              key={`obstacle-${index}`}
              index={index}
              gameState={gameState}
              setGameState={setGameState}
              onRespawn={() => {}}
              initialZ={obstacleInitialZ}
              activeOptionZones={gameState.activeOptionZones}
              setShowObstacleCollisionFlash={setShowObstacleCollisionFlash}
            />
          ))}
        {activeGameObjects.shouldRenderCoins &&
          coinGroups.slice(0, 5).map((groupZ, groupIndex) => (
            <React.Fragment key={`coin-group-${groupIndex}`}>
              {LANE_POSITIONS.map((position, laneIndex) => (
                <Coins
                  key={`coin-${laneIndex}-${groupIndex}`}
                  lane={laneIndex}
                  startingZ={groupZ}
                  gameState={gameState}
                  onCollect={handleCoinCollect}
                  magnetActive={gameState.magnetActive}
                />
              ))}
            </React.Fragment>
          ))}
        {gameState.showMagnet &&
          magnetLane !== null &&
          gameState.gameMode === "infinite" && (
            <MagnetPowerup
              gameState={gameState}
              onCollect={handleMagnetCollect}
              lane={magnetLane}
            />
          )}
      </>
    );
  }, [
    gameState.isPlaying,
    gameState.isGameOver,
    gameState.isPaused,
    gameState.currentLane,
    gameState.gameMode,
    targetLanePosition,
    handleCoinCollect,
    onLaneChangeComplete,
    activeGameObjects.shouldRenderObstacles,
    activeGameObjects.shouldRenderCoins,
    coinGroups,
    setShowObstacleCollisionFlash,
    gameState.showMagnet,
    gameState.magnetActive,
    magnetLane,
    handleMagnetCollect,
  ]);

  // Move frame update callback outside of useFrame
  const handleFrameUpdate = useCallback(
    (delta: number) => {
      if (!gameState.isPlaying || gameState.isPaused || gameState.isGameOver)
        return;

      // Batch state updates
      const stateUpdates: Partial<GameState> = {};

      // Update game logic here

      if (Object.keys(stateUpdates).length > 0) {
        setGameState((prev) => ({
          ...prev,
          ...stateUpdates,
        }));
      }
    },
    [gameState.isPlaying, gameState.isPaused, gameState.isGameOver]
  );

  // Add this useEffect near the start of the component
  useEffect(() => {
    // Initialize questions when component mounts
    initializeQuestions().catch((error: Error) => {
      console.error("Failed to initialize questions:", error);
    });
  }, []);

  // Add debug logging when the game over popup is displayed
  useEffect(() => {
    if (gameState.isGameOver) {
      debugLog("Displaying Game Over popup and pausing the game.");
    }
  }, [gameState.isGameOver]);

  // Add this effect to handle level map state
  useEffect(() => {
    if (showLevelMap && !gameState.gameMode) {
      // Only pause if not in a game mode
      setGameState((prev) => ({
        ...prev,
        isPaused: true,
        isMoving: false,
      }));
    }
  }, [showLevelMap, gameState.gameMode]);

  // Modify the cleanup in useEffect
  useEffect(() => {
    return () => {
      if (gameState.magnetTimer) {
        clearTimeout(gameState.magnetTimer);
      }
    };
  }, [gameState.magnetTimer]);

  // Add this effect to handle coin animation when game over
  useEffect(() => {
    if (
      gameState.isGameOver &&
      gameState.gameMode === "infinite" &&
      !animatingFinalCoins
    ) {
      setAnimatingFinalCoins(true);
      setDisplayedCoins(0);

      // Animate coins collection
      const startTime = Date.now();
      const duration = 2000; // 2 seconds animation
      const coinsCollected = gameState.coinsCollected;

      const animateCoins = () => {
        const currentTime = Date.now();
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Use easeOutQuart for smooth animation
        const easeOutQuart = (x: number): number => 1 - Math.pow(1 - x, 4);
        const easedProgress = easeOutQuart(progress);

        setDisplayedCoins(Math.floor(easedProgress * coinsCollected));

        if (progress < 1) {
          requestAnimationFrame(animateCoins);
        } else {
          setFinalCoinsReached(true);
        }
      };

      requestAnimationFrame(animateCoins);
    }
  }, [gameState.isGameOver, gameState.gameMode, gameState.coinsCollected]);

  return (
    // Add touch-action CSS to prevent default touch behaviors
    <div
      className="w-full h-screen"
      style={{ touchAction: "none" }}
      onTouchStart={(e: React.TouchEvent) => handleTouchStart(e.nativeEvent)}
      onTouchEnd={(e: React.TouchEvent) => handleTouchEnd(e.nativeEvent)}
    >
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
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        >
          {/* Top buttons container */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <button
              onClick={() => setShowSignIndex(true)}
              className="bg-[#505050] hover:bg-[#505050] text-white px-4 py-2 
                         rounded-lg transition-colors flex items-center gap-2 shadow-md"
            >
              📖 Sign Index 📖
            </button>

            <button
              onClick={() => navigate("/garage")}
              className="bg-[#505050] hover:bg-[#505050] text-white px-4 py-2 
                         rounded-lg transition-colors flex items-center gap-2 shadow-md"
            >
              🚗 Car Garage 🚗
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
                  onClick={() => startGame("infinite")}
                  disabled={!isInfiniteModeUnlocked(levelProgress)}
                  className={`w-full bg-[#333333] px-8 py-3 rounded-lg font-bold text-xl 
                           flex items-center justify-center gap-4 shadow-lg transition-all duration-300
                           ${
                             isInfiniteModeUnlocked(levelProgress)
                               ? "hover:bg-[#444444] text-white hover:shadow-xl transform hover:-translate-y-0.5"
                               : "bg-[#2A2A2A] cursor-not-allowed text-gray-400"
                           }`}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
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
                  <div
                    className="absolute -top-12 left-1/2 transform -translate-x-1/2 opacity-0 
                                group-hover:opacity-100 transition-all duration-300 pointer-events-none"
                  >
                    <div
                      className="bg-[#1A1A1A] text-white px-4 py-2 rounded-lg shadow-xl 
                                  flex items-center gap-2 whitespace-nowrap"
                    >
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
                      <span className="font-medium">
                        Complete Level 3 to unlock
                      </span>
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
                  <path d="M3 5v14h18V5H3zm16 12H5V7h14v10z" />
                  <path d="M8.5 11.5l2.5 3 3.5-4.5 4.5 6H5z" />
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
          <div
            className="bg-gradient-to-b from-purple-600/90 to-indigo-900/90 p-6 rounded-lg 
                        shadow-2xl max-w-md text-white backdrop-blur-sm border border-purple-400/30"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 rounded-full bg-purple-400/20 flex items-center justify-center overflow-hidden">
                  <img
                    src={process.env.PUBLIC_URL + "/images/happy1.svg"}
                    alt="Oracle"
                    className="w-8 h-8" // Adjust size as needed
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Oracle's Wisdom</h3>
                <p className="text-purple-100 mb-4">
                  {gameState.oracleFeedback?.message || ""}
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
        <GameScore
          score={gameState.score}
          coinsScore={gameState.coinsScore}
          coinTextAnimating={coinTextAnimating}
          lives={gameState.lives}
        />

        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-4xl orbitron-score font-bold text-white">
          {gameState.score}
        </div>

        <QuestionDisplay
          question={gameState.currentQuestion}
          showingCorrectAnswer={gameState.showingCorrectAnswer}
        />
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
                  const angle = -90 + i * (MAX_SPEED_ANGLE / 10);
                  const isMainTick = i % 2 === 0;
                  return (
                    <div
                      key={i}
                      className={`absolute bottom-0 left-1/2 origin-bottom ${
                        isMainTick ? "h-3 w-0.5" : "h-2 w-0.5"
                      }`}
                      style={{
                        background: "white",
                        transform: `translateX(-50%) rotate(${angle}deg)`,
                      }}
                    />
                  );
                })}
              </div>

              {/* Speed Value */}
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 pb-3.5">
                <div className="text-white text-lg font-bold">
                  {gameState.speed.toFixed(1)}x
                </div>
              </div>

              {/* Needle */}
              <div
                className="absolute bottom-0 left-1/2 w-[2px] h-[90%] bg-red-500 origin-bottom transition-transform duration-300"
                style={{
                  transform: `translateX(-50%) rotate(${
                    ((gameState.speed - 1) / (MAX_SPEED - 1)) *
                      MAX_SPEED_ANGLE -
                    90
                  }deg)`,
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
              {Array.from({
                length: Math.floor((gameState.speed - 1) * 2),
              }).map((_, i) => (
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
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
          onClick={() => {}}
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#272D45] rounded-lg p-8 max-w-md w-full mx-4 relative shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                <div className="text-center text-white">
                  <h2 className="text-3xl font-bold mb-4">
                    {getGameOverMessage(gameState).title}
                  </h2>

                  {gameState.gameMode === "infinite" && (
                    <div className="space-y-4">
                      <div className="text-2xl font-semibold">
                        Score: {gameState.score}
                      </div>

                      <div className="text-xl text-yellow-400">
                        High Score: {Math.max(highScore, gameState.score)}
                      </div>

                      <div className="flex items-center justify-center gap-3">
                        <img
                          src={`${process.env.PUBLIC_URL}/images/coin.svg`}
                          alt="Coins"
                          className="w-8 h-8"
                        />
                        <div className="text-2xl font-semibold">
                          +{displayedCoins}
                        </div>
                      </div>

                      {finalCoinsReached && (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="text-lg text-gray-300"
                        >
                          Total Coins: {gameState.coinsScore}
                        </motion.div>
                      )}
                    </div>
                  )}

                  {gameState.gameMode === "levels" && (
                    <p className="text-xl mb-6">
                      {getGameOverMessage(gameState).message}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  {getGameOverMessage(gameState).buttons.map(
                    (button, index) => (
                      <button
                        key={index}
                        onClick={button.action}
                        className={`${button.className} text-white px-6 py-3 rounded-lg 
                               font-semibold transition-colors w-full`}
                      >
                        {button.text}
                      </button>
                    )
                  )}
                </div>
              </div>
            </motion.div>

            {/* Update the sticker based on game mode and completion status */}
            <div className="absolute -bottom-16 -right-16 w-36 h-36">
              <img
                src={process.env.PUBLIC_URL + 
                  (gameState.gameMode === "levels" && gameState.lives > 0
                    ? "/images/amazed.svg"
                    : "/images/sad.svg")
                }
                alt="Emotion sticker"
                className="w-full h-full"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Pause Overlay */}
      {gameState.isPaused && gameState.isPlaying && !gameState.isGameOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-40"
          onClick={togglePause}
        >
          <div className="relative">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-[#272D45] rounded-lg p-8 max-w-md w-full mx-4 relative shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-6">
                {/* Title and Content */}
                <div className="text-center text-white">
                  <h2 className="text-3xl font-bold mb-6">Game Paused</h2>
                </div>

                {/* Buttons */}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={togglePause}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 
                             rounded-lg font-semibold transition-colors w-full"
                  >
                    Resume Game
                  </button>
                  <button
                    onClick={() => {
                      // Handle restart based on game mode
                      if (gameState.gameMode === "levels") {
                        // Get fresh questions for the current level
                        const levelQuestions = getLevelQuestions(
                          gameState.currentLevel
                        );
                        setGameState({
                          ...initialGameState,
                          isPlaying: true,
                          gameMode: "levels",
                          currentLevel: gameState.currentLevel,
                          levelQuestions: levelQuestions,
                          askedQuestions: new Set(),
                          isPaused: false,
                          isMoving: true,
                          speed: 1,
                        });

                        // Reset the target lane position
                        setTargetLanePosition(LANE_POSITIONS[1]); // Reset to middle lane
                        setTargetLane(null);

                        // Small delay to ensure state is updated before showing first question
                        setTimeout(showNextQuestion, 100);
                      } else {
                        // Infinite mode restart
                        setGameState({
                          ...initialGameState,
                          isPlaying: true,
                          gameMode: "infinite",
                          isPaused: false,
                          isMoving: true,
                          speed: 1,
                        });

                        // Reset the target lane position
                        setTargetLanePosition(LANE_POSITIONS[1]); // Reset to middle lane
                        setTargetLane(null);

                        setTimeout(showNextQuestion, 100);
                      }
                    }}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 
                             rounded-lg font-semibold transition-colors w-full"
                  >
                    Restart Game
                  </button>
                  <button
                    onClick={() => {
                      setGameState({
                        ...initialGameState,
                        isPlaying: false,
                        gameMode: null,
                      });
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 
                             rounded-lg font-semibold transition-colors w-full"
                  >
                    Main Menu
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Sticker overlapping the modal */}
            <div className="absolute -bottom-16 -right-16 w-36 h-36">
              <img
                src={process.env.PUBLIC_URL + "/images/happy1.svg"}
                alt="Happy sticker"
                className="w-full h-full"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* 3D Game Scene */}
      <Canvas shadows>
        <Suspense fallback={<LoadingScreen />}>
          {!showLevelMap &&
            (gameState.isPlaying || gameState.gameMode === null) && (
              <>
                <GameUpdater
                  isPlaying={gameState.isPlaying}
                  isPaused={
                    gameState.isPaused ||
                    !gameState.isPlaying ||
                    showLevelMap ||
                    gameState.gameMode === null
                  }
                  isGameOver={gameState.isGameOver}
                  onFrameUpdate={handleFrameUpdate}
                />
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
                      colorBottom: { value: new THREE.Color(SKY_COLOR_BOTTOM) },
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
                <mesh
                  rotation={[-Math.PI / 2, 0, 0]}
                  position={[0, -0.2, 0]}
                  receiveShadow
                >
                  <planeGeometry args={[1000, 1000]} />
                  <shaderMaterial
                    uniforms={{
                      colorTop: { value: new THREE.Color(GROUND_COLOR_TOP) },
                      colorBottom: {
                        value: new THREE.Color(GROUND_COLOR_BOTTOM),
                      },
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
                    varying vec3 vPosition;
                    void main() {
                      // Adjust transition to visible ground area
                      // Start green from the horizon (where ground meets sky)
                      // Transition to red at 80% of the visible ground area
                      float t = smoothstep(50.0, 150.0, vPosition.y);
                      vec3 color = mix(colorTop, colorBottom, t);
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

                <Physics
                  paused={
                    !gameState.isPlaying ||
                    gameState.isPaused ||
                    gameState.isGameOver ||
                    showLevelMap ||
                    gameState.gameMode === null
                  }
                  timeStep={PHYSICS_UPDATE_RATE}
                >
                  <group position={[0, 0, 0]}>
                    {gameState.isPlaying &&
                      !showLevelMap &&
                      gameState.gameMode !== null && (
                        <>
                          <Road />
                          <Scenery
                            speed={gameState.speed}
                            isPaused={
                              gameState.isPaused ||
                              gameState.isGameOver ||
                              showLevelMap ||
                              gameState.gameMode === null
                            }
                          />
                          <MovingLaneDividers
                            gameState={{
                              ...gameState,
                              isPaused:
                                gameState.isPaused ||
                                gameState.isGameOver ||
                                showLevelMap ||
                                gameState.gameMode === null,
                            }}
                          />
                          {renderGameObjects}
                          {gameState.currentQuestion &&
                            !gameState.showingCorrectAnswer &&
                            !gameState.isGameOver && (
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
              </>
            )}
        </Suspense>
      </Canvas>

      {/* Update the Oracle and Pause button positioning */}
      {gameState.isPlaying && !gameState.isGameOver && (
        <div className="absolute top-4 right-4 flex items-center gap-4 z-20">
          <OracleButton
            onClick={toggleOracle}
            isActive={isOracleActive}
            disabled={gameState.questionsAnswered === 0}
          />
          <PauseButton
            isPaused={gameState.isPaused}
            onClick={togglePause}
            disabled={isOracleActive}
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

      {showSignIndex && <SignIndex onBack={() => setShowSignIndex(false)} />}
    </div>
  );
}
