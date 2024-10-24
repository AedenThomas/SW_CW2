import { useTexture } from '@react-three/drei';
import * as THREE from 'three';

export function Road() {
  const [
    roadTexture,
    roadNormalMap,
    roadRoughnessMap
  ] = useTexture([
    '/textures/road/asphalt_diffuse.jpg',
    '/textures/road/asphalt_normal.jpg',
    '/textures/road/asphalt_roughness.jpg'
  ]);

  // Repeat textures
  [roadTexture, roadNormalMap, roadRoughnessMap].forEach(texture => {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 20);
  });

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
      <planeGeometry args={[15, 200]} /> {/* Ensure width is 15 */}
      <meshStandardMaterial
        map={roadTexture}
        normalMap={roadNormalMap}
        roughnessMap={roadRoughnessMap}
        envMapIntensity={0.8}
      />
    </mesh>
  );
}
