import { Question } from '../types/game';

export const questions: Omit<Question, 'id'>[] = [
  {
    text: "Select the correct warning sign indicating a junction ahead.",
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/504.1.jpg",
    options: [
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/504.1.jpg", // Correct Answer
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/502.jpg",
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/503.jpg"
    ],
    correctAnswer: 0,
    oracleHelp: {
      hint: "This sign alerts you to a potential merging situation.",
      wrongAnswerFeedback: {
        "1": "Road narrows signs typically have two converging lines.",
        "2": "No entry signs are usually circular and red with a white horizontal line."
      },
      correctAnswerInsight: "The sign indicates a junction is coming up, alerting drivers to prepare for possible merging traffic."
    }
  },
  {
    text: "Select the correct sign indicating to yield in 50 yards.",
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/503.jpg",
    options: [
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/503.jpg", // Correct Answer
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/504.1.jpg",
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/502.jpg"
    ],
    correctAnswer: 0,
    oracleHelp: {
      hint: "Think about what 'Give Way' usually means on the road.",
      wrongAnswerFeedback: {
        "1": "Stopping immediately might cause accidents unless it's a stop sign.",
        "2": "Speeding up could be dangerous if you're supposed to yield."
      },
      correctAnswerInsight: "The sign warns you to yield in 50 yards, allowing others to proceed first."
    }
  },
  {
    text: "Select the correct sign indicating a stop sign is 100 yards ahead.",
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/502.jpg",
    options: [
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/502.jpg", // Correct Answer
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/503.jpg",
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/504.1.jpg"
    ],
    correctAnswer: 0,
    oracleHelp: {
      hint: "Consider the meaning of the word 'STOP' and the distance indicated.",
      wrongAnswerFeedback: {
         1: "Speed limits are typically given in miles or kilometers per hour, not yards.",
         2: "There's no pedestrian crossing symbol or mention in the sign."
      },
      correctAnswerInsight: "The sign is warning that a stop sign is 100 yards ahead, allowing drivers to prepare to stop."
    }
  },
  {
    text: "Select the correct sign indicating to yield.",
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/501.jpg",
    options: [
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/501.jpg", // Correct Answer
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/502.jpg",
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/503.jpg"
    ],
    correctAnswer: 0,
    oracleHelp: {
      hint: "This sign indicates that you must allow others the right of way.",
      wrongAnswerFeedback: {
        "1": "This sign does not indicate a complete stop is required.",
        "2": "This sign is not indicating a prohibition of entry."
      },
      correctAnswerInsight: "The inverted red triangle is a universal symbol for yielding to other traffic."
    }
  },
  {
    text: "Select the correct warning sign indicating a junction on the left.",
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/504.1L.jpg",
    options: [
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/504.1L.jpg", // Correct Answer
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/502.jpg",
      process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/503.jpg"
    ],
    correctAnswer: 0,
    oracleHelp: {
      hint: "This sign alerts drivers to potential crossings or turns ahead.",
      wrongAnswerFeedback: {
        "1": "This sign does not prohibit turning; it alerts to an upcoming junction.",
        "2": "The sign does not indicate lane changes; it's about road layout."
      },
      correctAnswerInsight: "This triangular warning sign indicates there is a junction on the left."
    }
  }
];
