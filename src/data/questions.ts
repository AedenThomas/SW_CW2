import { read, utils } from 'xlsx';
import { SignQuestions } from '../types/game';

// Keep track of all available signs
let allAvailableSigns: string[] = [];

// Helper function to get random signs excluding the current one
const getRandomSigns = (currentSign: string, count: number = 2): string[] => {
  console.log('Getting random signs:', {
    currentSign,
    totalAvailableSigns: allAvailableSigns.length,
    allSigns: allAvailableSigns
  });
  
  // Filter out the current sign from available options
  const otherSigns = allAvailableSigns.filter(sign => sign !== currentSign);
  
  console.log('Filtered signs:', {
    otherSignsCount: otherSigns.length,
    currentSignFound: allAvailableSigns.includes(currentSign)
  });
  
  // Shuffle and take required number of signs
  const randomSigns = [...otherSigns]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);
    
  console.log('Selected random signs:', {
    count,
    selectedSigns: randomSigns,
    originalSign: currentSign
  });
    
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
    const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSXKMQ8i8Ehjk8gyawm2jrkDTl1nPLYKbyjYyNnt4Rr_X3XaP6z7L0HmFj8Mamv7NOXlnCrWYpgqtHE/pub?gid=805847491&single=true&output=csv';

    
    console.log('Fetching from:', SHEET_URL);
    const response = await fetch(SHEET_URL);
    const csvText = await response.text();
    
    if (!csvText.trim()) {
      console.error('Received empty data from Google Sheets');
      return [];
    }

    const rows = csvText.split(/\r?\n/).filter(row => row.trim());
    
    if (rows.length < 2) {
      console.error('Not enough rows in the data');
      return [];
    }

    const headers = rows[0].split(',').map(header => header.trim());

    const data = rows.slice(1).map(row => {
      const values = row.split(',');
      return headers.reduce((obj: any, header, index) => {
        obj[header] = values[index]?.trim() || '';
        return obj;
      }, {});
    });

    // Clear and populate allAvailableSigns
    allAvailableSigns = data.map(row => {
      const isUrl = row.SignPath.startsWith('http') || row.SignPath.startsWith('https');
      const path = isUrl 
        ? row.SignPath 
        : process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/" + row.SignPath;
      return path;
    });

    console.log('Populated available signs:', {
      count: allAvailableSigns.length,
      signs: allAvailableSigns
    });

    const transformedQuestions: SignQuestions[] = data.map((row, index) => {
      const isUrl = row.SignPath.startsWith('http') || row.SignPath.startsWith('https');
      const signPath = isUrl 
        ? row.SignPath 
        : process.env.PUBLIC_URL + "/signs/warning-signs-jpg/notion/" + row.SignPath;

      return {
        signPath,
        levelId: parseInt(row.Level) || 1,
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
  console.log('Getting options for question:', {
    signPath,
    availableSignsCount: allAvailableSigns.length
  });
  
  const randomSigns = getRandomSigns(signPath, 2);
  const options = [signPath, ...randomSigns];
  
  console.log('Final options:', {
    correctAnswer: signPath,
    alternatives: randomSigns,
    allOptions: options
  });
  
  return options;
};
