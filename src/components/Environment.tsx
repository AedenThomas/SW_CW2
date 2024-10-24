import { useGLTF, Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GameState } from '../types/game';
import { GAME_SPEED } from '../constants/game';

export function EnvironmentDecorations({ gameState }: { gameState: GameState }) {
  const [treePositions, setTreePositions] = useState<Array<[number, number, number]>>([]);
  const [rockPositions, setRockPositions] = useState<Array<[number, number, number]>>([]);
  const lastTime = useRef(0);
  
  useEffect(() => {
    // Generate initial positions closer to the player
    const initialTrees: Array<[number, number, number]> = [];
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 60 - 30; // -30 to 30
      const z = Math.random() * 20 - 10; // Adjusted to be closer to the player
      if (Math.abs(x) > 8) {
        initialTrees.push([x, 0, z]);
      }
    }
    setTreePositions(initialTrees);
    
    // Similarly for rocks
    const initialRocks: Array<[number, number, number]> = [];
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 50 - 25;
      const z = Math.random() * 20 - 10; // Adjusted to be closer to the player
      if (Math.abs(x) > 10) {
        initialRocks.push([x, 0, z]);
      }
    }
    setRockPositions(initialRocks);
  }, []);

  useFrame((state, delta) => {
    const moveAmount = GAME_SPEED * gameState.multiplier * delta * 60;

    setTreePositions(prevTrees => prevTrees.map(([x, y, z]) => {
      let newZ = z + moveAmount;
      if (newZ > 50) {
        newZ = -150 + (newZ - 50);
      }
      return [x, y, newZ];
    }));

    setRockPositions(prevRocks => prevRocks.map(([x, y, z]) => {
      let newZ = z + moveAmount;
      if (newZ > 50) {
        newZ = -150 + (newZ - 50);
      }
      return [x, y, newZ];
    }));

    // Debug: Log positions of the first few trees and rocks occasionally
    if (Math.random() < 0.01) {
      console.log('[Environment Debug] First tree position:', treePositions[0]);
      console.log('[Environment Debug] First rock position:', rockPositions[0]);
    }
  });

  return (
    <>
      <group>
        {treePositions.map((position, i) => (
          <mesh 
            key={i} 
            position={position}
            castShadow
            receiveShadow
          >
            <coneGeometry args={[0.5, 2, 8]} />
            <meshStandardMaterial 
              color="darkgreen"
              roughness={0.8}
              metalness={0.2}
            />
          </mesh>
        ))}
      </group>

      <group>
        {rockPositions.map((position, i) => (
          <mesh 
            key={i} 
            position={position}
            castShadow
            receiveShadow
          >
            <dodecahedronGeometry args={[0.5]} />
            <meshStandardMaterial 
              color="gray"
              roughness={0.7}
              metalness={0.3}
            />
          </mesh>
        ))}
      </group>
    </>
  );
}
