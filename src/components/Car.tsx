import { useGLTF } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import { RigidBody, CuboidCollider } from '@react-three/rapier';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function CarModel() {
  // Updated loader with error handling and PUBLIC_URL
  const { scene } = useLoader(GLTFLoader, `${process.env.PUBLIC_URL}/models/car.glb`, (loader: GLTFLoader) => {
    loader.manager.onError = (url: string) => {
      console.error(`Error loading ${url}`);
    };
  });

  const carRef = useRef<any>(null);

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return (
    <RigidBody ref={carRef} type="dynamic" colliders="cuboid">
      <CuboidCollider args={[1, 1, 2]} />
      <primitive object={scene} />
    </RigidBody>
  );
}
