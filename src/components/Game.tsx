import { Canvas, useFrame } from '@react-three/fiber';
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Physics, RigidBody, CuboidCollider } from '@react-three/rapier';
import { Environment, PerspectiveCamera, useGLTF, Text, Sky, Stars } from '@react-three/drei';
import { Vector3 } from 'three';
import { questions } from '../data/questions';
import { lerp } from 'three/src/math/MathUtils';
import * as THREE from 'three';
import { EnvironmentDecorations } from './Environment';
import { GAME_SPEED } from '../constants/game';
import { GameState, Question } from '../types/game'; // Import Question type

// Remove the local Question interface since we're importing it

const LANE_WIDTH = 4;
const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH];
const LANE_SWITCH_SPEED = 0.2;
const LANE_SWITCH_COOLDOWN = 300;

// Add debug logging utility
const DEBUG = true;
const debugLog = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[Game Debug] ${message}`, data || '');
  }
};

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
    isMoving: true
  });

  const targetLanePosition = useRef(LANE_POSITIONS[1]);
  const questionTimer = useRef<NodeJS.Timeout | null>(null);
  const lastLaneSwitch = useRef(0);
  const questionIdCounter = useRef(1);

  // Initialize first question
  useEffect(() => {
    showNextQuestion();
  }, []);

  const showNextQuestion = () => {
    const baseQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // Add id to question
    const question: Question = {
      id: questionIdCounter.current++,
      text: baseQuestion.text,
      options: [...baseQuestion.options],
      correctAnswer: baseQuestion.correctAnswer
    };
    
    setGameState(prev => ({
      ...prev,
      currentQuestion: question
    }));
  };

  const handleCollision = (isCorrect: boolean) => {
    debugLog('Main collision handler called', { isCorrect });
    
    if (isCorrect) {
      debugLog('Correct answer selected, updating score');
      setGameState(prev => {
        const newState = {
          ...prev,
          score: prev.score + 100,
          currentQuestion: null,
          multiplier: 1, // Changed from speedMultiplier to multiplier
        };
        debugLog('New game state after correct answer', newState);
        return newState;
      });
      
      // Add a small delay before showing next question
      setTimeout(() => {
        debugLog('Showing next question');
        showNextQuestion();
      }, 200);
    } else {
      debugLog('Incorrect answer, increasing speed');
      setGameState(prev => ({
        ...prev,
        multiplier: prev.multiplier + 0.2, // Changed from speedMultiplier to multiplier
      }));
    }
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

    window.addEventListener('keydown', handleKeyPress);
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      if (questionTimer.current) {
        clearTimeout(questionTimer.current);
      }
    };
  }, [gameState.isGameOver, gameState.currentLane]); // Added currentLane as dependency

  // Add debug logging for game state changes
  useEffect(() => {
    console.log('[Game Debug] Game state updated:', {
      multiplier: gameState.multiplier,
      currentLane: gameState.currentLane,
      timestamp: performance.now()
    });
  }, [gameState.multiplier, gameState.currentLane]);

  return (
    <div className="w-full h-screen">
      {/* Game UI Overlay */}
      <div className="absolute top-0 left-0 w-full p-4 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-black/50 text-white p-4 rounded-lg"
        >
          <p className="text-2xl">Score: {gameState.score}</p>
          {gameState.currentQuestion && (
            <div className="mt-4">
              <p className="text-xl">{gameState.currentQuestion.text}</p>
            </div>
          )}
        </motion.div>
      </div>

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
        
        <Physics debug={false}>
          <Road />
          <PlayerCar 
            position={[LANE_POSITIONS[gameState.currentLane], 1.0, 0]}
            targetPosition={targetLanePosition.current}
          />
          <MovingLaneDividers gameState={gameState} />
          
          {/* Pass isMoving to EnvironmentDecorations */}
          <EnvironmentDecorations gameState={gameState} />
          
          {gameState.currentQuestion && (
            <MovingAnswerOptions 
              question={gameState.currentQuestion}
              onCollision={handleCollision}
              gameState={gameState}
            />
          )}
        </Physics>
      </Canvas>
    </div>
  );
}

function Road() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[15, 200]} /> // Increased length from 100 to 200
      <meshStandardMaterial color="#333333" />
    </mesh>
  );
}

function MovingLaneDividers({ gameState }: { gameState: GameState }) {
  const dividerRefs = useRef<Array<{ position: Vector3 }>>([]);
  const spacing = 10; // Space between markers
  const numMarkers = 20; // Number of markers per lane

  useFrame((state, delta) => {
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

function PlayerCar({ position, targetPosition }: { position: [number, number, number], targetPosition: number }) {
  const { scene } = useGLTF('/models/car.glb');
  const rigidBodyRef = useRef<any>(null);
  const currentPos = useRef(position[0]);
  const lastUpdateTime = useRef(0);
  const isMoving = useRef(false);
  const MIN_UPDATE_INTERVAL = 16;

  useFrame((state, delta) => {
    if (!rigidBodyRef.current) return;

    const now = performance.now();
    if (now - lastUpdateTime.current < MIN_UPDATE_INTERVAL) return;

    try {
      const targetDiff = targetPosition - currentPos.current;
      const threshold = 0.01; // Small threshold to consider movement complete

      // Only log when actually moving
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
      console.error('Physics update error:', error);
    }
  });

  return (
    <RigidBody 
      ref={rigidBodyRef} 
      position={position} 
      type="kinematicPosition"
      colliders="cuboid"
      sensor={true}  // Add this
      lockRotations={true}
      enabledRotations={[false, false, true]}
    >
      <group scale={[0.5, 0.5, 0.5]}>
        <CuboidCollider 
          args={[1, 0.5, 2]}  // Add this - width, height, depth
          sensor={true}
        />
        {scene ? (
          <primitive object={scene.clone()} />
        ) : (
          <mesh castShadow>
            <boxGeometry args={[2, 1, 4]} />
            <meshStandardMaterial color="red" />
          </mesh>
        )}
      </group>
    </RigidBody>
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
    optionsGroupRef.current.position.z += GAME_SPEED * gameState.multiplier; // Changed from speedMultiplier to multiplier
    
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
    debugLog('Collision handler called', {
      index,
      hasCollided: hasCollided.current,
      resetPosition: resetPosition.current,
      correctAnswer: question.correctAnswer
    });

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
              args={[1.5, 1, 0.5]}  // Width, height, depth
              sensor={true}
            />
            <mesh>
              <boxGeometry args={[3, 2, 1]} />
              <meshStandardMaterial color="#4a90e2" />
            </mesh>
            <Text
              position={[0, 0, 0.6]}
              fontSize={0.5}
              color="white"
              anchorX="center"
              anchorY="middle"
            >
              {option}
            </Text>
          </RigidBody>
        );
      })}
    </group>
  );
}

