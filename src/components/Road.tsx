export function Road() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
      <planeGeometry args={[15, 1000]} />
      <meshStandardMaterial 
        color="#333333"
        roughness={0.8}
        metalness={0.2}
      />
    </mesh>
  );
}