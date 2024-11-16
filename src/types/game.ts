export interface SignQuestion {
  id: number;  // Add this line
  text: string;
}

export interface SignQuestions {
  signPath: string;
  levelId: number;  // Add this line
  questions: SignQuestion[];
  oracleHelp: {
    hint: string;
    wrongAnswerFeedback: {
      [key: string]: string;
    };
    correctAnswerInsight: string;
  };
}

export interface Question extends SignQuestion {
  id: number;
  signPath: string;
  options: string[];
  correctAnswer: number;
  oracleHelp: {
    hint: string;
    wrongAnswerFeedback: {
      [key: string]: string;
    };
    correctAnswerInsight: string;
  };
}

export type GameMode = 'infinite' | 'levels';

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
  consecutiveCorrect: number;
  showingCorrectAnswer: boolean; // Add this line
  isPaused: boolean;
  gameMode: GameMode | null;
  currentLevel: number;
  levelQuestions: SignQuestions[];
  askedQuestions: Set<number>;
}

export interface PowerUp {
  type: 'speed' | 'shield' | 'extraLife';
  duration: number;
  active: boolean;
}
