import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef, useEffect } from "react";
import { GAME_SPEED } from "../constants/game";
import { Question, GameState } from "../types/game";
import { LANE_POSITIONS } from "./Game";
import * as THREE from 'three';

interface MovingAnswerOptionsProps {
  question: Question;
  onCollision: (
    isCorrect: boolean,
    gameState: GameState,
    setGameState: (state: GameState | ((prev: GameState) => GameState)) => void,
    setPreviousQuestion: (question: Question | null) => void,
    setPreviousAnswer: (answer: number | undefined) => void,
    setShowCorrectAnswerFlash: (show: boolean) => void,
    setShowWrongAnswerFlash: (show: boolean) => void
  ) => void;
  gameState: GameState;
  targetLane: number | null;
}

export function MovingAnswerOptions({ 
  question, 
  onCollision, 
  gameState,
  targetLane
}: MovingAnswerOptionsProps) {
    const optionsGroupRef = useRef<THREE.Group>(null);
    const hasCollided = useRef(false);
    const resetPosition = useRef(false);
    const initialZ = -180;
  
    useFrame((state, delta) => {
      if (!gameState.isPlaying || gameState.isPaused) return;
      
      if (!optionsGroupRef.current || resetPosition.current) return;
  
      const currentZ = optionsGroupRef.current.position.z;
      
      // Enhanced collision detection logging
      if (currentZ > -5 && currentZ < 5) {  // Expanded collision zone for debugging
      }
  
      // Move options forward
      optionsGroupRef.current.position.z += GAME_SPEED * gameState.speed * gameState.multiplier;
      
      // Position-based collision detection with enhanced logging
      if (currentZ > -2 && currentZ < 2) {
        const effectiveLane = targetLane !== null ? targetLane : gameState.currentLane;

        if (!hasCollided.current) {
          handleCollision(effectiveLane);
        }
      }
      
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
  
    const handleCollision = (lane: number) => {
      if (hasCollided.current) return;

      hasCollided.current = true;
      const isCorrect = lane === question.correctAnswer;
      
      if (isCorrect && optionsGroupRef.current) {
        resetPosition.current = true;
        optionsGroupRef.current.visible = false;
      }
      
      onCollision(isCorrect, gameState, (state) => {
        // Implement setGameState logic here
      }, (question) => {
        // Implement setPreviousQuestion logic here
      }, (answer) => {
        // Implement setPreviousAnswer logic here
      }, (show) => {
        // Implement setShowCorrectAnswerFlash logic here
      }, (show) => {
        // Implement setShowWrongAnswerFlash logic here
      });
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