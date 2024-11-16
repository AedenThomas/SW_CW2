import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef, useEffect } from "react";
import { GAME_SPEED } from "../constants/game";
import { Question, GameState } from "../types/game";
import { LANE_POSITIONS } from "./Game";
import * as THREE from 'three';

export function MovingAnswerOptions({ question, onCollision, gameState }: { 
    question: Question, 
    onCollision: (isCorrect: boolean) => void,
    gameState: GameState 
  }) {
    const optionsGroupRef = useRef<THREE.Group>(null);
    const hasCollided = useRef(false);
    const resetPosition = useRef(false);
    const initialZ = -180;
  
    useFrame((state, delta) => {
      if (!gameState.isPlaying || gameState.isPaused) return; // Add pause check
      
      if (!optionsGroupRef.current || resetPosition.current) return;
  
      const currentZ = optionsGroupRef.current.position.z;
      
      // Check for collision based on position
      if (currentZ > -2 && currentZ < 2) {  // Collision zone
        const playerLane = gameState.currentLane;
        question.options.forEach((_, index) => {
          if (index === playerLane && !hasCollided.current) {
            // debugLog('Position-based collision detected', {
            //   optionIndex: index,
            //   playerLane,
            //   optionZ: currentZ
            // });
            handleCollision(index);
          }
        });
      }
  
      // Move options forward
      optionsGroupRef.current.position.z += GAME_SPEED * gameState.speed * gameState.multiplier;
      
    //   if (currentZ > -5 && currentZ < 5) {
    //     debugLog('Options near player', {
    //       optionsZ: currentZ,
    //       playerLane: gameState.currentLane
    //     });
    //   }
      
      // Reset if passed the player
      if (currentZ > 10) {
        resetPosition.current = true;
        optionsGroupRef.current.visible = false;
        optionsGroupRef.current.position.z = initialZ;
        
        setTimeout(() => {
          if (optionsGroupRef.current) {
            optionsGroupRef.current.visible = true;
            resetPosition.current = false;
            hasCollided.current = false;
          }
        }, 500);
      }
    });
  
    const handleCollision = (index: number) => {
      if (!hasCollided.current && !resetPosition.current) {
        hasCollided.current = true;
        const isCorrect = index === question.correctAnswer;
        
        // debugLog('Processing collision', {
        //   isCorrect,
        //   index,
        //   correctAnswer: question.correctAnswer
        // });
        
        if (isCorrect && optionsGroupRef.current) {
          resetPosition.current = true;
          optionsGroupRef.current.visible = false;
        }
        
        onCollision(isCorrect);
      }
    };
  
    // Reset refs when question changes
    useEffect(() => {
      hasCollided.current = false;
      resetPosition.current = false;
      if (optionsGroupRef.current) {
        optionsGroupRef.current.position.z = initialZ;
        optionsGroupRef.current.visible = true;
      }
    }, [question]);
  
    return (
      <group ref={optionsGroupRef} position={[0, 0, initialZ]} name="optionsGroup">
        {question.options.map((option, index) => {
          const lanePosition = LANE_POSITIONS[index];
          return (
            <RigidBody
              key={index}
              position={[lanePosition, 1, 0]}
              type="fixed"
              colliders="cuboid"
              sensor={true}
            >
              <CuboidCollider 
                args={[2, 1.5, 0.5]} // Increased width and height
                sensor={true}
              />
              <mesh>
                <planeGeometry args={[4, 3]} /> {/* Use planeGeometry for images */}
                <meshStandardMaterial 
                  map={new THREE.TextureLoader().load(option)} 
                  transparent={true}
                />
              </mesh>
              {/* Remove Text component and use image */}
            </RigidBody>
          );
        })}
      </group>
    );
  }