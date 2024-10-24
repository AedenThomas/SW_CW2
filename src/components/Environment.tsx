import { useGLTF, Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GameState } from '../types/game';
import { GAME_SPEED } from '../constants/game';

export function EnvironmentDecorations({ gameState }: { gameState: GameState }) {
  const treePositions = useRef<Array<[number, number, number]>>([]);
  const rockPositions = useRef<Array<[number, number, number]>>([]);
  const lastTime = useRef(0);
  
  useEffect(() => {
    // Generate initial positions
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * 60 - 30; // -30 to 30
      const z = Math.random() * 200 - 100; // -100 to 100
      if (Math.abs(x) > 8) { // Keep away from the road
        treePositions.current.push([x, 0, z]);
      }
    }
    
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * 50 - 25;
      const z = Math.random() * 200 - 100;
      if (Math.abs(x) > 10) { // Keep away from the road
        rockPositions.current.push([x, 0, z]);
      }
    }
  }, []);

  useFrame((state, delta) => {
    // Use constant forward motion, independent of lane changes
    const moveAmount = GAME_SPEED * gameState.multiplier * delta * 60;

    // Move decorations with constant forward motion
    treePositions.current = treePositions.current.map(([x, y, z]) => {
      let newZ = z + moveAmount;
      
      // Smooth looping
      if (newZ > 50) {
        newZ = -150 + (newZ - 50);
      }
      return [x, y, newZ];
    });
    
    rockPositions.current = rockPositions.current.map(([x, y, z]) => {
      let newZ = z + moveAmount;
      
      // Smooth looping
      if (newZ > 50) {
        newZ = -150 + (newZ - 50);
      }
      return [x, y, newZ];
    });
  });

  return (
    <>
      <group>
        {treePositions.current.map((position, i) => (
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
        {rockPositions.current.map((position, i) => (
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
