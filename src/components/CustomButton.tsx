// Update CustomButton.tsx
import React from 'react';
import { audioManager } from '../utils/audio';

interface CustomButtonProps {
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean; // Add disabled prop
}

const CustomButton: React.FC<CustomButtonProps> = ({ 
  onClick, 
  children, 
  className,
  disabled = false // Default to false
}) => {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      console.log('Button clicked');
      audioManager.playButtonSound();
      onClick && onClick();
    }
  };

  return (
    <button 
      className={className} 
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default CustomButton;