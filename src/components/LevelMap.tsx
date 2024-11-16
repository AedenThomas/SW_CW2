
export function LevelMap({ onSelectLevel, onBack }: { 
    onSelectLevel: (level: number) => void,
    onBack: () => void 
  }) {
    const levels = [
      { id: 1, name: "Basics of the Road", difficulty: "Easy" },
      { id: 2, name: "Traffic Signs", difficulty: "Easy" },
      { id: 3, name: "Speed Control", difficulty: "Medium" },
      { id: 4, name: "Complex Intersections", difficulty: "Medium" },
      { id: 5, name: "Advanced Navigation", difficulty: "Hard" },
      // Add more levels as needed
    ];
  
    return (
      <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/80">
        <div className="bg-white p-8 rounded-xl shadow-2xl max-w-4xl w-full mx-4">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Select Level</h2>
            <button
              onClick={onBack}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {levels.map((level) => (
              <button
                key={level.id}
                onClick={() => onSelectLevel(level.id)}
                className="relative group p-6 bg-gray-100 rounded-lg hover:bg-blue-50 transition-all duration-200"
              >
                <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 rounded-lg transition-colors" />
                <h3 className="text-xl font-semibold mb-2 text-gray-800">{level.name}</h3>
                <div className={`text-sm px-2 py-1 rounded-full inline-block
                  ${level.difficulty === 'Easy' ? 'bg-green-100 text-green-700' :
                    level.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'}`}
                >
                  {level.difficulty}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  