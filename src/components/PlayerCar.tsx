import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody, RigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef } from "react";
import { Vector3 } from "three";
import { lerp } from "three/src/math/MathUtils";
import * as THREE from 'three';

export function PlayerCar({ position, targetPosition, handleCoinCollect }: { 
    position: [number, number, number], 
    targetPosition: number,
    handleCoinCollect: (id: number) => void 
  }) {
  
    const { scene } = useGLTF(`${process.env.PUBLIC_URL}/models/car.glb`)
  
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const currentPos = useRef(position[0]);
    const lastUpdateTime = useRef(0);
    const isMoving = useRef(false);
    
    const MIN_UPDATE_INTERVAL = 16;
    const COLLISION_BOX = { width: 2, height: 1, depth: 4 };
  
    useFrame((state, delta) => {
      if (!rigidBodyRef.current) return;
  
      try {
        const targetDiff = targetPosition - currentPos.current;
        
        if (Math.abs(targetDiff) > 0.01) {
          if (!isMoving.current) {
            isMoving.current = true;
          }
  
          // Use a smaller lerp factor for smoother movement
          const lerpFactor = 0.08;
          currentPos.current = lerp(currentPos.current, targetPosition,  lerpFactor);
  
          const newPosition = new Vector3(
            currentPos.current,
            position[1],
            position[2]
          );
  
          rigidBodyRef.current.setTranslation(newPosition, true);
          
          // Smoother tilt effect
          const tiltAmount = Math.min(Math.max(targetDiff * -0.1, -0.15), 0.15);
          const newRotation = new THREE.Quaternion().setFromEuler(
            new THREE.Euler(0, 0, tiltAmount)
          );
          rigidBodyRef.current.setRotation(newRotation, true);
        } else if (isMoving.current) {
          
          // Snap to exact position
          currentPos.current = targetPosition;
          rigidBodyRef.current.setTranslation(
            new Vector3(targetPosition, position[1], position[2]),
            true
          );
          rigidBodyRef.current.setRotation(new THREE.Quaternion(), true);
          isMoving.current = false;
        }
      } catch (error) {
        console.error('Car movement error:', error);
      }
    });
  
    return (
      <RigidBody 
        ref={rigidBodyRef} 
        position={position} 
        type="kinematicPosition"
        colliders={false}
        userData={{ type: 'PlayerCar' }}
      >
        <CuboidCollider 
          args={[1, 1, 2]} // Adjust size to match car's visible size
          sensor
          onIntersectionEnter={(e) => {
            const otherBody = e.other.rigidBody;
            const otherType = e.other.rigidBodyObject?.userData?.type;
            
            console.log('[PlayerCar] Collision detected:', {
              otherType,
              playerLane: currentPos.current,
              otherPos: otherBody?.translation(),
              time: Date.now()
            });
            
            if (otherType === 'Obstacle') {
              // Handle obstacle collision directly here
              console.log('[PlayerCar] Hit obstacle!');
            }
          }}
        />
  
        {/* Remove debugging visualization in production */}
        {/* <mesh scale={[2, 2, 4]}>
          <boxGeometry />
          <meshBasicMaterial color="blue" wireframe />
        </mesh> */}
  
        {/* Rest of the car model rendering */}
        <group scale={[0.99, 0.99, 0.99]} rotation={[0, Math.PI, 0]}>
          {scene ? (
            <primitive object={scene.clone()} />
          ) : (
            <mesh castShadow>
              <boxGeometry args={[COLLISION_BOX.width, COLLISION_BOX.height, COLLISION_BOX.depth]} />
              <meshStandardMaterial color="red" wireframe />
            </mesh>
          )}
        </group>
      </RigidBody>
    );
  }
  