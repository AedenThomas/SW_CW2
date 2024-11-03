# Road Safety Educational Game 🚗

An interactive 3D educational game built with React, Three.js, and React Three Fiber to teach road safety and traffic signs.

## 🎮 Features

- 3D driving environment with dynamic obstacles
- Interactive traffic sign recognition challenges
- Oracle Mode with educational feedback
- Real-time scoring system
- Touch and keyboard controls
- Responsive design
- Progressive difficulty

## 🛠 Technology Stack

- React 18
- TypeScript
- Three.js
- React Three Fiber
- Rapier Physics Engine
- Framer Motion
- TailwindCSS

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Modern web browser with WebGL support

## ⚙️ Installation

1. Clone the repository:
```bash
git clone https://github.com/AedenThomas/SW_CW2.git
cd road-safety-game
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🗂 Project Structure

### 🎯 Key Components

#### Game.tsx
- Main game logic and state management
- Player controls and collision detection
- Score tracking and game flow
- Oracle mode implementation

#### Road.tsx
- Road rendering with textures
- Lane management
- Surface properties

#### QuestionBlock.tsx
- Question display and interaction
- Answer validation
- Visual feedback

#### Environment.tsx
- Scenery generation
- Dynamic object placement
- Visual enhancement

### Core Components

1. **Game Component** (`src/components/Game.tsx`):
   - Main game logic and state management
   - Handles player movement, collisions, and scoring

2. **Environment** (`src/components/Environment.tsx`):
   - Manages decorative elements like trees and rocks
   - Handles environment scrolling and positioning

3. **Question System** (`src/data/questions.ts`):
   - Defines traffic sign questions and answers
   - Manages Oracle Mode feedback

### Key Features Implementation

1. **Player Movement**:
   - Located in Game.tsx
   - Uses Rapier physics for collision detection
   - Smooth lane transitions with lerp

2. **Oracle System**:
   - Educational feedback system
   - Provides hints and explanations

## 🎮 Controls

### Desktop
- Left Arrow: Move left
- Right Arrow: Move right

### Mobile
- Swipe left: Move left
- Swipe right: Move right
- Minimum swipe distance: 50px
- Maximum swipe time: 300ms

## 🔧 Configuration

### Game Constants
Located in `src/constants/game.ts`:
- GAME_SPEED: Base movement speed
- LANE_WIDTH: Distance between lanes
- LANE_SWITCH_COOLDOWN: Delay between lane changes

### Types and Interfaces
Located in `src/types/`:
- game.ts: Game state and question types
- userData.ts: User data interfaces

## 🏗 Development

### Adding New Questions
1. Navigate to `src/data/questions.ts`
2. Add new question objects following the existing format

### Modifying Game Behavior
- Game speed and difficulty: `src/constants/game.ts`
- Collision detection: `Game.tsx -> handleCollision()`
- Visual feedback: `QuestionBlock.tsx -> OraclePresence`

### Adding New Features
1. Create new component in `src/components/`
2. Add necessary types in `src/types/`
3. Import and integrate in `Game.tsx`
4. Update game state management as needed

## 🎨 Styling
- Three.js for 3D rendering
- Tailwind CSS for UI elements
- Framer Motion for animations

## 📱 Responsive Design
The game automatically adapts to different screen sizes and supports both touch and keyboard inputs.

## 🐛 Debugging
Enable debug mode in components for detailed console logs about:
- Collisions
- Position updates
- Asset loading
- Game state changes

## 🚀 Deployment

1. Build the production version:
```bash
npm run build
```

2. Deploy to GitHub Pages:
```bash
npm run deploy
```

The game is configured for GitHub Pages deployment (see package.json homepage field).

## 🧪 Testing

Run the test suite:
```bash
npm test
```

## 📚 Dependencies
- React Three Fiber
- Three.js
- Rapier Physics
- Framer Motion
- Tailwind CSS

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request


## 🙏 Acknowledgments
- Three.js community
- React Three Fiber team
- Contributors and testers

## 🐛 Known Issues
- Performance optimization needed
- Some texture loading delays on slow connections
- Touch controls sensitivity on certain devices

## 📞 Support
For support, please open an issue in the GitHub repository or contact the maintainers.
