// import { Question } from '../types/game';

// const questions: Question[] = [
//   {
//     id: 1,
//     text: "What should you do at a red traffic light?",
//     options: ["Stop", "Speed up", "Continue"],
//     correctAnswer: 0,
//     oracleHelp: {
//       hint: "Think about the universal meaning of red in traffic signals...",
//       wrongAnswerFeedback: {
//         1: "Speeding up at a red light is extremely dangerous!",
//         2: "Continuing through a red light puts everyone at risk."
//       },
//       correctAnswerInsight: "Excellent! Stopping at red lights is fundamental to road safety."
//     }
//   },
//   {
//     id: 2,
//     text: "What's the speed limit in a school zone?",
//     options: ["50 km/h", "30 km/h", "20 km/h"],
//     correctAnswer: 2,
//     oracleHelp: {
//       hint: "Think about the presence of children and the need for extra caution...",
//       wrongAnswerFeedback: {
//         0: "50 km/h is far too fast for a school zone!",
//         1: "30 km/h is still too fast when children might be present."
//       },
//       correctAnswerInsight: "Perfect! 20 km/h ensures maximum safety in school zones."
//     }
//   }
//   // Add more questions...
// ];

// export const getRandomQuestion = (): Question => {
//   return questions[Math.floor(Math.random() * questions.length)];
// };

// export const checkAnswer = (question: Question, selectedAnswer: number): boolean => {
//   return question.correctAnswer === selectedAnswer;
// };

export {};
