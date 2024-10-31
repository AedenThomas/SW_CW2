import { Canvas, useFrame } from '@react-three/fiber';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Physics, RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { Environment, PerspectiveCamera, useGLTF, Text, Sky, Stars } from '@react-three/drei';
import { Vector3 } from 'three';
import { questions } from '../data/questions';
import { lerp } from 'three/src/math/MathUtils';
import * as THREE from 'three';
import { EnvironmentDecorations } from './Environment';
import { GAME_SPEED, LANE_POSITIONS, LANE_SWITCH_SPEED, LANE_SWITCH_COOLDOWN } from '../constants/game';
import { GameState, Question } from '../types/game'; // Import Question type
// import Coins from './Coins'; // Ensure Coins component is imported
import { UserData } from '../types/userData';
import { useLoader } from '@react-three/fiber';

// Add debug logging utility
const DEBUG = true;
const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
  }
};

// Add these constants at the top of the file
const SWIPE_THRESHOLD = 50; // Minimum swipe distance to trigger lane change
const SWIPE_TIMEOUT = 300; // Maximum time in ms for a swipe

// Define Road component at the top level
function Road() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[15, 200]} /> {/* Increased length from 100 to 200 */}
      <meshStandardMaterial color="#333333" />
    </mesh>
  );
}

// Define PlayerCar component
function PlayerCar({ position, targetPosition, handleCoinCollect }: { 
  position: [number, number, number], 
  targetPosition: number,
  handleCoinCollect: (id: number) => void 
}) {

  const { scene } = useGLTF(`${process.env.PUBLIC_URL}/models/car.glb`)

  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const currentPos = useRef(position[0]);
  const lastUpdateTime = useRef(0);
  const isMoving = useRef(false);
  
  const MIN_UPDATE_INTERVAL = 16;
  const COLLISION_BOX = { width: 2, height: 1, depth: 4 };

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const now = performance.now();
    if (now - lastUpdateTime.current < MIN_UPDATE_INTERVAL) return;

    try {
      const targetDiff = targetPosition - currentPos.current;
      const threshold = 0.01; // Small threshold to consider movement complete

      if (Math.abs(targetDiff) > threshold) {
        isMoving.current = true;
        debugLog('Movement update', {
          currentPos: currentPos.current,
          targetPos: targetPosition,
          diff: targetDiff
        });

        const maxStep = LANE_SWITCH_SPEED;
        const step = Math.sign(targetDiff) * Math.min(Math.abs(targetDiff), maxStep);
        currentPos.current += step;

        const newPosition = new Vector3(
          currentPos.current,
          position[1],
          position[2]
        );

        rigidBodyRef.current.setTranslation(newPosition, true);
        
        // Add tilt effect during movement
        const rotationAngle = Math.max(-0.2, Math.min(0.2, -step * 0.5));
        const newRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, rotationAngle)
        );
        rigidBodyRef.current.setRotation(newRotation, true);
        
        lastUpdateTime.current = now;
      } else if (isMoving.current) {
        // Snap to exact position when very close
        currentPos.current = targetPosition;
        rigidBodyRef.current.setTranslation(
          new Vector3(targetPosition, position[1], position[2]),
          true
        );
        // Reset rotation when movement complete
        rigidBodyRef.current.setRotation(new THREE.Quaternion(), true);
        isMoving.current = false;
        debugLog('Movement complete', { finalPosition: targetPosition });
      }
    } catch (error) {
      console.error('Error during PlayerCar movement:', error);
    }
  });

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      position={position} 
      type="kinematicPosition"
      colliders={false}
      userData={{ type: 'PlayerCar', id: 'player' } as UserData}
      onCollisionEnter={(event) => {
        debugLog('PlayerCar collision raw event:', event);
        
        const otherCollider = event.other;
        debugLog('PlayerCar collision detected with:', {
          otherType: otherCollider.rigidBodyObject?.userData?.type,
          playerPos: rigidBodyRef.current?.translation(),
          otherPos: otherCollider.rigidBodyObject?.position,
          hasRigidBody: !!otherCollider.rigidBodyObject,
          hasUserData: !!otherCollider.rigidBodyObject?.userData
        });
      }}
    >
      <CuboidCollider 
        args={[COLLISION_BOX.width / 2, COLLISION_BOX.height / 2, COLLISION_BOX.depth / 2]}
        sensor={false} // Ensure sensor is false on collider
        onCollisionEnter={(event) => {
          debugLog('PlayerCar collider collision:', {
            otherType: event.other.rigidBodyObject?.userData?.type,
            otherData: event.other.rigidBodyObject?.userData
          });
          
          /* Comment out coin collision handling
          if (event.other.rigidBodyObject?.userData?.type === 'Coin') {
            const coinId = event.other.rigidBodyObject.userData.coinId;
            debugLog('Coin collision detected:', { coinId });
            handleCoinCollect(coinId);
          }
          */
        }}
      />
      <group scale={[0.5, 0.5, 0.5]}>
        {scene ? (
          <primitive object={scene.clone()} />
        ) : (
          <mesh castShadow>
            <boxGeometry args={[COLLISION_BOX.width, COLLISION_BOX.height, COLLISION_BOX.depth]} />
            <meshStandardMaterial color="red" wireframe />
          </mesh>
        )}
      </group>
    </RigidBody>
  );
}

