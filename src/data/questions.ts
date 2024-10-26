import { Question } from '../types/game';

export const questions: Omit<Question, 'id'>[] = [
  {
    text: "What should you do at a red traffic light?",
    options: ["Keep driving", "Stop completely", "Slow down"],
    correctAnswer: 1,
    oracleHelp: {
      hint: "Think about the universal meaning of red in traffic signals...",
      wrongAnswerFeedback: {
        0: "Continuing through a red light puts everyone at risk. Red means danger!",
        2: "Slowing down isn't enough - red lights require a complete stop to ensure safety."
      },
      correctAnswerInsight: "Perfect! Red means stop - this is a universal rule that keeps everyone safe at intersections."
    }
  },
  {
    text: "What's the speed limit in a school zone?",
    options: ["30 km/h", "50 km/h", "60 km/h"],
    correctAnswer: 0,
    oracleHelp: {
      hint: "Consider the presence of children and the need for extra reaction time...",
      wrongAnswerFeedback: {
        1: "50 km/h is too fast for a school zone - children may appear suddenly!",
        2: "60 km/h poses a serious risk in areas where children are present."
      },
      correctAnswerInsight: "Excellent! 30 km/h gives you crucial extra seconds to react to unexpected situations with children."
    }
  },
  {
    text: "When should you use your turn signals?",
    options: ["Never", "Sometimes", "Always before turning"],
    correctAnswer: 2,
    oracleHelp: {
      hint: "Consider how turn signals help communicate your intentions to other drivers...",
      wrongAnswerFeedback: {
        0: "Never using turn signals leaves other drivers guessing - very dangerous!",
        1: "Sometimes isn't enough - other drivers always need to know your intentions."
      },
      correctAnswerInsight: "Correct! Always using turn signals is crucial for communicating with other drivers."
    }
  },
  // Add more questions as needed
];
