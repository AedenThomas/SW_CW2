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

const OBSTACLE_MODELS = [
  `${process.env.PUBLIC_URL}/models/traffic6.glb`,
  `${process.env.PUBLIC_URL}/models/traffic5.glb`,
  `${process.env.PUBLIC_URL}/models/traffic7.glb`,
];

export const NUM_OBSTACLES = 3; // Number of simultaneous obstacles
const SPAWN_INTERVAL = 40; // Distance between obstacles

interface TrafficObstacleProps {
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
  onRespawn: () => void;
  index: number; // Add index prop to stagger obstacles
  initialZ: number; // Add initialZ prop
  activeOptionZones: { start: number; end: number; }[]; // Add activeOptionZones prop
  setShowObstacleCollisionFlash: (show: boolean) => void; // Add this line
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
  
  // Add this to track the actual position
  const currentPosition = useRef({
    x: LANE_POSITIONS[lane.current],
    y: 0.5,
    z: initialZ + (index * SPAWN_INTERVAL)
  });

  useFrame((state, delta) => {
    if (!gameState.isPlaying || gameState.isPaused || !obstacleRef.current) return;

    const moveAmount = calculateMoveAmount(gameState, delta, GAME_SPEED);
    currentPosition.current.z += moveAmount;

    // Check for collision based on position
    if (currentPosition.current.z > -2 && currentPosition.current.z < 2 && !hasCollided.current) {
      const effectiveLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;
      
      if (effectiveLane === lane.current) {
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

    // Reset position if passed player
    if (currentPosition.current.z > 15) {
      hasCollided.current = false;
      lane.current = Math.floor(Math.random() * 3);
      
      // Ensure new lane is different from player's current lane
      while (lane.current === gameState.currentLane) {
        lane.current = Math.floor(Math.random() * 3);
      }

      // Calculate new spawn position
      let newZ = initialZ + (index * SPAWN_INTERVAL);
      
      // Check and adjust for safe zones
      const matchingZone = activeOptionZones.find(zone => 
        newZ >= zone.start && newZ <= zone.end
      );

      if (matchingZone) {
        newZ = matchingZone.end + SAFE_ZONE_AFTER;
      }

      // Update position
      currentPosition.current = {
        x: LANE_POSITIONS[lane.current],
        y: 0.5,
        z: newZ
      };

      onRespawn();
    }

    // Update obstacle position
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