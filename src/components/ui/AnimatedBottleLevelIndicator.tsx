'use client';

import React, { useState, useEffect } from 'react';
import { Wine, Droplets } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AnimatedBottleLevelIndicatorProps {
  level: number; // 0-100 (empty to full)
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  onLevelChange?: (level: number) => void;
  className?: string;
  interactive?: boolean;
}

type SizeType = 'sm' | 'md' | 'lg';

const quickLevels = [
  { value: 100, label: 'Full' },
  { value: 75, label: '¾' },
  { value: 50, label: '½' },
  { value: 25, label: '¼' },
  { value: 0, label: 'Empty' },
];

export default function AnimatedBottleLevelIndicator({
  level,
  size = 'md',
  showPercentage = true,
  onLevelChange,
  className = '',
  interactive = false,
}: AnimatedBottleLevelIndicatorProps) {
  const [currentLevel, setCurrentLevel] = useState(level);

  // Update internal state when the prop changes
  useEffect(() => {
    setCurrentLevel(level);
  }, [level]);

  // Size mappings
  const sizeClasses: Record<SizeType, { container: string; iconSize: number; bubbleSize: string }> = {
    sm: {
      container: 'w-6 h-16',
      iconSize: 14,
      bubbleSize: 'w-1 h-1',
    },
    md: {
      container: 'w-10 h-28',
      iconSize: 18,
      bubbleSize: 'w-1.5 h-1.5',
    },
    lg: {
      container: 'w-14 h-36',
      iconSize: 22,
      bubbleSize: 'w-2 h-2',
    },
  };

  // Determine color based on level
  const getLiquidColor = () => {
    if (currentLevel <= 25) return 'bg-amber-800'; // Near empty
    if (currentLevel <= 50) return 'bg-amber-700'; // Quarter to half
    if (currentLevel <= 75) return 'bg-amber-600'; // Half to three-quarters
    return 'bg-amber-500'; // Full to near full
  };

  // Handle quick level selection
  const handleQuickLevelSelect = (value: number) => {
    setCurrentLevel(value);
    if (onLevelChange) {
      onLevelChange(value);
    }
  };

  // Bubble animation for the liquid
  const Bubble = ({ delay, size, speed, position }: { delay: number; size: SizeType; speed: number; position: string }) => (
    <motion.div
      className={`${sizeClasses[size].bubbleSize} rounded-full bg-white/20 absolute`}
      initial={{ y: 0, x: position, opacity: 0 }}
      animate={{
        y: -40, 
        opacity: [0, 0.8, 0],
        transition: { 
          duration: speed,
          repeat: Infinity,
          delay, 
          ease: "easeInOut"
        }
      }}
    />
  );

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="relative">
        {/* Bottle container */}
        <div className={`${sizeClasses[size].container} border-2 border-gray-600 rounded-lg overflow-hidden bg-gray-900/50 relative`}>
          {/* Neck of the bottle */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-1/2 h-1/6 border-b-2 border-gray-600"></div>
          
          {/* Liquid animation */}
          <AnimatePresence>
            <motion.div
              className={`absolute bottom-0 left-0 right-0 ${getLiquidColor()}`}
              initial={{ height: `${Math.max(0, Math.min(currentLevel, 100))}%` }}
              animate={{ height: `${Math.max(0, Math.min(currentLevel, 100))}%` }}
              transition={{ 
                type: "spring", 
                stiffness: 50, 
                damping: 15,
                mass: 1
              }}
            >
              {/* Bubbles - only show if level is over 20% */}
              {currentLevel > 20 && (
                <>
                  <Bubble delay={0.5} size={size} speed={2} position="20%" />
                  <Bubble delay={1.2} size={size} speed={2.5} position="60%" />
                  <Bubble delay={2.3} size={size} speed={1.8} position="40%" />
                  <Bubble delay={3.1} size={size} speed={2.2} position="75%" />
                </>
              )}
              
              {/* Liquid surface wave effect */}
              <motion.div 
                className="absolute top-0 left-0 right-0 h-1 bg-white/30"
                animate={{ 
                  opacity: [0.2, 0.4, 0.2],
                  y: [-1, 1, -1] 
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity, 
                  ease: "easeInOut" 
                }}
              />
            </motion.div>
          </AnimatePresence>
          
          {/* Bottle icon overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <Wine size={sizeClasses[size].iconSize} className="text-white" />
          </div>
        </div>
        
        {/* Percentage label */}
        {showPercentage && (
          <div className="text-center mt-2 text-sm font-medium text-amber-500">
            {currentLevel}%
          </div>
        )}
      </div>
      
      {/* Only show quick selection buttons when in interactive mode */}
      {interactive === true && (
        <div className="flex gap-2 mt-3">
          {quickLevels.map((quickLevel) => (
            <button
              key={quickLevel.value}
              onClick={() => handleQuickLevelSelect(quickLevel.value)}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                Math.abs(currentLevel - quickLevel.value) < 5
                  ? 'bg-amber-600 text-white'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              {quickLevel.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
} 