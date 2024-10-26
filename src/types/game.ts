export interface Question {
  id: number;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
  oracleHelp: {
    hint: string;
    wrongAnswerFeedback: Record<number, string>; // Specific feedback for each wrong option
    correctAnswerInsight: string;
  };
}

export interface GameState {
  score: number;
  speed: number;
  currentLane: number;
  lives: number; // Only used in normal mode
  combo: number;
  multiplier: number;
  isGameOver: boolean;
  currentQuestion: Question | null;
  isMoving: boolean;
  coinsCollected: number;
  oracleMode: boolean;
  oracleFeedback: {
    message: string;
    type: 'hint' | 'correction' | 'praise';
    shown: boolean;
  } | null;
  isPlaying: boolean;
  mistakeCount: number; // Track mistakes in Oracle mode
  hintsUsed: number;
}

export interface PowerUp {
  type: 'speed' | 'shield' | 'extraLife';
  duration: number;
  active: boolean;
}
