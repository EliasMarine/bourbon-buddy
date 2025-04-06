'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Droplets } from 'lucide-react';
import GlencairnGlass from './icons/GlencairnGlass';

interface ModernBottleLevelIndicatorProps {
  level: number;
  onChange?: (level: number) => void;
  interactive?: boolean;
  className?: string;
}

interface BubbleProps {
  delay: number;
  size: number;
  position: number;
  speed: number;
}

const preset = {
  empty: 0,
  low: 25,
  half: 50,
  high: 75,
  full: 100
};

export default function ModernBottleLevelIndicator({
  level,
  onChange,
  interactive = false,
  className = ''
}: ModernBottleLevelIndicatorProps) {
  const [currentLevel, setCurrentLevel] = useState(level);
  const [isDragging, setIsDragging] = useState(false);
  
  // Update when props change
  useEffect(() => {
    if (!isDragging) {
      setCurrentLevel(level);
    }
  }, [level, isDragging]);
  
  // Handle changes and notify parent
  const handleChange = (newValue: number) => {
    setCurrentLevel(newValue);
    onChange?.(newValue);
  };
  
  // Calculate the current bottle fill color
  const getBottleColor = () => {
    if (currentLevel <= 25) return 'from-amber-700 to-amber-800';
    if (currentLevel <= 50) return 'from-amber-600 to-amber-700';
    if (currentLevel <= 75) return 'from-amber-500 to-amber-600';
    return 'from-amber-400 to-amber-500';
  };
  
  // Get label for current level
  const getLevelLabel = () => {
    if (currentLevel <= 10) return 'Empty';
    if (currentLevel <= 30) return 'Low';
    if (currentLevel <= 60) return 'Half';
    if (currentLevel <= 85) return 'High';
    return 'Full';
  };
  
  // Bubble component for liquid animation
  const Bubble = ({ delay, size, position, speed }: BubbleProps) => (
    <motion.div
      className="absolute rounded-full bg-white/20"
      style={{ 
        width: `${size}rem`,
        height: `${size}rem`,
        left: `${position}%`,
        bottom: '5%'
      }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ 
        y: [-0, -60, -120],
        opacity: [0, 0.7, 0]
      }}
      transition={{
        duration: speed,
        delay: delay,
        repeat: Infinity,
        ease: "easeOut"
      }}
    />
  );
  
  return (
    <div className={`${className} w-full`}>
      {/* Header with level indicator */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GlencairnGlass className="w-4 h-4 text-amber-500" fillLevel={70} fillColor="#d97706" />
          <span className="text-sm font-medium text-gray-300">Bottle Level</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-400">{getLevelLabel()}</span>
          <div className="text-sm font-semibold text-amber-500 min-w-[38px] text-right">
            {currentLevel}%
          </div>
        </div>
      </div>
      
      {/* Bottle visualization */}
      <div className="relative h-44 mb-4">
        {/* Background bottle outline */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-full w-20 relative">
            {/* Bottle neck */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-10 border-2 border-gray-600 rounded-t-sm bg-gray-900/50"></div>
            
            {/* Bottle body */}
            <div className="absolute top-10 left-0 w-full h-[calc(100%-40px)] border-2 border-gray-600 rounded-lg overflow-hidden bg-gray-900/50">
              {/* Liquid */}
              <motion.div
                className={`absolute bottom-0 w-full bg-gradient-to-b ${getBottleColor()} backdrop-blur-sm`}
                initial={{ height: `${Math.max(0, Math.min(100, currentLevel))}%` }}
                animate={{ height: `${Math.max(0, Math.min(100, currentLevel))}%` }}
                transition={{ type: "spring", stiffness: 60, damping: 15 }}
              >
                {/* Bubbles */}
                {currentLevel > 20 && (
                  <>
                    <Bubble delay={0.7} size={1.2} position={15} speed={3} />
                    <Bubble delay={1.5} size={0.8} position={30} speed={2.5} />
                    <Bubble delay={0.3} size={1} position={60} speed={2} />
                    <Bubble delay={1.1} size={1.5} position={75} speed={3.5} />
                  </>
                )}
                
                {/* Surface shine */}
                <motion.div 
                  className="absolute top-0 left-0 w-full h-1 bg-white/20"
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
            </div>
            
            {/* Cork/cap */}
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-3 bg-amber-800 border border-amber-900 rounded-t-sm"></div>
          </div>
        </div>
        
        {/* Level indicators */}
        <div className="absolute right-0 top-10 h-[calc(100%-40px)] flex flex-col justify-between pr-2">
          {Object.entries(preset).reverse().map(([label, value]) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`h-px w-4 ${currentLevel >= value ? 'bg-amber-500' : 'bg-gray-600'}`} />
              <span className={`text-xs ${currentLevel >= value ? 'text-amber-500' : 'text-gray-600'}`}>
                {value}%
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Interactive slider */}
      {interactive && (
        <div className="pt-2">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={currentLevel}
              onChange={(e) => handleChange(parseInt(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="w-full h-2 appearance-none cursor-pointer bg-gray-700 rounded-lg"
              style={{
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, 
                  ${currentLevel > 75 ? '#f59e0b' : currentLevel > 40 ? '#d97706' : '#b45309'} 0%, 
                  ${currentLevel > 75 ? '#f59e0b' : currentLevel > 40 ? '#d97706' : '#b45309'} ${currentLevel}%, 
                  #374151 ${currentLevel}%, 
                  #374151 100%)`
              }}
            />
            
            {/* Slider handle */}
            <motion.div
              className="absolute h-6 w-6 bg-amber-500 rounded-full -top-2 shadow-lg flex items-center justify-center cursor-pointer"
              style={{ left: `calc(${currentLevel}% - 12px)` }}
              whileTap={{ scale: 1.2 }}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring", 
                stiffness: 350,
                damping: 25
              }}
            >
              <Droplets className="w-3 h-3 text-white" />
            </motion.div>
          </div>
          
          {/* Quick selection buttons */}
          <div className="flex justify-between mt-4">
            {Object.entries(preset).map(([label, value]) => (
              <button
                key={label}
                type="button"
                onClick={() => handleChange(value)}
                className={`px-3 py-1 rounded text-xs capitalize transition-all ${
                  Math.abs(currentLevel - value) < 5
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 