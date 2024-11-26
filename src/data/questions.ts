import { SignQuestions } from '../types/game';

// Helper function to get random signs excluding the current one
const getRandomSigns = (currentSign: string, count: number = 2): string[] => {
  const allSigns = ['1.1.jpg', '1.2.jpg', '1.3.jpg', '2.1.jpg', '2.2.jpg', '2.3.jpg', '3.1.jpg'];
  
  const otherSigns = allSigns.filter(sign => !currentSign.includes(sign));
  const randomSigns = [...otherSigns]
    .sort(() => Math.random() - 0.5)
    .slice(0, count)
    .map(sign => process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/" + sign);
    
  return randomSigns;
};

export const getLevelQuestions = (levelId: number): SignQuestions[] => {
  return questions.filter(q => q.levelId === levelId);
};

export const questions: SignQuestions[] = [
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/1.1.jpg",
    levelId: 1,
    questions: [
      {
        id: 1,
        text: "Which sign says stop?"
      },
      {
        id: 2,
        text: "If this sign is on the road you must brake until you stop."
      },
      {
        id: 3,
        text: "Which sign shows you must you come to a complete halt for to give way to other cars at the end of the road"
      }
    ],
    oracleHelp: {
      hint: "The stop sign is a sign that means we have to stop on the road, you must brake until you come to a halt when you see this sign.",
      wrongAnswerFeedback: {
        "1": "That's not the stop sign - look for the sign that requires a complete halt.",
        "2": "This isn't correct - the stop sign is very distinctive and requires you to stop completely."
      },
      correctAnswerInsight: "The stop sign is a sign that means we have to stop on the road, you must brake until you come to a halt when you see this sign. This sign usually accompanies traffic signs. It is there to act as a safety precaution for other cars."
    }
  },
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/1.2.jpg",
    levelId: 1,
    questions: [
      {
        id: 4,
        text: "Which sign means no entry to the road"
      },
      {
        id: 5,
        text: "Which sign often accompanies a one way sign to showcase the opposite"
      }
    ],
    oracleHelp: {
      hint: "Look for the sign that indicates you cannot enter this road.",
      wrongAnswerFeedback: {
        "1": "That's not the no entry sign - look for the sign that prohibits entry.",
        "2": "This isn't the correct sign - the no entry sign clearly shows you cannot enter."
      },
      correctAnswerInsight: "The no entry sign clearly indicates that vehicles are not permitted to enter this road."
    }
  },
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/1.3.jpg",
    levelId: 1,
    questions: [
      {
        id: 6,
        text: "Which sign shows that you need to give way at the end of the road"
      },
      {
        id: 7,
        text: "You are approaching the end of the road, which sign would you expect to see if its not an extremely busy road"
      },
      {
        id: 8,
        text: "What sign tells you to let cars on the other road pass first"
      }
    ],
    oracleHelp: {
      hint: "The Give Way sign appears at the end of a road and shows that the driver should stop and wait until the road is free to drive onto it, this is different to a Stop sign as it is not always required that you come to a complete stop",
      wrongAnswerFeedback: {
        "1": "That's not the give way sign - look for the sign that indicates yielding to other traffic.",
        "2": "This isn't correct - the give way sign shows you need to let other traffic pass first."
      },
      correctAnswerInsight: "The Give Way sign appears at the end of a road and shows that the driver should stop and wait until the road is free to drive onto it, this is different to a Stop sign as it is not always required that you come to a complete stop"
    }
  },
  // Level 2 Questions
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/2.2.jpg",
    levelId: 2,
    questions: [
      {
        id: 9,
        text: "Which sign means you can't overtake"
      },
      {
        id: 10,
        text: "what sign would mean the same as a solid white line between the lanes of a road"
      }
    ],
    oracleHelp: {
      hint: "Look for the sign that prohibits passing other vehicles on this stretch of road.",
      wrongAnswerFeedback: {
        "1": "That's not the no overtaking sign - look for the sign that prohibits passing other vehicles.",
        "2": "This isn't correct - the no overtaking sign indicates you cannot pass other vehicles."
      },
      correctAnswerInsight: "This sign indicates a no overtaking zone, similar to a solid white line, meaning it's not safe or legal to pass other vehicles in this area."
    }
  },
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/2.3.jpg",
    levelId: 2,
    questions: [
      {
        id: 11,
        text: "What sign indicates that you can't turn right"
      },
      {
        id: 12,
        text: "Which sign can be found on traffic lights to give you information about a turning you cant take"
      }
    ],
    oracleHelp: {
      hint: "Look for the sign that prohibits right turns at this junction.",
      wrongAnswerFeedback: {
        "1": "That's not the no right turn sign - look for the sign that prohibits turning right.",
        "2": "This isn't correct - the sign should clearly show that right turns are not permitted."
      },
      correctAnswerInsight: "This sign clearly indicates that right turns are prohibited at this junction, often found alongside traffic signals."
    }
  },
  // Level 3 Questions
  {
    signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/3.1.jpg",
    levelId: 3,
    questions: [
      {
        id: 13,
        text: "Which sign means a National Speed Limit"
      },
      {
        id: 14,
        text: "Which sign means a speed limit of 70mph on a dual-carriageway"
      },
      {
        id: 15,
        text: "Which sign means a speed limit of 60mph when not on a dual-carriageway"
      }
    ],
    oracleHelp: {
      hint: "The National Speed Limit sign means that the speed limit is either 70mph (on a dual-carriageway) or 60mph when not",
      wrongAnswerFeedback: {
        "1": "That's not the national speed limit sign - look for the sign that indicates standard speed limits apply.",
        "2": "This isn't correct - the national speed limit sign shows when standard speed restrictions are in effect."
      },
      correctAnswerInsight: "The National Speed Limit sign is to show that the speed limit is at its regular regulations on dual-carriageways or not, these limits are 70mph and 60mph respectively"
    }
  }
];

export const getOptionsForQuestion = (signPath: string): string[] => {
  const randomSigns = getRandomSigns(signPath, 2);
  return [signPath, ...randomSigns];
};
