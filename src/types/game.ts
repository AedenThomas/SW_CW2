export interface SignQuestion {
  text: string;
}

export interface SignQuestions {
  signPath: string;
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
}

export interface PowerUp {
  type: 'speed' | 'shield' | 'extraLife';
  duration: number;
  active: boolean;
}
