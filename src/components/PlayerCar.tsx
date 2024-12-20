import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { RapierRigidBody, RigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef, useEffect, useState } from "react";
import { Vector3 } from "three";
import { lerp } from "three/src/math/MathUtils";
import * as THREE from 'three';
import { CAR_MODELS } from '../data/carModels';

export function PlayerCar({ position, targetPosition, handleCoinCollect, onLaneChangeComplete }: { 
    position: [number, number, number], 
    targetPosition: number,
    handleCoinCollect: (id: number) => void,
    onLaneChangeComplete: () => void
  }) {
  
    const [selectedCar] = useState(() => localStorage.getItem('selectedCar') || 'car1');
    const carModel = CAR_MODELS.find(car => car.id === selectedCar) || CAR_MODELS[0];
    const { scene } = useGLTF(`${process.env.PUBLIC_URL}/models/${carModel.model}`);
  
    const rigidBodyRef = useRef<RapierRigidBody>(null);
    const currentPos = useRef(position[0]);
    const isMoving = useRef(false);
    
    const COLLISION_BOX = { width: 0.4, height: 0.2, depth: 0.8 };
  
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
          const previousPos = currentPos.current;
          currentPos.current = lerp(currentPos.current, targetPosition, lerpFactor);
  
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
          isMoving.current = false; // Debug log
  
          // Invoke the callback to notify lane change completion
          onLaneChangeComplete();
        }
      } catch (error) {
        console.error('Car movement error:', error);
      }
    });
  
    // Get the model-specific rotation
    const getModelRotation = () => {
      switch (selectedCar) {
        case 'car2':
          return Math.PI * 2; // 360 degrees
        case 'car3':
        case 'car4':
          return Math.PI; // 180 degrees
        default:
          return Math.PI / 2; // 90 degrees (default)
      }
    };
  
    return (
      <RigidBody 
        ref={rigidBodyRef} 
        position={[position[0], position[1], position[2]]}
        type="kinematicPosition"
        colliders={false}
        userData={{ type: 'PlayerCar' }}
      >
        <CuboidCollider 
          args={[COLLISION_BOX.width/2, COLLISION_BOX.height/2, COLLISION_BOX.depth/2]} 
          sensor
          onIntersectionEnter={(e) => {
            const otherBody = e.other.rigidBody;
            const otherType = e.other.rigidBodyObject?.userData?.type;
            
            if (otherType === 'Obstacle') {
              // Handle obstacle collision directly here
            }
          }}
        />
  
        {/* Car model rendering with updated rotation */}
        <group 
          scale={[carModel.scale, carModel.scale, carModel.scale]}
          rotation={[0, getModelRotation(), 0]} 
          position={carModel.offset || [0, 0, 0]}
        >
          <primitive object={scene.clone()} castShadow receiveShadow />
        </group>
      </RigidBody>
    );
  }
  