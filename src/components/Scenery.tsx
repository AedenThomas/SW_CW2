import { useEffect, useMemo, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Define the types of scenery items
type SceneryItem = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  model: string;
};

// Define the available models
const MODELS = {
  grass: [
    `${process.env.PUBLIC_URL}/models/scene/Grass1.glb`,
    `${process.env.PUBLIC_URL}/models/scene/Grass2.glb`,
    `${process.env.PUBLIC_URL}/models/scene/Grass3.glb`,
    `${process.env.PUBLIC_URL}/models/scene/Grass4.glb`,
  ],
  hedges: [
    `${process.env.PUBLIC_URL}/models/scene/Hedge1.glb`,
    `${process.env.PUBLIC_URL}/models/scene/Hedge2.glb`,
  ],
  rocks: [
    `${process.env.PUBLIC_URL}/models/scene/Rock1.glb`,
    `${process.env.PUBLIC_URL}/models/scene/Rock2.glb`,
  ],
  trees: [
    `${process.env.PUBLIC_URL}/models/scene/Tree4.glb`,
    `${process.env.PUBLIC_URL}/models/scene/Tree5.glb`,
    `${process.env.PUBLIC_URL}/models/scene/Tree6.glb`,
  ],
};

// Preload all models
Object.values(MODELS).flat().forEach(path => {
  useGLTF.preload(path);
});

// Update the component props interface
interface SceneryProps {
  speed?: number;
  isPaused?: boolean;
}

// Update the SceneryObject props interface
interface SceneryObjectProps {
  item: SceneryItem;
  speed?: number;
  isPaused?: boolean;
}

function SceneryObject({ item, speed = 1, isPaused = false }: SceneryObjectProps) {
  const { scene } = useGLTF(item.model);
  const clonedScene = useMemo(() => scene.clone(), [scene]);
  const ref = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (ref.current && !isPaused) {
      ref.current.position.z += speed * delta * 10;

      if (ref.current.position.z > 100) {
        ref.current.position.z -= 200;
      }
    }
  });

  return (
    <group 
      ref={ref}
      position={item.position}
      rotation={item.rotation}
      scale={[item.scale, item.scale, item.scale]}
    >
      <primitive object={clonedScene} />
    </group>
  );
}

function generateSceneryItems(side: 'left' | 'right', roadLength: number): SceneryItem[] {
  const items: SceneryItem[] = [];
  const baseX = side === 'left' ? -15 : 15;
  const spacing = 10;
  
  for (let z = -roadLength/2; z < roadLength/2; z += spacing) {
    const offsetZ = z + (Math.random() - 0.5) * 5;
    
    // Trees - 600% bigger
    if (Math.random() < 0.3) {
      const treeModel = MODELS.trees[Math.floor(Math.random() * MODELS.trees.length)];
      items.push({
        model: treeModel,
        position: [
          baseX + (Math.random() - 0.5) * 5,
          0,
          offsetZ
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: (0.15 + Math.random() * 0.05) * 7, // Increased by 600%
      });
    }
    
    // Rocks - 50% bigger than previous size
    if (Math.random() < 0.2) {
      const rockModel = MODELS.rocks[Math.floor(Math.random() * MODELS.rocks.length)];
      items.push({
        model: rockModel,
        position: [
          baseX + (Math.random() - 0.5) * 6,
          0,
          offsetZ + (Math.random() - 0.5) * 2
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: (0.08 + Math.random() * 0.04) * 10.5, // Increased by additional 50% (7 * 1.5)
      });
    }
    
    // Grass - 20% bigger than previous size
    if (Math.random() < 0.6) {
      const grassModel = MODELS.grass[Math.floor(Math.random() * MODELS.grass.length)];
      items.push({
        model: grassModel,
        position: [
          baseX + (Math.random() - 0.5) * 7,
          0,
          offsetZ + (Math.random() - 0.5) * 2
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: (0.1 + Math.random() * 0.03) * 0.12, // Increased by 20% (0.1 * 1.2)
      });
    }
    
    // Hedges - 600% bigger
    if (Math.random() < 0.15) {
      const hedgeModel = MODELS.hedges[Math.floor(Math.random() * MODELS.hedges.length)];
      items.push({
        model: hedgeModel,
        position: [
          baseX + (Math.random() - 0.5) * 4,
          0,
          offsetZ
        ],
        rotation: [0, Math.random() * Math.PI * 2, 0],
        scale: (0.12 + Math.random() * 0.03) * 7, // Increased by 600%
      });
    }
  }
  
  return items;
}

export function Scenery({ speed = 1, isPaused = false }: SceneryProps) {
  const roadLength = 200;
  
  const sceneryItems = useMemo(() => {
    const leftItems = generateSceneryItems('left', roadLength);
    const rightItems = generateSceneryItems('right', roadLength);
    return [...leftItems, ...rightItems];
  }, []);

  return (
    <group>
      {sceneryItems.map((item, index) => (
        <SceneryObject 
          key={index} 
          item={item} 
          speed={speed}
          isPaused={isPaused}
        />
      ))}
    </group>
  );
} 
