// Game constants
const LANE_WIDTH = 5; // Adjusted to 5 to align with Coins.tsx
const LANE_POSITIONS = [-LANE_WIDTH, 0, LANE_WIDTH]; // Left, Middle, Right

// Movement and speed constants
const GAME_SPEED = 0.4; // Adjust as necessary
const LANE_SWITCH_SPEED = 0.2; // Speed at which lanes switch
const LANE_SWITCH_COOLDOWN = 300; // 300ms cooldown between lane switches

// Add safe zone constants
export const SAFE_ZONE_BEFORE = 40; // Distance before the options where obstacles won't spawn
export const SAFE_ZONE_AFTER = 40;  // Distance after the options where obstacles won't spawn

const initialZ = -100; // Define initialZ

// Single export statement for all constants
export {
  GAME_SPEED,
  LANE_WIDTH,
  LANE_POSITIONS,
  LANE_SWITCH_SPEED,
  LANE_SWITCH_COOLDOWN,
  initialZ
};






