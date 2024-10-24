import { Question } from '../types/game';

export const questions: Omit<Question, 'id'>[] = [
  {
    text: "What should you do at a red traffic light?",
    options: ["Keep driving", "Stop completely", "Slow down"],
    correctAnswer: 1
  },
  {
    text: "What's the speed limit in a school zone?",
    options: ["30 km/h", "50 km/h", "60 km/h"],
    correctAnswer: 0
  },
  {
    text: "When should you use your turn signals?",
    options: ["Never", "Sometimes", "Always before turning"],
    correctAnswer: 2
  },
  // Add more questions as needed
];
