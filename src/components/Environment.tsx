import { useGLTF, Instance, Instances } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { GameState } from '../types/game';
import { GAME_SPEED } from '../constants/game';
import { LANE_WIDTH } from '../constants/game';

export function EnvironmentDecorations({ gameState }: { gameState: GameState }) {
  const [treePositions, setTreePositions] = useState<Array<[number, number, number]>>([]);
  const [rockPositions, setRockPositions] = useState<Array<[number, number, number]>>([]);
  const lastTime = useRef(0);
  
  useEffect(() => {
    // Generate initial positions randomly around the road
    const generatePositions = (
      count: number,
      xRange: number,
      zRange: number,
      minX: number
    ): Array<[number, number, number]> => {
      const positions: Array<[number, number, number]> = [];
      for (let i = 0; i < count; i++) {
        let x;
        // Position trees and rocks only on the sides
        do {
          x = Math.random() * xRange - xRange / 2; // Centered around the road
        } while (Math.abs(x) <= minX); // Ensure outside the road width

        const z = Math.random() * zRange - zRange / 2;
        positions.push([x, 0, z]);
      }
      return positions;
    };

    // **Ensure ROAD_WIDTH Matches Road Component**
    const ROAD_WIDTH = 15; // Must match the Road component's planeGeometry width
    const ROAD_HALF_WIDTH = ROAD_WIDTH / 2; // 7.5
    const MIN_X = ROAD_HALF_WIDTH + 2; // 7.5 + 2 = 9.5 units

    setTreePositions(generatePositions(50, 60, 200, MIN_X)); // Increased tree count and zRange
    setRockPositions(generatePositions(30, 50, 200, MIN_X)); // Increased rock count and zRange
  }, []);

  useFrame((state, delta) => {
    const moveAmount = GAME_SPEED * gameState.multiplier * delta * 60;

    setTreePositions(prevTrees => prevTrees.map(([x, y, z]) => {
      let newZ = z + moveAmount;
      if (newZ > 100) { // Adjusted reset threshold
        newZ = -100;
        x = Math.random() * 60 - 30; // Re-randomize x position
      }
      return [x, y, newZ];
    }));

    setRockPositions(prevRocks => prevRocks.map(([x, y, z]) => {
      let newZ = z + moveAmount;
      if (newZ > 100) { // Adjusted reset threshold
        newZ = -100;
        x = Math.random() * 50 - 25; // Re-randomize x position
      }
      return [x, y, newZ];
    }));

    // Optional: Remove debug logs for performance
    // if (Math.random() < 0.01) {
    //   console.log('[Environment Debug] First tree position:', treePositions[0]);
    //   console.log('[Environment Debug] First rock position:', rockPositions[0]);
    // }
  });

  return (
    <>
      <group>
        {treePositions.map((position, i) => (
          <mesh 
            key={`tree-${i}`} 
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
            key={`rock-${i}`} 
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
