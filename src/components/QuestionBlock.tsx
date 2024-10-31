import { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { Question } from '../types/game';
import * as THREE from 'three';
import { useLoader } from '@react-three/fiber';

interface QuestionBlockProps {
  question: Question;
  position: [number, number, number];
}

const QuestionBlock = ({ question, position }: QuestionBlockProps) => {
  const blockRef = useRef<THREE.Group>(null);
  
  // Debug log for question props
  useEffect(() => {
    console.log('Question props:', {
      text: question.text,
      signPath: question.signPath,
      options: question.options
    });
  }, [question]);

  // Load and debug sign texture
  let signTexture: THREE.Texture | null = null;
  try {
    signTexture = useLoader(THREE.TextureLoader, question.signPath);
    console.log('Sign texture loaded successfully:', question.signPath);
  } catch (error) {
    console.error('Error loading sign texture:', {
      path: question.signPath,
      error: error
    });
  }

  // Debug log for texture loading
  useEffect(() => {
    if (signTexture) {
      console.log('Texture details:', {
        isLoaded: signTexture instanceof THREE.Texture,
        image: signTexture.image,
        size: {
          width: signTexture.image?.width,
          height: signTexture.image?.height
        }
      });
    }
  }, [signTexture]);

  const handleAnswerSubmit = (selectedAnswer: string) => {
    
    if (selectedAnswer === question.correctAnswer.toString()) {
      // Handle answer selection
    }
  };

  return (
    <group ref={blockRef} position={position}>
      {/* Sign display with debug information */}
      {signTexture ? (
        <mesh position={[0, 3, 0]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial 
            map={signTexture} 
            transparent
            onBeforeCompile={() => {
              console.log('Material compiled with texture');
            }}
          />
        </mesh>
      ) : (
        <mesh position={[0, 3, 0]}>
          <planeGeometry args={[2, 2]} />
          <meshBasicMaterial color="red" />
          <Text
            position={[0, 0, 0.1]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            Loading Sign...
          </Text>
        </mesh>
      )}
      
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {question.text}
      </Text>
      {question.options.map((option, index) => (
        <mesh
          key={index}
          position={[(index - 1) * 2, 0, 0]}
          onClick={() => {
            handleAnswerSubmit(option);
          }}
        >
          <boxGeometry args={[1.5, 1.5, 1.5]} />
          <meshStandardMaterial color="#4a90e2" />
          <Text
            position={[0, 0, 0.8]}
            fontSize={0.2}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {option}
          </Text>
        </mesh>
      ))}
    </group>
  );
};

export default QuestionBlock;
