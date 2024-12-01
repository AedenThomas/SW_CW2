import React, { useRef, useEffect, useState } from "react";
import {
  RigidBody,
  RapierRigidBody,
  CollisionEnterPayload,
  CuboidCollider,
} from "@react-three/rapier";
import { Vector3, Euler, Group } from "three";
import { useFrame } from "@react-three/fiber";
import { GameState } from "../types/game";
import { LANE_POSITIONS, GAME_SPEED } from "../constants/game";
import { UserData } from "../types/userData";
import { useGLTF } from "@react-three/drei";
import { calculateMoveAmount } from "../utils/movement";
import * as THREE from "three";

interface CoinsProps {
  lane: number;
  gameState: GameState;
  onCollect: (id: number) => void;
  startingZ: number;
  magnetActive: boolean;
}

// Define a custom collision event interface
interface CustomCollisionEvent {
  otherRigidBody: RapierRigidBody;
}

const DEBUG = true;
function debugLog(message: string, data?: any) {
  if (DEBUG) {
  }
}

interface UserDataWithId extends UserData {
  coinId: number;
}

const Coins: React.FC<CoinsProps> = ({
  lane,
  gameState,
  onCollect,
  startingZ,
  magnetActive
}) => {
  const coinsRef = useRef<
    Array<{
      rigidBodyRef: React.RefObject<RapierRigidBody>;
      position: Vector3;
      id: number;
    }>
  >([]);
  const [collectedCoins, setCollectedCoins] = useState<number[]>([]);
  const numCoins = 10;
  const { scene } = useGLTF(`${process.env.PUBLIC_URL}/models/coin.glb`);

  // Add new ref for coin rotation
  const coinRotationRefs = useRef<Group[]>([]);

  // Add ref for rotation offsets
  const rotationOffsets = useRef<number[]>([]);

  // Initialize coins with better spacing and rotation offsets
  useEffect(() => {
    const generatedCoins = Array.from({ length: numCoins }).map((_, index) => {
      const z = startingZ - index * 40 + Math.random() * 20;
      return {
        rigidBodyRef: React.createRef<RapierRigidBody>(),
        position: new Vector3(LANE_POSITIONS[lane], 1, z),
        id: index + lane * 10000 + startingZ,
      };
    });
    coinsRef.current = generatedCoins;

    // Initialize rotation offsets based on coin position
    rotationOffsets.current = generatedCoins.map((coin, index) => {
      // Create an offset based on index and a random factor
      return (index * 0.4 + Math.random() * 0.5) * Math.PI;
    });

    debugLog("Generated coins with new spacing:", generatedCoins);
  }, [lane, startingZ, numCoins]);

  // Initialize rotation refs
  useEffect(() => {
    coinRotationRefs.current = Array(numCoins).fill(null);
  }, [numCoins]);

  // Add collision zone check similar to options
  const isInCollisionZone = (z: number) => {
    return z > -2 && z < 2;
  };

  // Modify useFrame to include rotation
  useFrame((state, delta) => {
    const moveAmount = calculateMoveAmount(gameState, delta, GAME_SPEED);
    const baseRotationSpeed = 2;

    coinsRef.current.forEach((coin, index) => {
      if (coin.rigidBodyRef.current && !collectedCoins.includes(coin.id)) {
        const currentPosition = coin.rigidBodyRef.current.translation();
        let newZ = currentPosition.z + moveAmount;
        let newX = currentPosition.x;
        let newY = 1;

        // Magnet effect
        if (magnetActive) {
          const playerLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;
          const targetX = LANE_POSITIONS[playerLane];
          const distanceToPlayer = Math.abs(currentPosition.z);

          if (distanceToPlayer < 20) { // Only affect coins within 20 units
            // Calculate attraction strength based on distance
            const attractionStrength = Math.max(0, 1 - distanceToPlayer / 20);
            
            // Move coin towards player's lane
            newX = THREE.MathUtils.lerp(currentPosition.x, targetX, attractionStrength * 0.1);
            
            // Add upward arc motion
            newY = 1 + Math.sin(attractionStrength * Math.PI) * 2;
            
            // Increase forward speed
            newZ += moveAmount * attractionStrength;

            // Check for collection when coin is close to player
            if (Math.abs(newX - targetX) < 1 && Math.abs(newZ) < 2) {
              handleCollect(coin.id);
            }
          }
        } else {
          // Normal coin behavior
          if (isInCollisionZone(currentPosition.z)) {
            const effectiveLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;
            if (lane === effectiveLane && !collectedCoins.includes(coin.id)) {
              handleCollect(coin.id);
            }
          }
        }

        // Reset position if passed player
        if (newZ > 10) {
          const resetZ = Math.random() * -100 - 150;
          coin.rigidBodyRef.current.setTranslation(
            { x: LANE_POSITIONS[lane], y: 1, z: resetZ },
            true
          );
        } else {
          coin.rigidBodyRef.current.setTranslation(
            { x: newX, y: newY, z: newZ },
            true
          );
        }

        // Add rotation to the coin with offset and wave effect
        const rotationRef = coinRotationRefs.current[index];
        if (rotationRef && !gameState.isPaused) {
          const timeOffset = rotationOffsets.current[index];
          const waveEffect = Math.sin(state.clock.elapsedTime + timeOffset) * 0.5;
          
          // Increase rotation speed during magnet effect
          const magnetSpeedMultiplier = magnetActive ? 3 : 1;
          const adjustedSpeed = (baseRotationSpeed + waveEffect) * magnetSpeedMultiplier;
          rotationRef.rotation.y += adjustedSpeed * delta;

          // Add extra tilt during magnet effect
          if (magnetActive) {
            rotationRef.rotation.x = Math.sin(state.clock.elapsedTime * 2 + timeOffset) * 0.4;
            rotationRef.rotation.z = Math.cos(state.clock.elapsedTime * 2 + timeOffset) * 0.4;
          } else {
            rotationRef.rotation.x = Math.sin(state.clock.elapsedTime + timeOffset) * 0.2;
          }
        }
      }
    });
  });

  // Simplify the collision handler
  const handleCollect = (id: number) => {
    if (!collectedCoins.includes(id)) {
      debugLog("Collecting coin", {
        coinId: id,
        lane,
        playerLane: gameState.currentLane,
      });

      setCollectedCoins((prev) => [...prev, id]);
      onCollect(id);

      // Hide the collected coin
      const coin = coinsRef.current.find((c) => c.id === id);
      if (coin?.rigidBodyRef.current) {
        coin.rigidBodyRef.current.setTranslation(
          { x: LANE_POSITIONS[lane], y: -10, z: coin.position.z },
          true
        );
      }
    }
  };

  return (
    <>
      {coinsRef.current.map((coin, index) => (
        <RigidBody
          key={coin.id}
          ref={coin.rigidBodyRef}
          position={[LANE_POSITIONS[lane], 2, coin.position.z]}
          type="kinematicPosition"
          colliders={false}
          userData={{
            type: "Coin",
            coinId: coin.id,
            lane,
          }}
        >
          <CuboidCollider
            args={[0.5, 0.5, 0.5]}
            sensor={true}
          />
          {!collectedCoins.includes(coin.id) && (
            <group 
              ref={el => {
                if (el) coinRotationRefs.current[index] = el;
              }}
            >
              <primitive
                object={scene.clone()}
                scale={[2, 2, 2]}
                rotation={[0, 0, Math.PI / 2]}
              />
            </group>
          )}
        </RigidBody>
      ))}
    </>
  );
};

export default Coins;
