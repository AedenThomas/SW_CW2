import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree, ThreeEvent } from '@react-three/fiber';
import { PerspectiveCamera, useGLTF, OrbitControls, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import { useNavigate } from 'react-router-dom';
import { CarModel, CAR_MODELS } from '../data/carModels';
import { getStoredCoins, saveCoins, getUnlockedCars, unlockCar, isCarUnlocked } from '../utils/storage';
import CustomButton from './CustomButton';
interface CarGarageProps {
  onBack?: () => void;
}

const PlayerCar = ({ position, rotation, modelId = 'car1' }: { 
  position: [number, number, number], 
  rotation: [number, number, number],
  modelId?: string 
}) => {
  const carModel = CAR_MODELS.find(car => car.id === modelId) || CAR_MODELS[0];
  const { scene } = useGLTF(`${process.env.PUBLIC_URL}/models/${carModel.model}`);
  const groupRef = useRef<THREE.Group>(null);
  
  const adjustedPosition: [number, number, number] = [
    position[0],
    position[1] - 0.2,
    position[2]
  ];
  
  // Get the model-specific rotation
  const getModelRotation = () => {
    switch (modelId) {
      case 'car2':
        return Math.PI; // 90 degrees right + default rotation
      case 'car3':
      case 'car4':
        return 0; // 90 degrees left + default rotation
      default:
        return Math.PI / 2; // Default rotation
    }
  };
  
  return (
    <group
      ref={groupRef}
      position={adjustedPosition}
      rotation={rotation}
    >
      <group 
        scale={[carModel.scale, carModel.scale, carModel.scale]}
        rotation={[0, getModelRotation(), 0]} 
        position={carModel.offset || [0, 0, 0]}
      >
        {scene ? (
          <primitive object={scene.clone()} castShadow receiveShadow />
        ) : (
          <mesh>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial color="red" wireframe />
          </mesh>
        )}
      </group>
    </group>
  );
};

const getSelectedCar = () => {
  return localStorage.getItem('selectedCar') || 'car1';
};

export const CarGarage: React.FC<CarGarageProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [selectedCar, setSelectedCar] = useState(CAR_MODELS[0].id);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [coins, setCoins] = useState(getStoredCoins());
  const [unlockedCars] = useState(getUnlockedCars());
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [selectedForPurchase, setSelectedForPurchase] = useState<CarModel | null>(null);
  const [currentlySelectedCar] = useState(getSelectedCar());
  
  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const handlePrevCar = () => {
    setCurrentIndex((prev) => {
      const newIndex = prev > 0 ? prev - 1 : CAR_MODELS.length - 1;
      setSelectedCar(CAR_MODELS[newIndex].id);
      return newIndex;
    });
  };

  const handleNextCar = () => {
    setCurrentIndex((prev) => {
      const newIndex = prev < CAR_MODELS.length - 1 ? prev + 1 : 0;
      setSelectedCar(CAR_MODELS[newIndex].id);
      return newIndex;
    });
  };

  const handleUseCar = () => {
    const car = CAR_MODELS.find(car => car.id === selectedCar);
    if (!car) return;

    if (!isCarUnlocked(car.id)) {
      setSelectedForPurchase(car);
      setShowPurchaseModal(true);
      return;
    }

    localStorage.setItem('selectedCar', selectedCar);
    handleBack();
  };

  // Preload all car models
  useEffect(() => {
    CAR_MODELS.forEach(car => {
      useGLTF.preload(`${process.env.PUBLIC_URL}/models/${car.model}`);
    });
  }, []);

  // Add this function to handle purchases
  const handlePurchase = () => {
    if (!selectedForPurchase) return;
    
    const newCoins = coins - (selectedForPurchase.price || 0);
    saveCoins(newCoins);
    setCoins(newCoins);
    unlockCar(selectedForPurchase.id);
    setShowPurchaseModal(false);
    setSelectedCar(selectedForPurchase.id);
  };

  // Add keyboard navigation handler
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          handleBack();
          break;
        case 'ArrowLeft':
          handlePrevCar();
          break;
        case 'ArrowRight':
          handleNextCar();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []); // Empty dependency array since handlers are stable

  return (
    <div className="fixed inset-0 z-50" 
         style={{
           backgroundImage: `url(${process.env.PUBLIC_URL}/images/garage_background.png)`,
           backgroundSize: 'cover',
           backgroundPosition: 'center'
         }}>
      {/* Add close button */}
      <CustomButton 
        onClick={handleBack}
        className="absolute top-4 left-4 z-30 bg-gray-800/80 hover:bg-gray-700 
                   text-white p-3 rounded-full transition-colors duration-200"
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
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </CustomButton>
     
      {/* Car Name */}
      <div className="absolute top-20 left-1/2 transform -translate-x-1/2 
                    bg-black/50 text-white px-6 py-3 rounded-lg text-xl font-bold">
        {CAR_MODELS[currentIndex].name}
      </div>

      {/* 3D Car Display */}
      <div className="absolute inset-0 z-10">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 1, 5]} />
          <OrbitControls 
            enablePan={false}
            minDistance={3}
            maxDistance={7}
            minPolarAngle={Math.PI / 4}
            maxPolarAngle={Math.PI / 2}
            rotateSpeed={0.5}
          />
          <ambientLight intensity={0.3} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
          />
          <spotLight
            position={[-5, 5, 0]}
            angle={0.15}
            penumbra={1}
            intensity={0.5}
            castShadow
          />
          <ContactShadows
            position={[0, -0.0001, 0]}
            opacity={0.4}
            scale={10}
            blur={2}
            far={4}
          />
          <PlayerCar 
            position={[0, 0, 0]} 
            rotation={[0, -Math.PI / 4, 0]}
            modelId={selectedCar}
          />
        </Canvas>
      </div>

      {/* Navigation Arrows */}
      <div className="absolute bottom-1/2 left-4 transform translate-y-1/2 z-20">
        <CustomButton 
          onClick={handlePrevCar}
          className="bg-gray-800/80 hover:bg-gray-700 text-white p-4 rounded-full"
        >
          ←
        </CustomButton>
      </div>
      <div className="absolute bottom-1/2 right-4 transform translate-y-1/2 z-20">
        <CustomButton 
          onClick={handleNextCar}
          className="bg-gray-800/80 hover:bg-gray-700 text-white p-4 rounded-full"
        >
          →
        </CustomButton>
      </div>

      {/* Coins Display */}
      <div className="absolute top-4 right-4 bg-black/50 text-white px-4 py-2 rounded-lg flex items-center gap-2">
        <img src={`${process.env.PUBLIC_URL}/images/coin.svg`} alt="Coin" className="w-6 h-6" />
        <span className="text-xl font-bold">{coins}</span>
      </div>

     

      {/* Purchase Modal */}
      {showPurchaseModal && selectedForPurchase && (
        <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-30">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Purchase {selectedForPurchase.name}?</h2>
            <p className="mb-6">
              This will cost {selectedForPurchase.price} coins.
              {coins < (selectedForPurchase.price || 0) && (
                <span className="text-red-500 block mt-2">
                  You don't have enough coins!
                </span>
              )}
            </p>
            <div className="flex gap-4">
              <CustomButton
                onClick={handlePurchase}
                disabled={coins < (selectedForPurchase.price || 0)}
                className={`flex-1 py-2 rounded-lg ${
                  coins >= (selectedForPurchase.price || 0)
                    ? 'bg-green-500 hover:bg-green-600 text-white'
                    : 'bg-gray-300 cursor-not-allowed text-gray-500'
                }`}
              >
                Purchase
              </CustomButton>
              <CustomButton
                onClick={() => setShowPurchaseModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-300 hover:bg-gray-100"
              >
                Cancel
              </CustomButton>
            </div>
          </div>
        </div>
      )}

     

      {/* Use Button */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <CustomButton 
          onClick={handleUseCar}
          className={`px-8 py-3 rounded-lg font-bold text-xl transition-all duration-300 shadow-lg
            ${selectedCar === currentlySelectedCar 
              ? 'bg-blue-500 hover:bg-blue-500 cursor-default text-white' 
              : isCarUnlocked(selectedCar) || !CAR_MODELS.find(car => car.id === selectedCar)?.price 
                ? 'bg-green-500 hover:bg-green-600 text-white'
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
          disabled={selectedCar === currentlySelectedCar}
        >
          {selectedCar === currentlySelectedCar 
            ? 'Selected' 
            : isCarUnlocked(selectedCar) || !CAR_MODELS.find(car => car.id === selectedCar)?.price 
              ? 'Use' 
              : `Buy (${CAR_MODELS.find(car => car.id === selectedCar)?.price} Coins)`}
        </CustomButton>
      </div>
    </div>
  );
};

export default CarGarage;