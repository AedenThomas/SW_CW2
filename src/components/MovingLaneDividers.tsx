import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { Vector3 } from "three";
import { GAME_SPEED } from "../constants/game";
import { GameState } from "../types/game";


export function MovingLaneDividers({ gameState }: { gameState: GameState }) {
    const dividerRefs = useRef<Array<{ position: Vector3 }>>([]);
    const spacing = 10;
    const numMarkers = 20;
  
    useFrame((state, delta) => {
      if (!gameState.isPlaying || gameState.isPaused) return; // Add pause check
      
      const moveAmount = GAME_SPEED * gameState.multiplier * delta * 60;
      
      dividerRefs.current.forEach(marker => {
        marker.position.z += moveAmount;
        if (marker.position.z > 20) {
          marker.position.z -= spacing * numMarkers;
        }
      });
    });
  
    return (
      <>
        {[-2, 2].map((x, laneIndex) => (
          Array.from({ length: numMarkers }).map((_, index) => (
            <mesh
              key={`${laneIndex}-${index}`}
              position={[x, 0.01, -spacing * index]}
              rotation={[-Math.PI / 2, 0, 0]}
              ref={(ref: any) => {
                if (ref) {
                  if (!dividerRefs.current[laneIndex * numMarkers + index]) {
                    dividerRefs.current[laneIndex * numMarkers + index] = ref;
                  }
                }
              }}
            >
              <planeGeometry args={[0.2, 3]} />
              <meshStandardMaterial color="white" emissive="white" emissiveIntensity={0.5} />
            </mesh>
          ))
        ))}
      </>
    );
  }