// Define MovingLaneDividers component
function MovingLaneDividers({ gameState }: { gameState: GameState }) {
  const dividerRefs = useRef<Array<{ position: Vector3 }>>([]);
  const spacing = 10;
  const numMarkers = 20;

  useFrame((state, delta) => {
    if (!gameState.isPlaying) return; // Stop movement if game not playing
    
    const moveAmount = GAME_SPEED * gameState.multiplier * delta * 60;
    
    dividerRefs.current.forEach(marker => {
      marker.position.z += moveAmount;
      if (marker.position.z > 20) {
        marker.position.z -= spacing * numMarkers;
      }
    });
  });

  return (
    <>
      {[-2, 2].map((x, laneIndex) => (
        Array.from({ length: numMarkers }).map((_, index) => (
          <mesh
            key={`${laneIndex}-${index}`}
            position={[x, 0.01, -spacing * index]}
            rotation={[-Math.PI / 2, 0, 0]}
            ref={(ref: any) => {
              if (ref) {
                if (!dividerRefs.current[laneIndex * numMarkers + index]) {
                  dividerRefs.current[laneIndex * numMarkers + index] = ref;
                }
              }
            }}
          >
            <planeGeometry args={[0.2, 3]} />
            <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
          </mesh>
        ))
      ))}
    </>
  );
}

