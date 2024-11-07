import { useGLTF } from '@react-three/drei';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Vector3 } from 'three';
import { GAME_SPEED } from '../constants/game';
import { LANE_POSITIONS } from './Game';
import { GameState } from '../types/game';
import { Dispatch, SetStateAction } from 'react';

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
}

export function TrafficObstacle({ 
  gameState, 
  setGameState,
  onRespawn,
  index,
  initialZ
}: TrafficObstacleProps) {
  const lane = useRef(Math.floor(Math.random() * 3));
  const modelIndex = useRef(Math.floor(Math.random() * OBSTACLE_MODELS.length));
  const { scene } = useGLTF(OBSTACLE_MODELS[modelIndex.current]);
  const obstacleRef = useRef<any>(null);

  // Define proximity range at component level
  const PROXIMITY_Z = 15;

  // Use a ref to store the current Z position
  const currentZ = useRef<number>(initialZ + (index * SPAWN_INTERVAL));

  useEffect(() => {
    if (obstacleRef.current) {
      obstacleRef.current.setTranslation(
        new Vector3(LANE_POSITIONS[lane.current], 0, initialZ + (index * SPAWN_INTERVAL))
      );
      console.log(`[TrafficObstacle] Initialized at lane ${lane.current}, Z=${initialZ + (index * SPAWN_INTERVAL)}`);
    }
  }, [initialZ, index]);

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

    // Log obstacle's current position only when near the player
    if (newZ >= -PROXIMITY_Z && newZ <= PROXIMITY_Z) {
      console.log(`[TrafficObstacle] Moving obstacle to Z=${newZ.toFixed(3)}`);
    }

    // Reset position when passed player
    if (newZ > 15) {
      console.log(`[TrafficObstacle] Obstacle passed player. Resetting position.`);
      lane.current = Math.floor(Math.random() * 3);
      // Ensure new lane is different from player's current lane
      while (lane.current === gameState.currentLane) {
        lane.current = Math.floor(Math.random() * 3);
        console.log(`[TrafficObstacle] Reassigned to new lane ${lane.current} to avoid collision.`);
      }
      modelIndex.current = Math.floor(Math.random() * OBSTACLE_MODELS.length);
      
      // Reset position with proper spacing
      const repositionedZ = initialZ + (index * SPAWN_INTERVAL);
      obstacleRef.current.setTranslation(
        new Vector3(LANE_POSITIONS[lane.current], 0, repositionedZ)
      );
      console.log(`[TrafficObstacle] Obstacle repositioned to lane ${lane.current}, Z=${repositionedZ}`);
      onRespawn();
    }
  });

  return (
    <RigidBody
      ref={obstacleRef}
      type="kinematicPosition"
      colliders="cuboid"
      position={[LANE_POSITIONS[lane.current], 0, initialZ + (index * SPAWN_INTERVAL)]}
      userData={{ type: 'Obstacle', lane: lane.current }}
    >
      <CuboidCollider 
        args={[1, 1, 1]} 
        sensor
        onIntersectionEnter={() => {
          console.log(`[TrafficObstacle] Collision detected on lane ${lane.current}. Player lane: ${gameState.currentLane}`);
          if (gameState.currentLane === lane.current) {
            console.log(`[TrafficObstacle] Player collided with obstacle on the same lane. Decrementing lives.`);
            setGameState(prev => {
              const updatedLives = prev.lives - 1;
              const gameOver = updatedLives <= 0;
              console.log(`[TrafficObstacle] Lives: ${prev.lives} -> ${updatedLives}. Game Over: ${gameOver}`);
              return {
                ...prev,
                lives: updatedLives,
                isGameOver: gameOver
              };
            });
          } else {
            console.log(`[TrafficObstacle] Collision occurred, but player is on a different lane. No action taken.`);
          }
        }}
      />
      
      {/* Visualizing the Collider */}
      {Math.abs(currentZ.current) <= PROXIMITY_Z && (
        <mesh>
          <boxGeometry args={[2, 2, 2]} />
          <meshBasicMaterial color="yellow" wireframe />
        </mesh>
      )}
      
      <primitive 
        object={scene.clone()} 
        scale={
          modelIndex.current === 3 ? [2.8, 2.8, 2.8] : // Traffic4.glb (40% bigger than 2.0)
          modelIndex.current === 2 ? [2.1, 2.1, 2.1] : // Traffic3.glb (40% bigger than 1.5)
          modelIndex.current === 1 ? [2.1, 2.1, 2.1] : // Traffic2.glb (40% bigger than 1.5)
          [1.12, 1.12, 1.12] // Default scale (40% bigger than 0.8)
        }
        position={[0, 0, 0]}
        rotation={
          modelIndex.current === 2 ? [0, Math.PI / 2, 0] : // Traffic3.glb: rotated 90 degrees sideways
          [0, Math.PI, 0] // Default rotation
        }
      />
    </RigidBody>
  );
} 