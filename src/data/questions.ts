import { SignQuestions } from '../types/game';

// Helper function to get random signs excluding the current one
const getRandomSigns = (currentSign: string, count: number = 2): string[] => {
  const allSigns = [
    '501.jpg', '502.jpg', '503.jpg', '504.1.jpg', '504.1L.jpg'
  ];
  
  const otherSigns = allSigns.filter(sign => !currentSign.includes(sign));
  const randomSigns = [...otherSigns]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(sign => process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/" + sign);
    
  return randomSigns;
};

// Add this new function
export const getLevelQuestions = (levelId: number): SignQuestions[] => {
  const levelQuestions = questions.filter(q => q.levelId === levelId);
  console.log(`Getting questions for level ${levelId}:`, levelQuestions); // Debug log
  return levelQuestions;
};

export const questions: SignQuestions[] = [
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/504.1L.jpg",
    levelId: 1,
    questions: [
      {
        id: 1,
        text: "Which UK warning road sign features a black cross-shaped symbol with an arrow pointing to the left within a red triangular border?"
      },
      // {
      //   id: 2,
      //   text: "What traffic sign would warn drivers that they are approaching a junction where traffic from the left has priority?"
      // },
      // {
      //   id: 3,
      //   text: "In the UK Highway Code, which warning sign indicates a crossroads ahead where vehicles must give way to traffic approaching from the left?"
      // }
    ],
    oracleHelp: {
      hint: "Look for the distinctive cross shape with a left-pointing arrow - this indicates a junction where traffic from the left has priority.",
      wrongAnswerFeedback: {
        "1": "That sign doesn't indicate a junction with left priority - look for the cross shape with left arrow.",
        "2": "This isn't the correct sign for a left priority junction - the correct sign has a distinctive cross shape."
      },
      correctAnswerInsight: "This sign warns drivers of an upcoming junction where vehicles must give way to traffic approaching from the left, shown by the cross shape with left-pointing arrow. "
    }
  },
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/504.1.jpg",
    levelId: 1,
    questions: [
      {
        id: 4,
        text: "Which warning sign shows a black cross-shaped symbol indicating a crossroads ahead?"
      },
      // {
      //   id: 5,
      //   text: "What road sign would you expect to see before approaching an intersection where all roads have equal priority?"
      // },
      // {
      //   id: 6,
      //   text: "In the UK Highway Code, which triangular warning sign features a symmetrical cross pattern indicating a four-way junction ahead?"
      // }
    ],
    oracleHelp: {
      hint: "Look for the symmetrical cross pattern - this indicates a crossroads where all approaches have equal priority.",
      wrongAnswerFeedback: {
        "1": "That's not the crossroads sign - look for the symmetrical cross pattern.",
        "2": "This sign doesn't indicate a four-way junction - the correct sign has a distinctive cross shape."
      },
      correctAnswerInsight: "This sign warns drivers of an upcoming crossroads where all approaches have equal priority, shown by the symmetrical cross pattern."
    }
  },
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/503.jpg",
    levelId: 2,
    questions: [
      {
        id: 7,
        text: "Which warning sign indicates that drivers must yield to traffic in 50 yards?"
      },
      // {
      //   id: 8,
      //   text: "What triangular sign features the text '50 yds' below a 'Give Way' symbol?"
      // },
      // {
      //   id: 9,
      //   text: "Which advance warning sign tells drivers they will need to give way ahead?"
      // }
    ],
    oracleHelp: {
      hint: "This sign combines the 'Give Way' symbol with a distance indicator - warning drivers to prepare to yield ahead.",
      wrongAnswerFeedback: {
        "1": "That's not the advance yield warning - look for the sign with the distance marker.",
        "2": "This sign doesn't show the correct yield warning - check for the '50 yds' indicator."
      },
      correctAnswerInsight: "This sign gives drivers advance notice of an upcoming yield situation, allowing them to prepare to give way safely."
    }
  },
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/502.jpg",
    levelId: 2,
    questions: [
      {
        id: 10,
        text: "Which sign warns drivers of a STOP sign 100 yards ahead?"
      },
      // {
      //   id: 11,
      //   text: "What advance warning sign features the word 'STOP' with a distance indicator?"
      // },
      // {
      //   id: 12,
      //   text: "Which triangular warning sign tells drivers they will need to make a complete stop ahead?"
      // }
    ],
    oracleHelp: {
      hint: "Look for the word 'STOP' with the distance indicator - this gives advance warning of a stop requirement ahead.",
      wrongAnswerFeedback: {
        "1": "That's not the advance stop warning - look for the sign with 'STOP' text.",
        "2": "This sign doesn't indicate an upcoming stop - check for the distance marker."
      },
      correctAnswerInsight: "This sign provides crucial advance warning of a stop requirement, allowing drivers to prepare to come to a complete stop safely."
    }
  },
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/1/501.jpg",
    levelId: 3,
    questions: [
      {
        id: 13,
        text: "Which triangular warning sign shows the standard 'Give Way' symbol?"
      },
      {
        id: 14,
        text: "What sign indicates that drivers must yield to other traffic at an upcoming junction?"
      },
      {
        id: 15,
        text: "Which red and white triangular sign warns drivers they must give way ahead?"
      }
    ],
    oracleHelp: {
      hint: "Look for the inverted triangle symbol - this is the universal indication for yielding to other traffic.",
      wrongAnswerFeedback: {
        "1": "That's not the yield sign - look for the inverted triangle symbol.",
        "2": "This sign doesn't indicate yielding - check for the distinctive triangular shape."
      },
      correctAnswerInsight: "This sign uses the universal inverted triangle symbol to clearly indicate where drivers must yield to other traffic."
    }
  },
  
];

// Update this function to always put the correct answer first
export const getOptionsForQuestion = (signPath: string): string[] => {
  const randomSigns = getRandomSigns(signPath, 2);
  // Always put the correct answer first, then shuffle the wrong answers
  return [signPath, ...randomSigns];
};
