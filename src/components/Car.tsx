import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';

export function CarModel() {
  const { scene } = useGLTF('/models/car.glb');

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
