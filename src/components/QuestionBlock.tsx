import { useRef } from 'react';
import { Text } from '@react-three/drei';
import { Question } from '../types/game';
import * as THREE from 'three';
interface QuestionBlockProps {
  question: Question;
  position: [number, number, number];
}

const QuestionBlock = ({ question, position }: QuestionBlockProps) => {
  const blockRef = useRef<THREE.Group>(null);

  // Add at the start of the component

  const handleAnswerSubmit = (selectedAnswer: string) => {
    
    if (selectedAnswer === question.correctAnswer.toString()) {
      // Handle answer selection
    }
  };

  return (
    <group ref={blockRef} position={position}>
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
