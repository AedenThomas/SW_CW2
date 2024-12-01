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

interface CoinsProps {
  lane: number;
  gameState: GameState;
  onCollect: (id: number) => void;
  startingZ: number;
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

  // Initialize coins with better spacing based on startingZ
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
    const rotationSpeed = 2; // Adjust this value to control rotation speed

    coinsRef.current.forEach((coin, index) => {
      if (coin.rigidBodyRef.current && !collectedCoins.includes(coin.id)) {
        const currentPosition = coin.rigidBodyRef.current.translation();
        const newZ = currentPosition.z + moveAmount;

        // Check for position-based collision like options
        if (isInCollisionZone(currentPosition.z)) {
          // Use targetLane if available, otherwise use currentLane
          const effectiveLane =
            gameState.targetLane !== null
              ? gameState.targetLane
              : gameState.currentLane;

          if (lane === effectiveLane && !collectedCoins.includes(coin.id)) {
            handleCollect(coin.id);
          }
        }

        // Reset position if passed player
        if (newZ > 10) {
          const resetZ = Math.random() * -100 - 150;
          coin.rigidBodyRef.current.setTranslation(
            { x: LANE_POSITIONS[lane], y: 1, z: resetZ },
            true
          );
          debugLog("Coin reset position", {
            coinId: coin.id,
            newPosition: { x: LANE_POSITIONS[lane], y: 1, z: resetZ },
          });
        } else {
          coin.rigidBodyRef.current.setTranslation(
            { x: currentPosition.x, y: 1, z: newZ },
            true
          );
        }

        // Add rotation to the coin
        const rotationRef = coinRotationRefs.current[index];
        if (rotationRef && !gameState.isPaused) {
          rotationRef.rotation.y += rotationSpeed * delta;
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
