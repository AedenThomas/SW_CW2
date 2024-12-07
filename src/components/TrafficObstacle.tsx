import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { GAME_SPEED } from '../constants/game';
import { LANE_POSITIONS, initialZ } from '../constants/game';
import { GameState } from '../types/game';
import { Dispatch, SetStateAction } from 'react';
import { SAFE_ZONE_AFTER, SAFE_ZONE_BEFORE } from '../constants/game';
import { calculateMoveAmount } from '../utils/movement';
import { audioManager } from '../utils/audio';

const OBSTACLE_MODELS = [
  `${process.env.PUBLIC_URL}/models/traffic6.glb`,
  `${process.env.PUBLIC_URL}/models/traffic5.glb`,
  `${process.env.PUBLIC_URL}/models/traffic7.glb`,
];

export const NUM_OBSTACLES = 3;
const SPAWN_INTERVAL = 80; // Increased from 40 to 80 for better spacing
const DEBUG_SAFE_ZONES = true;

// Define zones where obstacles can and cannot spawn
const ZONES = {
  DANGER: {
    START: -2,
    END: 2
  },
  OPTIONS: {
    START: -140,  // Increased safe zone before options
    END: 140      // Increased safe zone after options
  },
  SPAWN: {
    MIN: -400,    // Minimum spawn distance
    MAX: -160     // Maximum spawn distance
  }
};

// Create fixed spawn positions for better distribution
const FIXED_SPAWN_POSITIONS = [
  ZONES.SPAWN.MIN,
  ZONES.SPAWN.MIN + SPAWN_INTERVAL,
  ZONES.SPAWN.MIN + (SPAWN_INTERVAL * 2)
];

export interface TrafficObstacleProps {
  index: number;
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  onRespawn: () => void;
  initialZ: number;
  activeOptionZones: Array<{ start: number; end: number; }>;
  setShowObstacleCollisionFlash: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TrafficObstacle({ 
  gameState, 
  setGameState,
  onRespawn,
  index,
  initialZ,
  activeOptionZones,
  setShowObstacleCollisionFlash,
}: TrafficObstacleProps) {
  const lane = useRef(Math.floor(Math.random() * 3));
  const modelIndex = useRef(Math.floor(Math.random() * OBSTACLE_MODELS.length));
  const { scene } = useGLTF(OBSTACLE_MODELS[modelIndex.current]);
  const obstacleRef = useRef<any>(null);
  const hasCollided = useRef(false);
  
  const currentPosition = useRef({
    x: LANE_POSITIONS[lane.current],
    y: 0.5,
    z: FIXED_SPAWN_POSITIONS[index] // Use fixed spawn positions
  });

  const isInSafeZone = (zPosition: number): boolean => {
    // Check if position is in any of the safe zones
    return activeOptionZones.some(zone => {
      const isInZone = zPosition >= ZONES.OPTIONS.START && zPosition <= ZONES.OPTIONS.END;
      
      if (DEBUG_SAFE_ZONES && isInZone) {
      }
      return isInZone;
    });
  };

  const getNextSpawnPosition = (): number => {
    // Start from the fixed spawn position for this obstacle
    let position = FIXED_SPAWN_POSITIONS[index];
    
    if (DEBUG_SAFE_ZONES) {
    }

    return position;
  };

  // Initialize position
  useEffect(() => {
    const spawnPos = getNextSpawnPosition();
    currentPosition.current.z = spawnPos;
    
    if (DEBUG_SAFE_ZONES) {
    }
  }, [index]);

  useFrame((state, delta) => {
    if (!gameState.isPlaying || gameState.isPaused || !obstacleRef.current) return;

    const moveAmount = calculateMoveAmount(gameState, delta, GAME_SPEED);
    currentPosition.current.z += moveAmount;

    // Collision detection
    if (currentPosition.current.z > ZONES.DANGER.START && 
        currentPosition.current.z < ZONES.DANGER.END && 
        !hasCollided.current) {
      const effectiveLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;
      
      if (effectiveLane === lane.current) {
        audioManager.playObstacleHitSound();
        hasCollided.current = true;
        setShowObstacleCollisionFlash(true);
        setGameState(prev => ({
          ...prev,
          lives: prev.lives - 1,
          isGameOver: prev.lives <= 1
        }));
        
        setTimeout(() => {
          setShowObstacleCollisionFlash(false);
        }, 1500);
      }
    }

    // Respawn logic
    if (currentPosition.current.z > 15) {
      hasCollided.current = false;
      
      // Choose new lane avoiding player's current lane
      let newLane;
      do {
        newLane = Math.floor(Math.random() * 3);
      } while (newLane === gameState.currentLane);
      
      lane.current = newLane;

      // Get new spawn position
      const newZ = getNextSpawnPosition();

      if (DEBUG_SAFE_ZONES) {
      }

      currentPosition.current = {
        x: LANE_POSITIONS[lane.current],
        y: 0.5,
        z: newZ
      };

      onRespawn();
    }

    obstacleRef.current.setTranslation(
      new Vector3(
        currentPosition.current.x,
        currentPosition.current.y,
        currentPosition.current.z
      )
    );
  });

  return (
    <RigidBody
      ref={obstacleRef}
      type="kinematicPosition"
      colliders={false}
      position={[
        currentPosition.current.x,
        currentPosition.current.y,
        currentPosition.current.z
      ]}
    >
      <primitive 
        object={scene.clone()} 
        scale={modelIndex.current === 2 ? [0.84, 0.84, 0.84] : [1.12, 1.12, 1.12]}
        position={[0, 0, 0]}
        rotation={modelIndex.current === 0 ? [0, -Math.PI / 2, 0] : [0, Math.PI / 2, 0]}
      />
    </RigidBody>
  );
}