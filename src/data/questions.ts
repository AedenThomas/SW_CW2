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
    // Replace with your published Google Sheets URL
    // const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXKMQ8i8Ehjk8gyawm2jrkDTl1nPLYKbyjYyNnt4Rr_X3XaP6z7L0HmFj8Mamv7NOXlnCrWYpgqtHE/pub?gid=805847491&single=true&output=csv';
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR-TpyiDx-iy4jkoJOXtti5TXysu22myGdYzuD9qkcorTFlem785UUpcQXY41fdXE7QZGVbYIyLMGmo/pub?gid=0&single=true&output=csv'
    
    console.log('Fetching from:', SHEET_URL);
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    console.log('Received data:', csvText.substring(0, 200)); // Log first 200 chars to check data

    if (!csvText.trim()) {
      console.error('Received empty data from Google Sheets');
      return [];
    }

    // Split by newline and handle both \r\n and \n
    const rows = csvText.split(/\r?\n/).filter(row => row.trim());
    console.log('Number of rows:', rows.length);
    
    if (rows.length < 2) {
      console.error('Not enough rows in the data');
      return [];
    }

    const headers = rows[0].split(',').map(header => header.trim());
    console.log('Headers:', headers);

    const data = rows.slice(1).map(row => {
      const values = row.split(',');
      return headers.reduce((obj: any, header, index) => {
        obj[header] = values[index]?.trim() || '';
        return obj;
      }, {});
    });

    console.log('Parsed data sample:', data[0]); // Log first row of parsed data

    const transformedQuestions: SignQuestions[] = data.map((row, index) => {
      const question = {
        signPath: process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/" + row.SignPath,
        levelId: parseInt(row.Level) || 1, // Default to level 1 if parsing fails
        questions: [
          row.Question1 ? { id: index * 3 + 1, text: row.Question1 } : null,
          row.Question2 ? { id: index * 3 + 2, text: row.Question2 } : null,
          row.Question3 ? { id: index * 3 + 3, text: row.Question3 } : null
        ].filter((q): q is QuestionItem => q !== null),
        oracleHelp: {
          hint: row.oracleHelpHint || '',
          wrongAnswerFeedback: {
            "1": "That's not correct - try again.",
            "2": "Not quite right - look carefully at the signs."
          },
          correctAnswerInsight: row.oracleHelpcorrectAnswerInsight || ''
        }
      };
      console.log('Transformed question:', question); // Log each transformed question
      return question;
    });

    console.log('Total questions loaded:', transformedQuestions.length);
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
