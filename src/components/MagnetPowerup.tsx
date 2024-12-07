import React, { useRef, useEffect } from 'react';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { GameState } from '../types/game';
import { LANE_POSITIONS, GAME_SPEED } from '../constants/game';
import { calculateMoveAmount } from '../utils/movement';
import { Vector3 } from 'three';
import * as THREE from 'three';

const DEBUG_MAGNET = true;

interface MagnetPowerupProps {
  gameState: GameState;
  onCollect: () => void;
  lane: number;
}

const MagnetPowerup: React.FC<MagnetPowerupProps> = ({ gameState, onCollect, lane }) => {
  const magnetRef = useRef<RapierRigidBody>(null);
  const modelRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(`${process.env.PUBLIC_URL}/models/magnet.glb`);
  const isCollected = useRef(false);

  // Floating animation parameters
  const floatHeight = 0.3;
  const floatSpeed = 1.5;
  const baseY = 1;

  // Log initial mount
  useEffect(() => {
    if (DEBUG_MAGNET) {
      console.log('MagnetPowerup mounted:', {
        lane,
        position: LANE_POSITIONS[lane]
      });
    }
  }, [lane]);

  useFrame((state, delta) => {
    if (isCollected.current) return;

    const moveAmount = calculateMoveAmount(gameState, delta, GAME_SPEED);

    if (magnetRef.current) {
      const currentPosition = magnetRef.current.translation();
      const newZ = currentPosition.z + moveAmount;

      // Floating animation
      const floatOffset = Math.sin(state.clock.elapsedTime * floatSpeed) * floatHeight;
      const newY = baseY + floatOffset;

      // Rotate the magnet model
      if (modelRef.current) {
        modelRef.current.rotation.y += delta * 2;
      }

      // Check for collision with player
      if (newZ > -2 && newZ < 2) {
        const effectiveLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;
        if (lane === effectiveLane && !isCollected.current) {
          if (DEBUG_MAGNET) console.log('Magnet collected!');
          isCollected.current = true;
          onCollect();
          // Hide the magnet
          magnetRef.current.setTranslation(new Vector3(LANE_POSITIONS[lane], -10, newZ), true);
        }
      }

       // Mark magnet as missed if it passes the player without being collected
    if (newZ > 5 && !isCollected.current) {
      if (DEBUG_MAGNET) console.log('Magnet missed!');
      isCollected.current = true;
      // Signal to Game component that magnet was missed
      magnetRef.current.setTranslation(new Vector3(LANE_POSITIONS[lane], -10, newZ), true);
    }

      // Reset position if passed player
      if (newZ > 10) {
        if (DEBUG_MAGNET) console.log('Magnet reset position');
        magnetRef.current.setTranslation(new Vector3(LANE_POSITIONS[lane], baseY, -150), true);
      } else {
        magnetRef.current.setTranslation(new Vector3(currentPosition.x, newY, newZ), true);
      }
      if (!isCollected.current) {
        magnetRef.current.setTranslation(new Vector3(currentPosition.x, newY, newZ), true);
      }
    }
  });
  

  // Create a temporary box for testing if the magnet model isn't loading
  const tempGeometry = new THREE.BoxGeometry(1, 1, 1);
  const tempMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });

  return (
    <RigidBody
      ref={magnetRef}
      position={[LANE_POSITIONS[lane], baseY, -150]}
      type="kinematicPosition"
      colliders={false}
      userData={{ type: 'Magnet' }}
    >
      <CuboidCollider args={[0.7, 0.7, 0.7]} sensor={true} />
      <group ref={modelRef}>
        {scene ? (
          <primitive
            object={scene.clone()}
            scale={[1.2, 1.2, 1.2]}
            rotation={[0, 0, 0]}
          />
        ) : (
          // Fallback red box if model doesn't load
          <mesh geometry={tempGeometry} material={tempMaterial} />
        )}
        {/* Add glow effect */}
        <mesh>
          <sphereGeometry args={[0.8, 16, 16]} />
          <meshBasicMaterial
            color={0x4444ff}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
      </group>
    </RigidBody>
  );
};

export default MagnetPowerup; 