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
  activeOptionZones: { start: number; end: number; }[]; // Add this new property
  questionsAnswered: number;  // Add this new property
  targetLane: number | null;
  coinsScore: number;  // Add this new property
  magnetActive: boolean;
  magnetTimer: NodeJS.Timeout | null;
  showMagnet: boolean;
}

export interface PowerUp {
  type: 'speed' | 'shield' | 'extraLife';
  duration: number;
  active: boolean;
}

export interface LevelProgress {
  highScore: number;
  remainingLives: number;
  completed: boolean;
  lastPlayed: string;
}

export interface LevelProgressMap {
  [levelId: number]: LevelProgress;
}

export interface CoinsProps {
  lane: number;
  gameState: GameState;
  onCollect: (id: number) => void;
  startingZ: number;
}
