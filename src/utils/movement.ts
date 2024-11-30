import { GameState } from '../types/game';

const DEBUG_SPEED = false;

export const calculateMoveAmount = (gameState: GameState, delta: number, GAME_SPEED: number) => {
    const moveAmount = GAME_SPEED * gameState.speed * gameState.multiplier * delta * 60;
    
    if (DEBUG_SPEED) {
    }
    
    return moveAmount;
}; 