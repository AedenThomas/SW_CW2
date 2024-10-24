import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

export function CarModel() {
  // Updated loader with error handling and PUBLIC_URL
  const { scene } = useLoader(GLTFLoader, `${process.env.PUBLIC_URL}/models/car.glb`, loader => {
    loader.manager.onError = (url) => {
      console.error(`Error loading ${url}`);
    };
  });

  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [scene]);

  return <primitive object={scene} />;
}