// Update the OraclePresence component
function OraclePresence({ feedback, onRequestHint, currentQuestion }: { 
  feedback: GameState['oracleFeedback'], 
  onRequestHint: () => void,
  currentQuestion: Question | null // Add this prop
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed bottom-10 right-10 z-50"
    >
      <div className="flex flex-col items-end gap-4">
        {/* Always show the current hint if there's a question */}
        {currentQuestion && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            className="max-w-md p-6 rounded-lg shadow-xl backdrop-blur-sm bg-blue-600/90 border border-blue-400/30 text-white"
          >
            <div className="flex items-start gap-4">
              <div className="flex-grow">
                <h3 className="text-xl font-semibold mb-2">Oracle's Hint</h3>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg"
                >
                  {currentQuestion.oracleHelp.hint}
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
        
        {/* Feedback Display */}
        {feedback && feedback.shown && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            className={`
              max-w-md p-6 rounded-lg shadow-xl backdrop-blur-sm
              ${feedback.type === 'hint' ? 'bg-blue-600/90 border-blue-400/30' :
                feedback.type === 'correction' ? 'bg-red-600/90 border-red-400/30' :
                'bg-green-600/90 border-green-400/30'}
              border text-white
            `}
          >
            <div className="flex items-start gap-4">
              <div className="flex-grow">
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg"
                >
                  {feedback.message}
                </motion.p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// Inside the Game component, add touch handling
export default function Game() {
  const [gameState, setGameState] = useState<GameState>({
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
    mistakeCount: 0,    // Add this
    hintsUsed: 0        // Add this
  });

  const targetLanePosition = useRef(LANE_POSITIONS[1]);
  const questionTimer = useRef<NodeJS.Timeout | null>(null);
  const lastLaneSwitch = useRef(0);
  const questionIdCounter = useRef(1);

  // Add these refs for touch handling
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number>(0);

  // Initialize first question
  useEffect(() => {
    showNextQuestion();
  }, []);

  const showNextQuestion = () => {
    const baseQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // Add id to question while maintaining all properties including signPath
    const question: Question = {
      ...baseQuestion,
      id: questionIdCounter.current++
    };
    
    setGameState(prev => ({
      ...prev,
      currentQuestion: question
    }));
  };

  const handleCollision = (isCorrect: boolean) => {
    debugLog('Collision detected:', {
      isCorrect,
      currentMode: gameState.oracleMode ? 'Oracle' : 'Normal',
      currentScore: gameState.score,
      currentQuestion: gameState.currentQuestion
    });

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
      // Original non-oracle mode logic with debugging
      if (isCorrect) {
        debugLog('Correct answer in normal mode', {
          previousScore: gameState.score,
          newScore: gameState.score + 100
        });

        setGameState(prev => ({
          ...prev,
          score: prev.score + 100,
          currentQuestion: null,
        }));
        setTimeout(showNextQuestion, 200);
      } else {
        debugLog('Wrong answer in normal mode', {
          currentLives: gameState.lives,
          newLives: gameState.lives - 1
        });

        setGameState(prev => {
          const newLives = prev.lives - 1;
          return {
            ...prev,
            lives: newLives,
            isGameOver: newLives <= 0,
          };
        });
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

  // Update keyboard controls with debuggingYes
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (gameState.isGameOver) {
        debugLog('Key press ignored - game over');
        return;
      }

      const now = performance.now();
      const timeSinceLastSwitch = now - lastLaneSwitch.current;
      
      if (timeSinceLastSwitch < LANE_SWITCH_COOLDOWN) {
        debugLog('Key press ignored - cooldown active', {
          timeSinceLastSwitch,
          cooldown: LANE_SWITCH_COOLDOWN
        });
        return;
      }

      let newLane = gameState.currentLane;
      
      switch (e.key) {
        case 'ArrowLeft':
          if (gameState.currentLane > 0) {
            newLane = gameState.currentLane - 1;
            debugLog('Left arrow pressed', { from: gameState.currentLane, to: newLane });
          }
          break;
        case 'ArrowRight':
          if (gameState.currentLane < 2) {
            newLane = gameState.currentLane + 1;
            debugLog('Right arrow pressed', { from: gameState.currentLane, to: newLane });
          }
          break;
        default:
          return;
      }

      if (newLane !== gameState.currentLane) {
        lastLaneSwitch.current = now;
        setGameState(prev => ({
          ...prev,
          currentLane: newLane,
        }));
        targetLanePosition.current = LANE_POSITIONS[newLane];
        debugLog('Lane change initiated', {
          newLane,
          targetPosition: LANE_POSITIONS[newLane]
        });
      }
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
  }, [gameState.isGameOver, gameState.currentLane]); // Added currentLane as dependency

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
  const startGame = () => {
    setGameState(prev => ({ 
      ...prev, 
      isPlaying: true,
      currentLane: 1,
      score: 0,
      lives: 3,
      coinsCollected: 0,
      mistakeCount: 0,
      hintsUsed: 0
    }));
    showNextQuestion();
  };

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

  return (
    // Add touch-action CSS to prevent default touch behaviors
    <div className="w-full h-screen" style={{ touchAction: 'none' }} onTouchStart={(e: React.TouchEvent) => handleTouchStart(e.nativeEvent)} onTouchEnd={(e: React.TouchEvent) => handleTouchEnd(e.nativeEvent)}>
      {/* Game Menu */}
      {!gameState.isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/80">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-lg text-center"
          >
            <h2 className="text-3xl font-bold mb-6">Road Safety Game</h2>
            
            {/* Oracle Mode Toggle */}
            <div className="mb-6 flex items-center justify-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={gameState.oracleMode}
                  onChange={(e) => setGameState(prev => ({
                    ...prev,
                    oracleMode: e.target.checked
                  }))}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 
                              peer-focus:ring-blue-300 rounded-full peer 
                              peer-checked:after:translate-x-full peer-checked:after:border-white 
                              after:content-[''] after:absolute after:top-[2px] after:left-[2px] 
                              after:bg-white after:border-gray-300 after:border after:rounded-full 
                              after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600">
                </div>
                <span className="ml-3 text-sm font-medium text-gray-900">Oracle Mode</span>
              </label>
              <div className="group relative">
                <span className="cursor-help text-gray-500">ⓘ</span>
                <div className="invisible group-hover:visible absolute left-6 top-0 w-64 p-2 
                              bg-gray-800 text-white text-xs rounded shadow-lg">
                  Oracle Mode provides detailed feedback when you answer incorrectly
                </div>
              </div>
            </div>

            <button
              onClick={startGame}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 
                       rounded-lg font-semibold transition-colors"
            >
              Start Game
            </button>
          </motion.div>
        </div>
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
      <div className="absolute top-0 left-0 w-full p-4 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/50 text-white p-4 rounded-lg max-w-4xl mx-auto"
        >
          <div className="flex justify-between items-center">
            <p className="text-2xl">Score: {gameState.score}</p>
            <div className="flex items-center gap-2">
              <p className="text-2xl">Lives: </p>
              {/* Display hearts based on remaining lives */}
              {Array.from({ length: gameState.lives }).map((_, i) => (
                <span key={i} className="text-2xl text-red-500">❤️</span>
              ))}
            </div>
          </div>
          {gameState.currentQuestion && (
            <div className="mt-4 flex flex-col items-center">
              <p className="text-xl mb-4 text-center max-w-2xl"> {/* Added max-width and center alignment */}
                {gameState.currentQuestion.text}
              </p>
              {/* Ensure sign image is displayed with proper styling */}
              {gameState.currentQuestion.signPath && (
                <div className="bg-white/10 rounded-lg p-4 mb-4">
                  <img 
                    src={gameState.currentQuestion.signPath} 
                    alt="Traffic Sign"
                    className="w-40 h-40 object-contain"
                    style={{ imageRendering: 'crisp-edges' }}
                  />
                </div>
              )}
              {/* Add option preview */}
              <div className="grid grid-cols-3 gap-4 w-full mt-4">
                {gameState.currentQuestion.options.map((option, index) => (
                  <div 
                    key={index}
                    className="bg-blue-500/50 p-3 rounded text-sm text-center break-words"
                  >
                    {option}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
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
            <p className="text-xl mb-4">Final Score: {gameState.score}</p>
            {/* Comment out coins display */}
            {/* <p className="text-xl mb-6">Coins Collected: {gameState.coinsCollected}</p> */}
            <button
              onClick={() => {
                // Reset game state
                setGameState({
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
                  isPlaying: true,
                  mistakeCount: 0,    // Add this
                  hintsUsed: 0        // Add this
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

      {/* 3D Game Scene */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 5, 10]} />
        
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
        
        <Physics paused={!gameState.isPlaying}>
          <Road />
          {gameState.isPlaying && (
            <>
              <PlayerCar 
                position={[LANE_POSITIONS[gameState.currentLane], 1.0, 0]}
                targetPosition={targetLanePosition.current}
                handleCoinCollect={handleCoinCollect}
              />
              <MovingLaneDividers gameState={gameState} />
              <EnvironmentDecorations gameState={gameState} />
              {gameState.currentQuestion && (
                <MovingAnswerOptions 
                  question={gameState.currentQuestion}
                  onCollision={handleCollision}
                  gameState={gameState}
                />
              )}
            </>
          )}
        </Physics>
      </Canvas>

      {/* Add Oracle Presence when Oracle Mode is enabled */}
      {gameState.oracleMode && (
        <OraclePresence 
          feedback={gameState.oracleFeedback}
          onRequestHint={handleHintRequest}
          currentQuestion={gameState.currentQuestion} // Pass the current question
        />
      )}
    </div>
  );
}

// Update the MovingAnswerOptions component
function MovingAnswerOptions({ question, onCollision, gameState }: { 
  question: Question, 
  onCollision: (isCorrect: boolean) => void,
  gameState: GameState 
}) {
  const optionsGroupRef = useRef<THREE.Group>(null);
  const hasCollided = useRef(false);
  const resetPosition = useRef(false);
  const initialZ = -180;

  useFrame((state, delta) => {
    if (!gameState.isPlaying) return; // Stop movement if game not playing
    
    if (!optionsGroupRef.current || resetPosition.current) return;

    const currentZ = optionsGroupRef.current.position.z;
    
    // Check for collision based on position
    if (currentZ > -2 && currentZ < 2) {  // Collision zone
      const playerLane = gameState.currentLane;
      question.options.forEach((_, index) => {
        if (index === playerLane && !hasCollided.current) {
          debugLog('Position-based collision detected', {
            optionIndex: index,
            playerLane,
            optionZ: currentZ
          });
          handleCollision(index);
        }
      });
    }

    // Move options forward
    optionsGroupRef.current.position.z += GAME_SPEED * gameState.multiplier;
    
    if (currentZ > -5 && currentZ < 5) {
      debugLog('Options near player', {
        optionsZ: currentZ,
        playerLane: gameState.currentLane
      });
    }
    
    // Reset if passed the player
    if (currentZ > 10) {
      resetPosition.current = true;
      optionsGroupRef.current.visible = false;
      optionsGroupRef.current.position.z = initialZ;
      
      setTimeout(() => {
        if (optionsGroupRef.current) {
          optionsGroupRef.current.visible = true;
          resetPosition.current = false;
          hasCollided.current = false;
        }
      }, 500);
    }
  });

  const handleCollision = (index: number) => {
    if (!hasCollided.current && !resetPosition.current) {
      hasCollided.current = true;
      const isCorrect = index === question.correctAnswer;
      
      debugLog('Processing collision', {
        isCorrect,
        index,
        correctAnswer: question.correctAnswer
      });
      
      if (isCorrect && optionsGroupRef.current) {
        resetPosition.current = true;
        optionsGroupRef.current.visible = false;
      }
      
      onCollision(isCorrect);
    }
  };

  // Reset refs when question changes
  useEffect(() => {
    hasCollided.current = false;
    resetPosition.current = false;
    if (optionsGroupRef.current) {
      optionsGroupRef.current.position.z = initialZ;
      optionsGroupRef.current.visible = true;
    }
  }, [question]);

  return (
    <group ref={optionsGroupRef} position={[0, 0, initialZ]} name="optionsGroup">
      {question.options.map((option, index) => {
        const lanePosition = LANE_POSITIONS[index];
        return (
          <RigidBody
            key={index}
            position={[lanePosition, 1, 0]}
            type="fixed"
            colliders="cuboid"
            sensor={true}
          >
            <CuboidCollider 
              args={[2, 1.5, 0.5]} // Increased width and height
              sensor={true}
            />
            <mesh>
              <boxGeometry args={[4, 3, 1]} /> {/* Increased width and height */}
              <meshStandardMaterial color="#4a90e2" />
            </mesh>
            <Text
              position={[0, 0, 0.6]}
              fontSize={0.3} // Reduced font size
              color="white"
              anchorX="center"
              anchorY="middle"
              maxWidth={3.5} // Add max width
              textAlign="center" // Center align text
              lineHeight={1.2} // Add line height
              overflowWrap="break-word" // Break words when necessary
            >
              {option}
            </Text>
          </RigidBody>
        );
      })}
    </group>
  );
}

