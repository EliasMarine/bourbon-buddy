'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface BourbonBottleIndicatorProps {
  level: number;
  onChange?: (level: number) => void;
  interactive?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

type SizeType = 'sm' | 'md' | 'lg';

const presetLevels = [
  { value: 100, label: 'Full' },
  { value: 75, label: '¾ Full' },
  { value: 50, label: 'Half' },
  { value: 25, label: '¼ Full' },
  { value: 0, label: 'Empty' }
];

// Size mappings - increased widths to match reference image
const sizeConfig: Record<SizeType, { 
  bottleWidth: string; 
  bottleHeight: string;
  neckWidth: string;
  neckHeight: string;
  shoulderWidth: string;
  shoulderHeight: string;
  capWidth: string;
  capHeight: string;
  labelWidth: string;
  labelHeight: string;
  fontSize: string;
}> = {
  sm: {
    bottleWidth: 'w-10',
    bottleHeight: 'h-20',
    neckWidth: 'w-4',
    neckHeight: 'h-3',
    shoulderWidth: 'w-6',
    shoulderHeight: 'h-1.5',
    capWidth: 'w-4',
    capHeight: 'h-1.5',
    labelWidth: 'w-8',
    labelHeight: 'h-6',
    fontSize: 'text-[6px]'
  },
  md: {
    bottleWidth: 'w-14',
    bottleHeight: 'h-32',
    neckWidth: 'w-6',
    neckHeight: 'h-4',
    shoulderWidth: 'w-9',
    shoulderHeight: 'h-2',
    capWidth: 'w-6',
    capHeight: 'h-2',
    labelWidth: 'w-10',
    labelHeight: 'h-8',
    fontSize: 'text-[7px]'
  },
  lg: {
    bottleWidth: 'w-20',
    bottleHeight: 'h-44',
    neckWidth: 'w-8',
    neckHeight: 'h-6',
    shoulderWidth: 'w-14',
    shoulderHeight: 'h-3',
    capWidth: 'w-8',
    capHeight: 'h-3',
    labelWidth: 'w-16',
    labelHeight: 'h-12',
    fontSize: 'text-xs'
  }
};

