import { read, utils } from 'xlsx';
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

interface ExcelQuestion {
  SignPath: string;
  Level: number;
  Question1: string;
  Question2: string;
  Question3: string;
  oracleHelpHint: string;
  oracleHelpcorrectAnswerInsight: string;
}

interface QuestionItem {
  id: number;
  text: string;
}

type QuestionOrNull = QuestionItem | null;

export const loadQuestions = async (): Promise<SignQuestions[]> => {
  try {
    const response = await fetch(`${process.env.PUBLIC_URL}/data/questions.xlsx`);
    const arrayBuffer = await response.arrayBuffer();
    const workbook = read(arrayBuffer);
    
    // Assuming first sheet
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const excelData = utils.sheet_to_json<ExcelQuestion>(worksheet);

    const transformedQuestions: SignQuestions[] = excelData.map((row, index) => {
      // Convert each Excel row to our SignQuestions format
      return {
        signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/" + row.SignPath,
        levelId: row.Level,
        questions: [
          row.Question1 ? { id: index * 3 + 1, text: row.Question1 } : null,
          row.Question2 ? { id: index * 3 + 2, text: row.Question2 } : null,
          row.Question3 ? { id: index * 3 + 3, text: row.Question3 } : null
        ].filter((q): q is QuestionItem => q !== null),
        oracleHelp: {
          hint: row.oracleHelpHint,
          wrongAnswerFeedback: {
            "1": "That's not correct - try again.",
            "2": "Not quite right - look carefully at the signs."
          },
          correctAnswerInsight: row.oracleHelpcorrectAnswerInsight
        }
      };
    });

    return transformedQuestions;
  } catch (error) {
    console.error('Error loading questions:', error);
    return [];
  }
};

export const questions: SignQuestions[] = [];

// This will be called to initialize the questions
export const initializeQuestions = async () => {
  const loadedQuestions = await loadQuestions();
  questions.length = 0; // Clear existing
  questions.push(...loadedQuestions);
};

export const getLevelQuestions = (levelId: number): SignQuestions[] => {
  return questions.filter(q => q.levelId === levelId);
};

export const getOptionsForQuestion = (signPath: string): string[] => {
  const randomSigns = getRandomSigns(signPath, 2);
  return [signPath, ...randomSigns];
};
