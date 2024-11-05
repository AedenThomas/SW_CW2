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
import { GAME_SPEED, LANE_SWITCH_SPEED, LANE_SWITCH_COOLDOWN } from '../constants/game';
import { GameState, Question } from '../types/game'; // Import Question type
import { UserData } from '../types/userData';


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
const LANE_POSITIONS = [-5, 0, 5]; // Make sure these match your desired positions

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

    try {
      const targetDiff = targetPosition - currentPos.current;
      
      if (Math.abs(targetDiff) > 0.01) {
        if (!isMoving.current) {
          console.log('Starting car movement:', {
            currentPosition: currentPos.current,
            targetPosition,
            difference: targetDiff,
            time: new Date().toISOString()
          });
          isMoving.current = true;
        }

        // Use a smaller lerp factor for smoother movement
        const lerpFactor = 0.08;
        currentPos.current = lerp(currentPos.current, targetPosition, lerpFactor);

        const newPosition = new Vector3(
          currentPos.current,
          position[1],
          position[2]
        );

        rigidBodyRef.current.setTranslation(newPosition, true);
        
        // Smoother tilt effect
        const tiltAmount = Math.min(Math.max(targetDiff * -0.1, -0.15), 0.15);
        const newRotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, tiltAmount)
        );
        rigidBodyRef.current.setRotation(newRotation, true);
      } else if (isMoving.current) {
        console.log('Finished car movement:', {
          finalPosition: currentPos.current,
          targetReached: targetPosition,
          time: new Date().toISOString()
        });
        
        // Snap to exact position
        currentPos.current = targetPosition;
        rigidBodyRef.current.setTranslation(
          new Vector3(targetPosition, position[1], position[2]),
          true
        );
        rigidBodyRef.current.setRotation(new THREE.Quaternion(), true);
        isMoving.current = false;
      }
    } catch (error) {
      console.error('Car movement error:', error);
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
      <group scale={[0.5, 0.5, 0.5]} rotation={[0, Math.PI, 0]}>
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
              console.log('Moving left:', {
                fromLane: prev.currentLane,
                toLane: newLane,
                newPosition: targetLanePosition.current
              });
            }
            break;
          case 'ArrowRight':
            if (prev.currentLane < 2) {
              newLane = prev.currentLane + 1;
              lastLaneSwitch.current = now;
              targetLanePosition.current = LANE_POSITIONS[newLane];
              console.log('Moving right:', {
                fromLane: prev.currentLane,
                toLane: newLane,
                newPosition: targetLanePosition.current
              });
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
        {/* Fuel display with text */}
        <div className="absolute top-4 left-4">
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

        {/* Question display with background */}
        {gameState.currentQuestion && (
          <div className="bg-[#3B50A1] border-4 border-white text-white p-4 rounded-lg max-w-4xl mx-auto">
            <div className="mt-4 flex flex-col items-center">
              <p className="text-xl mb-4 text-center max-w-2xl">
                {gameState.currentQuestion.text}
              </p>
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
              {/* <EnvironmentDecorations gameState={gameState} /> */}
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
              <planeGeometry args={[4, 3]} /> {/* Use planeGeometry for images */}
              <meshStandardMaterial 
                map={new THREE.TextureLoader().load(option)} 
                transparent={true}
              />
            </mesh>
            {/* Remove Text component and use image */}
          </RigidBody>
        );
      })}
    </group>
  );
}

// First, add this SVG component at the top level of the file
function FuelIcon({ depleted }: { depleted?: boolean }) {
  return (
    <svg 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="currentColor" 
      xmlns="http://www.w3.org/2000/svg"
      className={`transition-opacity duration-300 ${
        depleted 
          ? 'text-red-400 opacity-30' // Depleted fuel appears faded
          : 'text-red-500 opacity-100' // Active fuel is fully visible
      }`}
    >
      <path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11c-.94.36-1.61 1.26-1.61 2.33 0 1.38 1.12 2.5 2.5 2.5.36 0 .69-.08 1-.21v7.21c0 .55-.45 1-1 1s-1-.45-1-1V14c0-1.1-.9-2-2-2h-1V5c0-1.1-.9-2-2-2H6c-1.1 0-2 .9-2 2v16h10v-7.5h1.5v5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V9c0-.69-.28-1.32-.73-1.77zM12 10H6V5h6v5zm6 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
    </svg>
  );
}

