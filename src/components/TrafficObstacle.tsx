import { useGLTF } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { GAME_SPEED } from '../constants/game';
import { LANE_POSITIONS } from './Game';
import { GameState } from '../types/game';
import { Dispatch, SetStateAction } from 'react';
import { SAFE_ZONE_AFTER, SAFE_ZONE_BEFORE } from '../constants/game';

const OBSTACLE_MODELS = [
    `${process.env.PUBLIC_URL}/models/traffic1.glb`,
    `${process.env.PUBLIC_URL}/models/traffic2.glb`,
    `${process.env.PUBLIC_URL}/models/traffic3.glb`,
    `${process.env.PUBLIC_URL}/models/traffic4.glb`
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
  targetLane: number | null; // Add this prop
}

export function TrafficObstacle({ 
  gameState, 
  setGameState,
  onRespawn,
  index,
  initialZ,
  activeOptionZones, // Receive activeOptionZones
  targetLane // Receive targetLane prop
}: TrafficObstacleProps) {
  const lane = useRef(Math.floor(Math.random() * 3));
  const modelIndex = useRef(Math.floor(Math.random() * OBSTACLE_MODELS.length));
  const { scene } = useGLTF(OBSTACLE_MODELS[modelIndex.current]);
  const obstacleRef = useRef<any>(null);

  // Define proximity range at component level
  const PROXIMITY_Z = 15;

  // Use a ref to store the current Z position
  const currentZ = useRef<number>(initialZ + (index * SPAWN_INTERVAL));

  // Add collision state ref
  const hasCollided = useRef(false);

  useEffect(() => {
    if (obstacleRef.current) {
      const spawnZ = initialZ + (index * SPAWN_INTERVAL);
      
      // Find the first zone that includes spawnZ
      const matchingZone = activeOptionZones.find(zone => 
        spawnZ >= zone.start && spawnZ <= zone.end
      );

      if (matchingZone) {
        // Adjust spawnZ to be after the safe zone using SAFE_ZONE_AFTER
        obstacleRef.current.setTranslation(
          new Vector3(LANE_POSITIONS[lane.current], 0, matchingZone.end + SAFE_ZONE_AFTER)
        );
      } else {
        obstacleRef.current.setTranslation(
          new Vector3(LANE_POSITIONS[lane.current], 0, spawnZ)
        );
      }
    }
  }, [initialZ, index, activeOptionZones]);

  useFrame((state, delta) => {
    if (!gameState.isPlaying || !obstacleRef.current) return;

    const currentPos = obstacleRef.current.translation();
    
    // Move obstacle forward
    const newZ = currentPos.z + GAME_SPEED * gameState.speed * gameState.multiplier;
    obstacleRef.current.setTranslation(
      new Vector3(
        currentPos.x,
        0,
        newZ
      )
    );

    // Update currentZ ref
    currentZ.current = newZ;

    // Check for collision using effectiveLane
    if (newZ > -2 && newZ < 2 && !hasCollided.current) {
      // Use targetLane if available, otherwise use current lane
      const effectiveLane = targetLane !== null ? targetLane : gameState.currentLane;
      
      if (effectiveLane === lane.current) {
        console.log('[Obstacle] Collision detected:', {
          obstacleLane: lane.current,
          playerCurrentLane: gameState.currentLane,
          playerTargetLane: targetLane,
          effectiveLane,
          obstacleZ: newZ,
          time: Date.now()
        });
        
        hasCollided.current = true;
        setGameState(prev => ({
          ...prev,
          lives: prev.lives - 1,
          isGameOver: prev.lives <= 1
        }));
      }
    }

    // Respawn logic
    if (newZ > 15) {
      hasCollided.current = false;
      lane.current = Math.floor(Math.random() * 3);
      
      // Ensure new lane is different from player's effective lane
      const effectiveLane = targetLane !== null ? targetLane : gameState.currentLane;
      while (lane.current === effectiveLane) {
        lane.current = Math.floor(Math.random() * 3);
      }
      
      modelIndex.current = Math.floor(Math.random() * OBSTACLE_MODELS.length);
      
      let repositionedZ = initialZ + (index * SPAWN_INTERVAL);
      
      activeOptionZones.forEach(zone => {
        if (repositionedZ >= zone.start && repositionedZ <= zone.end) {
          repositionedZ = zone.end + SAFE_ZONE_AFTER;
        }
      });

      obstacleRef.current.setTranslation(
        new Vector3(LANE_POSITIONS[lane.current], 0, repositionedZ)
      );
      onRespawn();
    }
  });

  return (
    <RigidBody
      ref={obstacleRef}
      type="kinematicPosition"
      colliders={false}
      position={[LANE_POSITIONS[lane.current], 0, initialZ + (index * SPAWN_INTERVAL)]}
    >
      {/* Remove CuboidCollider since we're using position-based detection */}
      <primitive 
        object={scene.clone()} 
        scale={
          modelIndex.current === 3 ? [2.8, 2.8, 2.8] :
          modelIndex.current === 2 ? [2.1, 2.1, 2.1] :
          modelIndex.current === 1 ? [2.1, 2.1, 2.1] :
          [1.12, 1.12, 1.12]
        }
        position={[0, 0, 0]}
        rotation={
          modelIndex.current === 2 ? [0, Math.PI / 2, 0] :
          [0, Math.PI, 0]
        }
      />
    </RigidBody>
  );
}