import { useFrame } from "@react-three/fiber";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { useRef, useEffect, useMemo, memo } from "react";
import { GAME_SPEED } from "../constants/game";
import { Question, GameState } from "../types/game";
import { LANE_POSITIONS } from '../constants/game';
import * as THREE from 'three';
import { calculateMoveAmount } from '../utils/movement';

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
}

export const MovingAnswerOptions = memo(({ 
  question, 
  onCollision, 
  gameState
}: MovingAnswerOptionsProps) => {
    const optionsGroupRef = useRef<THREE.Group>(null);
    const hasCollided = useRef(false);
    const resetPosition = useRef(false);
    const initialZ = -180;
  
    // Create a randomized mapping of options to lanes
    const randomizedOptions = useMemo(() => {
      // Create array of indices using Array.from instead of Array.keys()
      const positions = Array.from({ length: question.options.length }, (_, i) => i);
      
      // Fisher-Yates shuffle algorithm
      for (let i = positions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [positions[i], positions[j]] = [positions[j], positions[i]];
      }

      // Create mapping of shuffled positions to options
      return question.options.map((option, index) => ({
        option,
        laneIndex: positions[index],
        isCorrect: index === 0
      }));
    }, [question]); // Recreate when question changes

    // Keep track of where the correct answer ended up
    const correctLaneIndex = useMemo(() => {
      const correctOption = randomizedOptions.find(opt => opt.isCorrect);
      return correctOption ? correctOption.laneIndex : 0;
    }, [randomizedOptions]);

    useFrame((state, delta) => {
      if (!gameState.isPlaying || gameState.isPaused) return;
      
      if (!optionsGroupRef.current || resetPosition.current) return;
  
      const currentZ = optionsGroupRef.current.position.z;
      
      // Move options forward using calculateMoveAmount
      const moveAmount = calculateMoveAmount(gameState, delta, GAME_SPEED);
      optionsGroupRef.current.position.z += moveAmount;
      
      // Position-based collision detection with enhanced logging
      if (currentZ > -2 && currentZ < 2) {
        // Use targetLane if available, otherwise use currentLane
        const effectiveLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;

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
      const isCorrect = lane === correctLaneIndex;
      
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
        {randomizedOptions.map(({ option, laneIndex }, index) => {
          const lanePosition = LANE_POSITIONS[laneIndex];
          return (
            <RigidBody
              key={index}
              position={[lanePosition, 1, 0]}
              type="fixed"
              colliders="cuboid"
              sensor={true}
            >
              <CuboidCollider 
                args={[2, 1.5, 0.5]}
                sensor={true}
              />
              <mesh>
                <planeGeometry args={[4, 3]} />
                <meshStandardMaterial 
                  map={new THREE.TextureLoader().load(option)} 
                  transparent={true}
                />
              </mesh>
            </RigidBody>
          );
        })}
      </group>
    );
}, (prevProps, nextProps) => {
    // Only re-render if these specific properties change
    return prevProps.question.id === nextProps.question.id &&
           prevProps.gameState.isPlaying === nextProps.gameState.isPlaying &&
           prevProps.gameState.isPaused === nextProps.gameState.isPaused &&
           prevProps.gameState.currentLane === nextProps.gameState.currentLane &&
           prevProps.gameState.targetLane === nextProps.gameState.targetLane;
});