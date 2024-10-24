import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three'; // Import THREE namespace
import { GameState } from '../types/game';

interface CoinsProps {
  gameState: GameState;
  onCollect: () => void;
}

const Coins: React.FC<CoinsProps> = ({ gameState, onCollect }) => {
    const coinsRef = useRef<THREE.Group>(null);

    useFrame((state, delta) => {
        if (coinsRef.current) {
            coinsRef.current.position.z += delta * 0.1 * gameState.speed; // Move along z-axis
        }
    });

    return (
        <group ref={coinsRef} position={[0, 1, -5]}> {/* Adjust position */}
            <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[1, 32, 32]} /> {/* Increase size */}
                <meshStandardMaterial color="yellow" />
            </mesh>
        </group>
    );
};

export default Coins;
