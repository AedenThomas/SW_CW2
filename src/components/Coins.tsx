import React, { useRef, useEffect, useState } from 'react';
import { RigidBody, RapierRigidBody, CollisionEnterPayload, CuboidCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { GameState } from '../types/game';
import { LANE_POSITIONS, GAME_SPEED } from '../constants/game';
import { UserData } from '../types/userData';
import { useGLTF } from '@react-three/drei';

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

const Coins: React.FC<CoinsProps> = ({ lane, gameState, onCollect, startingZ }) => {
  const coinsRef = useRef<Array<{
    rigidBodyRef: React.RefObject<RapierRigidBody>;
    position: Vector3;
    id: number;
  }>>([]);
  const [collectedCoins, setCollectedCoins] = useState<number[]>([]);
  const numCoins = 10;
  const { scene } = useGLTF(`${process.env.PUBLIC_URL}/models/coin.glb`);

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
    debugLog('Generated coins with new spacing:', generatedCoins);
  }, [lane, startingZ, numCoins]);

  // Add collision zone check similar to options
  const isInCollisionZone = (z: number) => {
    return z > -2 && z < 2;
  };

  useFrame((state, delta) => {
    const moveAmount = GAME_SPEED * gameState.multiplier * delta * 60;
    
    coinsRef.current.forEach(coin => {
      if (coin.rigidBodyRef.current && !collectedCoins.includes(coin.id)) {
        const currentPosition = coin.rigidBodyRef.current.translation();
        const newZ = currentPosition.z + moveAmount;
        
        // Check for position-based collision like options
        if (isInCollisionZone(currentPosition.z)) {
          if (lane === gameState.currentLane && !collectedCoins.includes(coin.id)) {
            debugLog('Position-based coin collision detected', {
              coinId: coin.id,
              lane,
              playerLane: gameState.currentLane,
              coinZ: currentPosition.z,
              currentScore: gameState.score // Add score to debug output
            });
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
          debugLog('Coin reset position', {
            coinId: coin.id,
            newPosition: { x: LANE_POSITIONS[lane], y: 1, z: resetZ }
          });
        } else {
          coin.rigidBodyRef.current.setTranslation(
            { x: currentPosition.x, y: 1, z: newZ },
            true
          );
        }
      }
    });
  });

  // Simplify the collision handler
  const handleCollect = (id: number) => {
    if (!collectedCoins.includes(id)) {
      debugLog('Collecting coin', {
        coinId: id,
        lane,
        playerLane: gameState.currentLane
      });
      
      setCollectedCoins(prev => [...prev, id]);
      onCollect(id);

      // Hide the collected coin
      const coin = coinsRef.current.find(c => c.id === id);
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
      {coinsRef.current.map(coin => (
        <RigidBody
          key={coin.id}
          ref={coin.rigidBodyRef}
          position={[LANE_POSITIONS[lane], 1, coin.position.z]}
          type="kinematicPosition"
          colliders={false}
          userData={{ 
            type: 'Coin', 
            coinId: coin.id, 
            lane 
          }}
        >
          <CuboidCollider 
            args={[0.5, 0.5, 0.5]} // Increased size for better collision detection
            sensor={true}
          />
          {!collectedCoins.includes(coin.id) && (
            <primitive 
              object={scene.clone()} 
              scale={[1.5, 1.5, 1.5]}
              rotation={[0, Math.PI / 2, 0]} // Adjust rotation as needed
            />
          )}
        </RigidBody>
      ))}
    </>
  );
};

export default Coins;
