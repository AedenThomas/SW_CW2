import { Question } from '../types/game';

const questions: Question[] = [
  {
    id: 1,
    text: "What should you do at a red traffic light?",
    options: ["Stop", "Speed up", "Continue"],
    correctAnswer: 0
  },
  {
    id: 2,
    text: "What's the speed limit in a school zone?",
    options: ["50 km/h", "30 km/h", "20 km/h"],
    correctAnswer: 2
  },
  // Add more questions...
];

export const getRandomQuestion = (): Question => {
  return questions[Math.floor(Math.random() * questions.length)];
};

export const checkAnswer = (question: Question, selectedAnswer: number): boolean => {
  return question.correctAnswer === selectedAnswer;
};
