import React, { useRef, useEffect } from 'react';
import { RigidBody, CuboidCollider, RapierRigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { GameState } from '../types/game';
import { LANE_POSITIONS, GAME_SPEED } from '../constants/game';
import { calculateMoveAmount } from '../utils/movement';
import { Vector3 } from 'three';
import * as THREE from 'three';

const DEBUG_FUEL = false;

interface FuelPowerupProps {
  gameState: GameState;
  onCollect: () => void;
  onMiss: () => void;  // Add this prop
  lane: number;
}

const FuelPowerup: React.FC<FuelPowerupProps> = ({ gameState, onCollect, onMiss, lane }) => {
  const fuelRef = useRef<RapierRigidBody>(null);
  const modelRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(`${process.env.PUBLIC_URL}/models/fuel.glb`);
  const isCollected = useRef(false);

  // Floating animation parameters
  const floatHeight = 0.3;
  const floatSpeed = 1.5;
  const baseY = 1;

  useEffect(() => {
    if (DEBUG_FUEL) {
      console.log('FuelPowerup mounted:', {
        lane,
        position: LANE_POSITIONS[lane]
      });
    }
  }, [lane]);

  useFrame((state, delta) => {
    if (isCollected.current) return;

    const moveAmount = calculateMoveAmount(gameState, delta, GAME_SPEED);

    if (fuelRef.current) {
      const currentPosition = fuelRef.current.translation();
      const newZ = currentPosition.z + moveAmount;

      // Floating animation
      const floatOffset = Math.sin(state.clock.elapsedTime * floatSpeed) * floatHeight;
      const newY = baseY + floatOffset;

      // Rotate the fuel model
      if (modelRef.current) {
        modelRef.current.rotation.y += delta * 2;
      }

      // Check for collision with player
      if (newZ > -2 && newZ < 2) {
        const effectiveLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;
        if (lane === effectiveLane && !isCollected.current) {
          if (DEBUG_FUEL) console.log('Fuel collected!');
          isCollected.current = true;
          onCollect();
          // Hide the fuel
          fuelRef.current.setTranslation(new Vector3(LANE_POSITIONS[lane], -10, newZ), true);
        }
      }

      // Update the position check to handle missed fuel
      if (newZ > 10) {
        if (DEBUG_FUEL) console.log('Fuel missed');
        isCollected.current = true;
        onMiss();
        // Hide the fuel
        fuelRef.current.setTranslation(new Vector3(LANE_POSITIONS[lane], -10, newZ), true);
      } else {
        fuelRef.current.setTranslation(new Vector3(currentPosition.x, newY, newZ), true);
      }
    }
  });

  // Create a temporary cylinder for testing if the fuel model isn't loading
  const tempGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1, 16);
  const tempMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });

  return (
    <RigidBody
      ref={fuelRef}
      position={[LANE_POSITIONS[lane], baseY, -150]}
      type="kinematicPosition"
      colliders={false}
      userData={{ type: 'Fuel' }}
    >
      <CuboidCollider args={[0.7, 0.7, 0.7]} sensor={true} />
      <group ref={modelRef}>
        {scene ? (
          <primitive
            object={scene.clone()}
            scale={[5, 5, 5]}
            rotation={[0, 0, 0]}
          />
        ) : (
          // Fallback green cylinder if model doesn't load
          <mesh geometry={tempGeometry} material={tempMaterial} />
        )}
        {/* Removed the glow effect mesh */}
      </group>
    </RigidBody>
  );
};

export default FuelPowerup;