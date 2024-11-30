import { LevelProgress, LevelProgressMap } from '../types/game';

const STORAGE_KEY = 'roadSafetyGameProgress';

export const saveLevelProgress = (levelId: number, progress: LevelProgress): void => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  const progressMap: LevelProgressMap = existingData ? JSON.parse(existingData) : {};
  
  progressMap[levelId] = progress;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap));
};

export const getLevelProgress = (levelId: number): LevelProgress | null => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  if (!existingData) return null;
  
  const progressMap: LevelProgressMap = JSON.parse(existingData);
  return progressMap[levelId] || null;
};

export const getAllLevelProgress = (): LevelProgressMap => {
  const existingData = localStorage.getItem(STORAGE_KEY);
  return existingData ? JSON.parse(existingData) : {};
};

export const getStoredCoins = (): number => {
  const storedCoins = localStorage.getItem('totalCoins');
  return storedCoins ? parseInt(storedCoins, 0) : 0;
};

export const saveCoins = (coins: number) => {
  localStorage.setItem('totalCoins', coins.toString());
};

export const getUnlockedCars = (): string[] => {
  const unlockedCars = localStorage.getItem('unlockedCars');
  return unlockedCars ? JSON.parse(unlockedCars) : ['car1']; // car1 is always unlocked
};

export const unlockCar = (carId: string) => {
  const unlockedCars = getUnlockedCars();
  if (!unlockedCars.includes(carId)) {
    unlockedCars.push(carId);
    localStorage.setItem('unlockedCars', JSON.stringify(unlockedCars));
  }
};

export const isCarUnlocked = (carId: string): boolean => {
  return getUnlockedCars().includes(carId);
};