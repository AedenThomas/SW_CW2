export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
}

export interface GameState {
  score: number;
  speed: number;
  currentLane: number;
  lives: number;
  combo: number;
  multiplier: number;
  isGameOver: boolean;
  currentQuestion: Question | null;
  isMoving: boolean;
}

export interface PowerUp {
  type: 'speed' | 'shield' | 'extraLife';
  duration: number;
  active: boolean;
}
