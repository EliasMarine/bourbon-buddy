import React from 'react';

interface BottlePlaceholderProps {
  color?: string;
  width?: number;
  height?: number;
  className?: string;
}

export default function BottlePlaceholder({
  color = '#d97706', // Amber default
  width = 120,
  height = 300,
  className = '',
}: BottlePlaceholderProps) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 120 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Bottle Neck */}
      <rect x="45" y="10" width="30" height="60" rx="5" fill={color} opacity="0.9" />
      
      {/* Bottle Cap */}
      <rect x="40" y="0" width="40" height="15" rx="3" fill="#444444" />
      
      {/* Bottle Shoulder */}
      <path 
        d="M45 70 L30 90 L30 250 L90 250 L90 90 L75 70 Z" 
        fill={color} 
        opacity="0.8"
      />
      
      {/* Bottle Base */}
      <rect x="30" y="250" width="60" height="20" rx="3" fill={color} opacity="0.9" />
      
      {/* Label */}
      <rect x="35" y="130" width="50" height="80" rx="2" fill="#F8F8F8" />
      
      {/* Label details */}
      <rect x="40" y="140" width="40" height="8" rx="1" fill="#CCCCCC" />
      <rect x="40" y="155" width="40" height="6" rx="1" fill="#CCCCCC" />
      <rect x="40" y="165" width="40" height="6" rx="1" fill="#CCCCCC" />
      <rect x="40" y="175" width="40" height="6" rx="1" fill="#CCCCCC" />
      <rect x="45" y="190" width="30" height="10" rx="5" fill="#CCCCCC" />
    </svg>
  );
} 