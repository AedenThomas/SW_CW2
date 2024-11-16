
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