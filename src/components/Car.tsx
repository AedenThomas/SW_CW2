import { useEffect, useRef, useState } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

export function CarModel() {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [model, setModel] = useState<THREE.Group | null>(null);
  const carRef = useRef<any>(null);

  const gltf = useLoader(GLTFLoader, `${process.env.PUBLIC_URL}/models/car.glb`, undefined, (error) => {
    console.error('Error loading car model:', error);
    setModelLoaded(false);
  });

  useEffect(() => {
    if (gltf) {
      gltf.scene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      setModelLoaded(true);
    }
  }, [gltf]);

  return (
    <RigidBody ref={carRef} type="dynamic" colliders="cuboid">
      <CuboidCollider args={[1, 1, 2]} />
      {modelLoaded && model ? (
        <primitive object={model} />
      ) : (
        // Fallback car representation
        <mesh castShadow>
          <boxGeometry args={[2, 1, 4]} />
          <meshStandardMaterial color="red" />
        </mesh>
      )}
    </RigidBody>
  );
}
