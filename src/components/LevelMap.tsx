import React, { useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { useViewport } from "../hooks/useViewport";
import { questions } from "../data/questions";
import { useState } from "react";
import { getAllLevelProgress } from "../utils/storage";
import { LevelProgressMap } from "../types/game";
import CustomButton from "./CustomButton";

interface LevelMapProps {
  onSelectLevel: (level: number) => void;
  onBack: () => void;
  onGameStateChange: (isGame: boolean) => void;
}

// Add these utility functions at the top of the component
function getBezierPoint(t: number, p0: Point, p1: Point, p2: Point, p3: Point) {
  const cX = 3 * (p1.x - p0.x);
  const bX = 3 * (p2.x - p1.x) - cX;
  const aX = p3.x - p0.x - cX - bX;

  const cY = 3 * (p1.y - p0.y);
  const bY = 3 * (p2.y - p1.y) - cY;
  const aY = p3.y - p0.y - cY - bY;

  const x = aX * Math.pow(t, 3) + bX * Math.pow(t, 2) + cX * t + p0.x;
  const y = aY * Math.pow(t, 3) + bY * Math.pow(t, 2) + cY * t + p0.y;

  return { x, y };
}

function getSegmentLength(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getCurveLength(points: Point[]): number {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += getSegmentLength(points[i - 1], points[i]);
  }
  return length;
}

function getPointAtDistance(points: Point[], targetDistance: number): Point {
  let currentDistance = 0;

  for (let i = 1; i < points.length; i++) {
    const segmentLength = getSegmentLength(points[i - 1], points[i]);
    if (currentDistance + segmentLength >= targetDistance) {
      const remainingDistance = targetDistance - currentDistance;
      const ratio = remainingDistance / segmentLength;
      return {
        x: points[i - 1].x + (points[i].x - points[i - 1].x) * ratio,
        y: points[i - 1].y + (points[i].y - points[i - 1].y) * ratio,
      };
    }
    currentDistance += segmentLength;
  }
  return points[points.length - 1];
}

function calculateCurvePoints(
  width: number,
  height: number,
  isMobile: boolean
) {
  const scaleFactor = 1.45;
  const padding = isMobile ? 60 : 100 * scaleFactor;
  const numPoints = 200;

  const scaledWidth = width * scaleFactor;
  const scaledHeight = height * scaleFactor;
  const offsetX = (scaledWidth - width) / 2;
  const offsetY = (scaledHeight - height) / 2;

  const roadPoints = isMobile
    ? {
        // Compress the vertical spacing for mobile
        start: { x: width / 2, y: padding },
        control1: { x: padding - 80, y: height * 0.25 }, // Reduced from 0.35
        control2: { x: width - padding + 80, y: height * 0.75 }, // Reduced from 0.65
        end: { x: width / 2, y: height - padding },
      }
    : {
        // Desktop remains unchanged
        start: { x: padding - offsetX, y: height / 2 },
        control1: { x: scaledWidth * 0.25 - offsetX, y: -(height * 0.2) },
        control2: { x: scaledWidth * 0.75 - offsetX, y: height * 1.2 },
        end: { x: scaledWidth - padding - offsetX, y: height / 2 },
      };

  // Pre-calculate points along the curve
  const points: Point[] = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const point = getBezierPoint(
      t,
      roadPoints.start,
      roadPoints.control1,
      roadPoints.control2,
      roadPoints.end
    );
    points.push(point);
  }

  return { roadPoints, curvePoints: points };
}

interface Point {
  x: number;
  y: number;
}

// Add this function near the top with other utility functions
function isLevelUnlocked(
  levelId: number,
  levelProgress: LevelProgressMap
): boolean {
  if (levelId === 1) return true; // First level is always unlocked
  return levelProgress[levelId - 1]?.completed === true;
}

