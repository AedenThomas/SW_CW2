import React, { useRef, useEffect, useState } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { Vector3 } from 'three';
import { useFrame } from '@react-three/fiber';
import { GameState } from '../types/game';
import { LANE_POSITIONS } from '../constants/game'; // Ensure this import is correct
import { GAME_SPEED } from '../constants/game'; // Ensure GAME_SPEED is imported
import { motion } from 'framer-motion'; // Import framer-motion for animations

interface CoinsProps {
  lane: number;
  gameState: GameState;
  onCollect: () => void;
}

const Coin = React.forwardRef(({ position, onCollect }: { position: Vector3; onCollect: () => void }, ref: any) => {
  return (
    <RigidBody
      ref={ref}
      position={position.toArray()}
      type="kinematicPosition"
      colliders="cuboid"
      sensor={true}
      onIntersectionEnter={() => {
        onCollect();
        // Add visual feedback for collection
        // For example, trigger a burst animation here
      }}
    >
      <CuboidCollider args={[0.5, 0.5, 0.5]} sensor={true} />
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color="yellow" emissive="yellow" />
      </mesh>
    </RigidBody>
  );
});

Coin.displayName = 'Coin';

interface CoinData {
  id: number;
  position: Vector3;
  collected: boolean;
}

const Coins: React.FC<CoinsProps> = ({ lane, gameState, onCollect }) => {
  const coinsRef = useRef<Array<{ rigidBodyRef: any; position: Vector3; id: number }>>([]);
  const [collectedCoins, setCollectedCoins] = useState<number[]>([]);
  const numCoins = 5; // Number of coins per lane

  useEffect(() => {
    // Generate random z positions ahead of the player
    const generatedCoins = Array.from({ length: numCoins }).map((_, index) => {
      const z = Math.random() * -200 - 50; // Spawn between -50 and -250 units ahead
      return {
        rigidBodyRef: React.createRef<any>(),
        position: new Vector3(LANE_POSITIONS[lane], 1, z),
        id: index, // Assign a unique ID to each coin
      };
    });
    coinsRef.current = generatedCoins;
  }, [lane]);

  const handleCollect = (id: number) => {
    setCollectedCoins(prev => [...prev, id]);
    onCollect();
    // Optionally, trigger a visual effect or sound here
  };

  useFrame((state, delta) => {
    const moveAmount = GAME_SPEED * gameState.multiplier * delta * 60;

    coinsRef.current.forEach(coin => {
      if (coin.rigidBodyRef.current && !collectedCoins.includes(coin.id)) {
        const trans = coin.rigidBodyRef.current.translation();

        const currentPosition = new Vector3(trans.x, trans.y, trans.z + moveAmount);

        // Reset position if coin has passed the player
        if (currentPosition.z > 10) {
          currentPosition.z = Math.random() * -200 - 50; // Respawn ahead
          coin.rigidBodyRef.current.setTranslation(currentPosition, true);
        } else {
          coin.rigidBodyRef.current.setTranslation(currentPosition, true);
        }
      }
    });
  });

  return (
    <>
      {coinsRef.current.map((coin, index) => (
        !collectedCoins.includes(coin.id) && (
          <Coin
            key={`coin-${lane}-${index}`}
            position={coin.position}
            onCollect={() => handleCollect(coin.id)}
            ref={coin.rigidBodyRef}
          />
        )
      ))}
    </>
  );
};

export default Coins;