export default function BourbonBottleIndicator({
  level,
  onChange,
  interactive = false,
  className = '',
  size = 'md',
  showLabel = true
}: BourbonBottleIndicatorProps) {
  const [currentLevel, setCurrentLevel] = useState(level || 100);
  const [isDragging, setIsDragging] = useState(false);
  
  // Update when props change
  useEffect(() => {
    if (!isDragging) {
      setCurrentLevel(level);
    }
  }, [level, isDragging]);
  
  // Handle level changes and notify parent
  const handleLevelChange = (newValue: number) => {
    setCurrentLevel(newValue);
    if (onChange) {
      onChange(newValue);
    }
  };
  
  // Use a consistent amber color for bourbon like in the image
  const getBourbonColor = () => {
    return 'bg-amber-400'; // Consistent amber color
  };
  
  // Get level label text
  const getLevelLabel = () => {
    if (currentLevel <= 5) return 'Empty';
    if (currentLevel <= 30) return '¼ Full';
    if (currentLevel <= 60) return 'Half Full';
    if (currentLevel <= 85) return '¾ Full';
    return 'Full';
  };
  
  // Bubble component for liquid animation (simplified)
  const Bubble = ({ 
    delay, 
    size, 
    position 
  }: { 
    delay: number; 
    size: string; 
    position: string; 
  }) => (
    <motion.div
      className={`absolute rounded-full bg-white/10 ${size}`}
      style={{ left: position }}
      initial={{ y: 0, opacity: 0 }}
      animate={{ 
        y: [-10, -20, -30],
        opacity: [0, 0.3, 0]
      }}
      transition={{
        duration: 2.5,
        delay,
        repeat: Infinity,
        ease: "easeOut"
      }}
    />
  );

  const config = sizeConfig[size];
  
  return (
    <div className={`relative flex flex-col items-center ${className}`}>
      {/* Fixed height container to prevent layout shifts */}
      <div className={`relative ${config.bottleHeight} flex flex-col items-center justify-start`} style={{ width: config.bottleWidth }}>
        {/* Bottle cap */}
        <div className={`${config.capWidth} ${config.capHeight} bg-gray-800 rounded-sm border border-gray-700 z-10`}></div>
        
        {/* Bottle assembly */}
        <div className="relative flex flex-col items-center w-full">
          {/* Bottle neck */}
          <div className={`${config.neckWidth} ${config.neckHeight} bg-[#101625]/90 border border-gray-600 rounded-t-sm overflow-hidden`}>
            {/* Neck liquid */}
            {currentLevel > 75 && (
              <div
                className={`absolute bottom-0 w-full ${getBourbonColor()}`}
                style={{ 
                  height: currentLevel > 95 
                    ? '100%' 
                    : `${Math.min(100, (currentLevel - 75) * 4)}%` 
                }}
              />
            )}
          </div>
          
          {/* Bottle shoulders (transitional part) */}
          <div className={`${config.shoulderWidth} ${config.shoulderHeight} bg-[#101625]/90 border-x border-b border-gray-600 overflow-hidden`}>
            {/* Shoulder liquid */}
            {currentLevel > 70 && (
              <div
                className={`absolute bottom-0 w-full ${getBourbonColor()}`}
                style={{ height: '100%' }}
              />
            )}
          </div>
          
          {/* Bottle body */}
          <div className={`${config.bottleWidth} ${config.bottleHeight} relative bg-[#101625]/90 border border-gray-600 rounded-b-lg overflow-hidden`}>
            {/* Main liquid - using relative positioning to ensure liquid stays inside */}
            <div
              className={`absolute inset-x-0 bottom-0 ${getBourbonColor()}`}
              style={{ 
                height: `${Math.min(100, currentLevel)}%`,
                transition: 'height 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
              }}
            >
              {/* Bubbles (only show if level is high enough) */}
              {currentLevel > 20 && (
                <>
                  <Bubble delay={0.5} size="w-1 h-1" position="25%" />
                  <Bubble delay={1.2} size="w-0.5 h-0.5" position="40%" />
                  <Bubble delay={2.1} size="w-0.75 h-0.75" position="65%" />
                  <Bubble delay={1.7} size="w-1.5 h-1.5" position="75%" />
                </>
              )}
              
              {/* Surface shine */}
              <motion.div 
                className="absolute top-0 inset-x-0 h-0.5 bg-white/20"
                animate={{ 
                  opacity: [0.2, 0.4, 0.2],
                  y: [-0.5, 0.5, -0.5]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
            
            {/* Label (positioned in the middle of the bottle) */}
            <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${config.labelWidth} ${config.labelHeight} bg-amber-100 rounded border border-amber-200 flex items-center justify-center overflow-hidden z-10`}>
              <div className={`text-center p-1 ${config.fontSize}`}>
                <div className="font-bold text-gray-700 uppercase">BOURBON</div>
                <div className="text-gray-600 mt-0.5 text-[5px] md:text-[6px]">Special Reserve</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Percentage indicator */}
      {showLabel && (
        <div className="text-sm font-medium text-amber-500 mt-2">
          {currentLevel}% ({getLevelLabel()})
        </div>
      )}
      
      {/* Interactive controls - only show if interactive */}
      {interactive && (
        <div className="w-full mt-4 space-y-3">
          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={currentLevel}
              onChange={(e) => handleLevelChange(parseInt(e.target.value))}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              className="w-full h-2 appearance-none cursor-pointer bg-gray-700 rounded-lg"
              style={{
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, 
                  #f59e0b 0%, 
                  #f59e0b ${currentLevel}%, 
                  #374151 ${currentLevel}%, 
                  #374151 100%)`
              }}
            />
            
            {/* Slider handle */}
            <div
              className="absolute h-6 w-6 bg-amber-500 rounded-full -top-2 shadow-lg flex items-center justify-center cursor-pointer transform transition-transform duration-200 hover:scale-110"
              style={{ 
                left: `calc(${currentLevel}% - 12px)`,
                transition: 'left 0.1s ease-out'
              }}
            />
          </div>
          
          {/* Quick selection buttons */}
          <div className="flex justify-between">
            {presetLevels.map((preset) => (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleLevelChange(preset.value)}
                className={`px-2 py-1 rounded text-xs transition-all ${
                  Math.abs(currentLevel - preset.value) < 5
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 