export function LevelMap({
  onSelectLevel,
  onBack,
  onGameStateChange,
}: LevelMapProps) {
  const { width, height, isMobile } = useViewport();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [currentSignIndex, setCurrentSignIndex] = useState(0);
  const [levelProgress, setLevelProgress] = useState<LevelProgressMap>({});
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);

  const levels = [
    {
      id: 1,
      name: "First Steps",
      difficulty: "Easy",
      description: "Learn basic road safety",
    },
    {
      id: 2,
      name: "Sign Language",
      difficulty: "Easy",
      description: "Master common traffic signs",
    },
    {
      id: 3,
      name: "Crossing Guard",
      difficulty: "Easy",
      description: "Safe pedestrian crossings",
    },
    {
      id: 4,
      name: "Speed Demon",
      difficulty: "Medium",
      description: "Speed limits and control",
    },
    {
      id: 5,
      name: "Junction Junction",
      difficulty: "Medium",
      description: "Navigate intersections",
    },
    {
      id: 6,
      name: "Signal Master",
      difficulty: "Medium",
      description: "Traffic light mastery",
    },
    {
      id: 7,
      name: "Rush Hour",
      difficulty: "Hard",
      description: "Heavy traffic navigation",
    },
    {
      id: 8,
      name: "Night Rider",
      difficulty: "Hard",
      description: "Night driving challenges",
    },
    {
      id: 9,
      name: "Weather Warden",
      difficulty: "Hard",
      description: "Weather condition safety",
    },
    {
      id: 10,
      name: "Ultimate Driver",
      difficulty: "Expert",
      description: "Final challenge",
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "#10B981"; // green-500
      case "Medium":
        return "#F59E0B"; // yellow-500
      case "Hard":
        return "#EF4444"; // red-500
      case "Expert":
        return "#8B5CF6"; // purple-500
      default:
        return "#6B7280"; // gray-500
    }
  };

  const handleLevelClick = (levelId: number) => {
    setSelectedLevel(levelId);
  };

  const levelQuestions = selectedLevel
    ? questions.filter((q) => q.levelId === selectedLevel)
    : [];

  // Add these new functions
  const handleNextSign = () => {
    if (selectedLevel && currentSignIndex < levelQuestions.length - 1) {
      setCurrentSignIndex((prev) => prev + 1);
    }
  };

  const handlePrevSign = () => {
    if (currentSignIndex > 0) {
      setCurrentSignIndex((prev) => prev - 1);
    }
  };

  useEffect(() => {
    // Reset current sign index when modal is closed
    if (!selectedLevel) {
      setCurrentSignIndex(0);
    }
  }, [selectedLevel]);

  useEffect(() => {
    setLevelProgress(getAllLevelProgress());
  }, []);

  // Calculate curve points using useMemo to prevent recalculation
  const { roadPoints, curvePoints } = useMemo(() => {
    const viewWidth = isMobile ? 400 : 1000;
    const viewHeight = isMobile ? 1000 : 600; // Reduced from 1200
    return calculateCurvePoints(viewWidth, viewHeight, isMobile);
  }, [isMobile]);

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      if (selectedLevel) {
        if (e.key === "Escape") {
          setSelectedLevel(null);
        } else if (e.key === "ArrowRight") {
          handleNextSign();
        } else if (e.key === "ArrowLeft") {
          handlePrevSign();
        }
      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [selectedLevel, levelQuestions]); // Add levelQuestions to dependencies

  return (
    <div className="absolute inset-0 z-50 bg-gradient-to-b from-blue-100 to-green-100 overflow-auto">
      {/* Top Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Road to Mastery</h1>
          <CustomButton
            onClick={onBack}
            className="rounded-full p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </CustomButton>
        </div>
      </div>

      {/* Adjust the container for better mobile visibility */}
      <div
        className={`
                ${
                  isMobile
                    ? "pt-[80px] pb-8 min-h-screen"
                    : "h-[calc(100vh-80px)]"
                }
                max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative overflow-visible
            `}
      >
        {/* Reduce the container height */}
        <div className={`${isMobile ? "h-[1000px]" : "h-full"} relative`}>
          <svg
            className={`w-full h-full ${isMobile ? "absolute inset-0" : ""}`}
            viewBox={
              isMobile
                ? "-100 -100 600 1200" // Added padding on all sides
                : `-${Math.floor((1000 * 0.25) / 2)} -${Math.floor(
                    (600 * 0.25) / 2
                  )} ${1000 * 1.25} ${600 * 1.25}`
            }
            preserveAspectRatio={isMobile ? "xMidYMid" : "xMidYMid meet"}
          >
            <defs>
              <linearGradient
                id="roadGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#4B5563" />
                <stop offset="100%" stopColor="#1F2937" />
              </linearGradient>
            </defs>
            {/* Main Road */}
            <path
              d={`M${roadPoints.start.x},${roadPoints.start.y} 
                               C${roadPoints.control1.x},${roadPoints.control1.y} 
                                ${roadPoints.control2.x},${roadPoints.control2.y} 
                                ${roadPoints.end.x},${roadPoints.end.y}`}
              stroke="url(#roadGradient)"
              strokeWidth={isMobile ? "72" : "120"} // 72 * 1.15 ≈ 83
              fill="none"
              strokeLinecap="round"
            />
            {/* Road Markings */}
            <path
              d={`M${roadPoints.start.x},${roadPoints.start.y} 
                               C${roadPoints.control1.x},${roadPoints.control1.y} 
                                ${roadPoints.control2.x},${roadPoints.control2.y} 
                                ${roadPoints.end.x},${roadPoints.end.y}`}
              stroke="white"
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="20 20"
            />

            {/* Level Markers Base Layer */}
            {levels.map((level, index) => {
              const progress = levelProgress[level.id];
              const isUnlocked = isLevelUnlocked(level.id, levelProgress);
              const curveLength = getCurveLength(curvePoints);
              const spacing = curveLength / (levels.length - 1);
              const distance = index * spacing;
              const point = getPointAtDistance(curvePoints, distance);

              return (
                <g key={`base-${level.id}`}>
                  <g transform={`translate(${point.x}, ${point.y})`}>
                    <motion.g
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <circle
                        r={isMobile ? "32" : "45"}
                        fill={
                          isUnlocked
                            ? getDifficultyColor(level.difficulty)
                            : "#9CA3AF"
                        }
                        className={`transition-transform duration-200
                                                    ${
                                                      isUnlocked
                                                        ? "hover:scale-110 cursor-pointer"
                                                        : "cursor-not-allowed opacity-60"
                                                    }
                                                    ${
                                                      progress?.completed
                                                        ? "stroke-2 stroke-yellow-400"
                                                        : ""
                                                    }`}
                        onClick={() => isUnlocked && handleLevelClick(level.id)}
                        onMouseEnter={() => setHoveredLevel(level.id)}
                        onMouseLeave={() => setHoveredLevel(null)}
                      />
                      <text
                        x="0"
                        y="0"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className={`text-xl font-bold fill-current pointer-events-none
                                                    ${
                                                      isUnlocked
                                                        ? "text-white"
                                                        : "text-gray-400"
                                                    }`}
                      >
                        {level.id}
                      </text>
                    </motion.g>
                  </g>
                </g>
              );
            })}

            {/* Hover Cards Overlay Layer */}
            {levels.map((level, index) => {
              const progress = levelProgress[level.id];
              const isUnlocked = isLevelUnlocked(level.id, levelProgress);
              const curveLength = getCurveLength(curvePoints);
              const spacing = curveLength / (levels.length - 1);
              const distance = index * spacing;
              const point = getPointAtDistance(curvePoints, distance);

              // Only show hover cards if not mobile and level is being hovered
              return !isMobile && hoveredLevel === level.id ? (
                <g key={`overlay-${level.id}`}>
                  <g transform={`translate(${point.x}, ${point.y})`}>
                    <foreignObject
                      x={(() => {
                        if (isMobile) {
                          return index === 0
                            ? -75
                            : index === levels.length - 1
                            ? -225
                            : -150;
                        } else {
                          if (index === 0) return 50;
                          if (index === levels.length - 1) return -350;
                          return -150;
                        }
                      })()}
                      y={(() => {
                        if (isMobile) {
                          if (index === 0) return 50;
                          if (index === levels.length - 1) return -250;
                          return 50;
                        } else {
                          return -110;
                        }
                      })()}
                      width="300"
                      height="220"
                      style={{
                        pointerEvents: "none",
                        zIndex: 1000,
                        overflow: "visible",
                      }}
                    >
                      <div
                        className="relative"
                        style={{ pointerEvents: "none" }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute bg-white/95 backdrop-blur-sm p-5 rounded-xl shadow-xl border border-gray-100"
                          style={{
                            pointerEvents: "none",
                            zIndex: 1000,
                            width: "300px",
                          }}
                        >
                          <div
                            className="flex items-start justify-between mb-3"
                            style={{ pointerEvents: "none" }}
                          >
                            <div>
                              <h3 className="font-bold text-lg text-gray-900">
                                {level.name}
                              </h3>
                              <span
                                className="inline-block px-2 py-1 mt-1 text-xs rounded-full"
                                style={{
                                  backgroundColor: isUnlocked
                                    ? `${getDifficultyColor(
                                        level.difficulty
                                      )}20`
                                    : "#F3F4F6",
                                  color: isUnlocked
                                    ? getDifficultyColor(level.difficulty)
                                    : "#6B7280",
                                }}
                              >
                                {level.difficulty}
                              </span>
                            </div>
                            {!isUnlocked && (
                              <div className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                                <svg
                                  className="w-4 h-4 text-gray-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                                  />
                                </svg>
                                <span className="text-xs font-medium text-gray-600">
                                  Locked
                                </span>
                              </div>
                            )}
                            {progress?.completed && (
                              <div className="flex items-center gap-1 bg-green-100 px-2 py-1 rounded-full">
                                <svg
                                  className="w-4 h-4 text-green-600"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                <span className="text-xs font-medium text-green-600">
                                  Complete
                                </span>
                              </div>
                            )}
                          </div>

                          <p className="text-sm text-gray-600 mb-3">
                            {isUnlocked
                              ? level.description
                              : "Complete the previous level to unlock"}
                          </p>

                          {progress && isUnlocked && (
                            <div className="space-y-3">
                              <div className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-lg">
                                <span className="text-sm text-gray-600">
                                  High Score
                                </span>
                                <span className="font-semibold text-sm">
                                  {progress.highScore}
                                  <span className="text-yellow-500 ml-1">
                                    ★
                                  </span>
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">
                                  Fuel Remaining
                                </span>
                                <div className="flex gap-1.5">
                                  {Array.from({ length: 3 }).map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-5 h-2 rounded-full transition-colors ${
                                        i < progress.remainingLives
                                          ? "bg-blue-500"
                                          : "bg-gray-200"
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      </div>
                    </foreignObject>
                  </g>
                </g>
              ) : null;
            })}
          </svg>
        </div>
      </div>

      {/* Level Modal */}
      {selectedLevel && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedLevel(null);
            }
          }}
        >
          <div className="bg-white rounded-lg max-w-2xl w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Level {selectedLevel}</h2>
                <CustomButton
                  onClick={() => setSelectedLevel(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </CustomButton>
              </div>
              <div className="relative">
                {levelQuestions.length > 0 && (
                  <motion.div
                    key={currentSignIndex}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    className="flex flex-col items-center"
                  >
                    <img
                      src={levelQuestions[currentSignIndex].signPath}
                      alt="Road Sign"
                      className="w-48 h-48 mx-auto mb-4 object-contain cursor-pointer hover:scale-105 transition-transform"
                    />
                    <p className="text-gray-700 text-center text-lg">
                      {
                        levelQuestions[currentSignIndex].oracleHelp
                          .correctAnswerInsight
                      }
                    </p>
                  </motion.div>
                )}

                {/* Navigation Buttons */}
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between">
                  <CustomButton
                    onClick={handlePrevSign}
                    className={`p-2 rounded-full bg-gray-100 hover:bg-gray-200 transform -translate-x-4
                                            ${
                                              currentSignIndex === 0
                                                ? "invisible"
                                                : ""
                                            }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 19l-7-7 7-7"
                      />
                    </svg>
                  </CustomButton>
                  <CustomButton
                    onClick={handleNextSign}
                    className={`p-2 rounded-full bg-gray-100 hover:bg-gray-200 transform translate-x-4
                                            ${
                                              currentSignIndex ===
                                              levelQuestions.length - 1
                                                ? "invisible"
                                                : ""
                                            }`}
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </CustomButton>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Sign {currentSignIndex + 1} of {levelQuestions.length}
                </div>
                {currentSignIndex === levelQuestions.length - 1 && (
                  <CustomButton
                    onClick={() => {
                      setSelectedLevel(null);
                      onSelectLevel(selectedLevel);
                      onGameStateChange(true); // Now this will work
                    }}
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                  >
                    {levelProgress[selectedLevel]?.completed
                      ? "Play Again"
                      : "Start Level"}
                  </CustomButton>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
