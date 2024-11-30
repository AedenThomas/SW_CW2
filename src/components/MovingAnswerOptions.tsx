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
    const lastCollisionTime = useRef(0); // Add this ref for debouncing
    const collisionCooldown = 500; // Add cooldown period in milliseconds
    const initialZ = -180;
    const fadeState = useRef<'visible' | 'fading' | 'hidden'>('visible');
    const currentOpacity = useRef(1);
    const isTransitioning = useRef(false);
    const lastLaneChecked = useRef<number | null>(null);
  
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

    // Add debug logging
    const debugPositions = () => {
      if (!optionsGroupRef.current) return;
      
      const positions = optionsGroupRef.current.children.map((child, index) => ({
        index,
        position: child.position.toArray(),
        z: child.position.z
      }));
      
      // Check for z-position inconsistencies
      const zPositions = positions.map(p => p.z);
      const maxZDiff = Math.max(...zPositions) - Math.min(...zPositions);
      
      if (maxZDiff > 0.1) {  // If z-positions differ by more than 0.1 units
        console.warn('Z-position inconsistency detected:', maxZDiff);
        
        // Force synchronize z-positions
        optionsGroupRef.current.children.forEach(child => {
          child.position.z = 0;
        });
      }
    };

    // Add debug state
    const debugRef = useRef({
      lastLoggedZ: 0,
      hasLoggedCollisionAttempt: false
    });

    useFrame((state, delta) => {
      if (!gameState.isPlaying || gameState.isPaused) return;
      if (!optionsGroupRef.current || resetPosition.current) return;
  
      const currentZ = optionsGroupRef.current.position.z;
      const moveAmount = calculateMoveAmount(gameState, delta, GAME_SPEED);
      optionsGroupRef.current.position.z += moveAmount;

      // Only log when entering collision zone
      if (currentZ > -3 && currentZ < 3 && Math.abs(currentZ - debugRef.current.lastLoggedZ) > 1) {
        console.log('Options Group Status:', {
          z: currentZ.toFixed(2),
          hasCollided: hasCollided.current,
          lane: gameState.currentLane,
          targetLane: gameState.targetLane,
          correctLaneIndex,
          isTransitioning: isTransitioning.current
        });
        debugRef.current.lastLoggedZ = currentZ;
      }

      // Improved collision detection zone
      const COLLISION_ZONE_START = -3;
      const COLLISION_ZONE_END = 3;
      
      if (currentZ > COLLISION_ZONE_START && currentZ < COLLISION_ZONE_END) {
        const now = performance.now();
        const effectiveLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;
        
        // Log first collision check attempt
        if (!debugRef.current.hasLoggedCollisionAttempt) {
          console.log('Attempting collision check:', {
            effectiveLane,
            hasCollided: hasCollided.current,
            timeSinceLastCollision: now - lastCollisionTime.current,
            lastLaneChecked: lastLaneChecked.current,
            isTransitioning: isTransitioning.current
          });
          debugRef.current.hasLoggedCollisionAttempt = true;
        }

        // Modified collision detection logic to handle transitions
        if (!hasCollided.current && 
            (now - lastCollisionTime.current > collisionCooldown) &&
            (lastLaneChecked.current !== effectiveLane || currentZ > -0.5 && currentZ < 0.5)) {
          
          const preciseCollisionPoint = Math.abs(currentZ) < 0.5;
          
          // Removed isTransitioning check and simplified collision condition
          if (preciseCollisionPoint || (currentZ > -1 && currentZ < 1)) {
            console.log('Collision detected!', {
              lane: effectiveLane,
              correctLane: correctLaneIndex,
              isCorrect: effectiveLane === correctLaneIndex,
              z: currentZ.toFixed(2)
            });
            handleCollision(effectiveLane);
            lastCollisionTime.current = now;
            lastLaneChecked.current = effectiveLane;
          }
        }
      }

      // Reset debug state when options move past
      if (currentZ > 3) {
        debugRef.current.hasLoggedCollisionAttempt = false;
      }

      // Smooth opacity transitions
      if (fadeState.current === 'fading') {
        currentOpacity.current = Math.max(0, currentOpacity.current - (delta * 2));
        updateMaterialsOpacity(currentOpacity.current);
        
        if (currentOpacity.current <= 0) {
          fadeState.current = 'hidden';
        }
      }
      
      // Enhanced collision detection
      if (currentZ > -2 && currentZ < 2) {
        const now = performance.now();
        const effectiveLane = gameState.targetLane !== null ? gameState.targetLane : gameState.currentLane;
        
        // Only check for collision if:
        // 1. We haven't collided yet
        // 2. We're past the cooldown
        // 3. The lane has changed since our last check OR we haven't checked yet
        // 4. We're not currently transitioning between lanes
        if (!hasCollided.current && 
            (now - lastCollisionTime.current > collisionCooldown) &&
            (lastLaneChecked.current !== effectiveLane) && 
            !isTransitioning.current) {
          
          // Don't trigger collision during lane transition
          if (gameState.targetLane === null || gameState.targetLane === gameState.currentLane) {
            handleCollision(effectiveLane);
            lastCollisionTime.current = now;
            lastLaneChecked.current = effectiveLane;
          }
        }
      }
      
      // Smoother reset handling
      if (currentZ > 10 && !resetPosition.current) {
        resetPosition.current = true;
        fadeState.current = 'fading';
        
        // Wait for fade out before resetting position
        setTimeout(() => {
          if (optionsGroupRef.current) {
            optionsGroupRef.current.position.z = initialZ;
            fadeState.current = 'visible';
            currentOpacity.current = 1;
            updateMaterialsOpacity(1);
            resetPosition.current = false;
            hasCollided.current = false;
            lastLaneChecked.current = null;
          }
        }, 500);
      }

      // Debug position sync every 60 frames
      if (Math.random() < 0.02) { // ~2% chance per frame
        debugPositions();
      }
    });
  
    const handleCollision = (lane: number) => {
      if (hasCollided.current) {
        console.log('Collision ignored - already processed');
        return;
      }

      console.log('Processing collision:', {
        lane,
        correctLaneIndex,
        isCorrect: lane === correctLaneIndex
      });

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
  
    // Add helper function to update all materials
    const updateMaterialsOpacity = (opacity: number) => {
      if (!optionsGroupRef.current) return;
      
      optionsGroupRef.current.children.forEach(rigidBody => {
        const mesh = rigidBody.children?.[1] as THREE.Mesh;
        const material = mesh?.material as THREE.MeshStandardMaterial;
        
        if (material) {
          material.opacity = opacity;
          material.transparent = true;
          material.needsUpdate = true;
        }
      });
    };

    // Reset refs and position when question changes
    useEffect(() => {
      hasCollided.current = false;
      resetPosition.current = false;
      lastCollisionTime.current = 0;
      lastLaneChecked.current = null;
      fadeState.current = 'visible';
      currentOpacity.current = 1;
      
      debugRef.current = {
        lastLoggedZ: 0,
        hasLoggedCollisionAttempt: false
      };
      console.log('Question changed, options reset:', {
        questionId: question.id,
        correctLaneIndex
      });

      if (optionsGroupRef.current) {
        optionsGroupRef.current.position.z = initialZ;
        updateMaterialsOpacity(1);
      }
    }, [question]);

    // Remove the lane transition effect since we're handling it differently
    useEffect(() => {
      isTransitioning.current = false; // Always keep this false now
    }, [gameState.targetLane]);

    // Add position sync on initial render and question change
    useEffect(() => {
      if (optionsGroupRef.current) {
        optionsGroupRef.current.children.forEach(child => {
          child.position.z = 0;
        });
        debugPositions();
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
              rotation={[0, 0, 0]}
            >
              <CuboidCollider 
                args={[2, 1.5, 1]} // Increased depth for better collision detection
                sensor={true}
              />
              <mesh
                // Ensure mesh is slightly in front of the RigidBody
                position={[0, 0, -0.01]}
                renderOrder={1}
              >
                <planeGeometry args={[4, 3]} />
                <meshStandardMaterial 
                  map={new THREE.TextureLoader().load(option)} 
                  transparent={true}
                  // Enable depth testing but write to depth buffer
                  depthTest={true}
                  depthWrite={true}
                  // Ensure material renders on top
                  polygonOffset={true}
                  polygonOffsetFactor={-1}
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