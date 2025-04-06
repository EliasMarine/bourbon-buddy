'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface BottleLevelIndicatorProps {
  level: number; // 0-100
  onChange?: (level: number) => void;
  interactive?: boolean;
}

export default function BottleLevelIndicator({ 
  level, 
  onChange, 
  interactive = false 
}: BottleLevelIndicatorProps) {
  // Ensure level is within 0-100 range
  const clampedLevel = Math.max(0, Math.min(100, level));
  
  // Handle slider change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newLevel = parseInt(e.target.value, 10);
    if (onChange) {
      onChange(newLevel);
    }
  };
  
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <div className="text-sm font-medium text-gray-300">Bottle Level</div>
        <div className="text-sm font-medium text-amber-500">{clampedLevel}%</div>
      </div>
      
      <div className="relative pt-1">
        <input
          type="range"
          min="0"
          max="100"
          value={clampedLevel}
          onChange={handleChange}
          disabled={!interactive}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{
            WebkitAppearance: 'none',
            background: `linear-gradient(to right, 
              ${clampedLevel > 75 ? '#f59e0b' : clampedLevel > 40 ? '#d97706' : '#b45309'} 0%, 
              ${clampedLevel > 75 ? '#f59e0b' : clampedLevel > 40 ? '#d97706' : '#b45309'} ${clampedLevel}%, 
              #374151 ${clampedLevel}%, 
              #374151 100%)`
          }}
        />
        
        <motion.div 
          className="absolute h-6 w-6 bg-amber-500 rounded-full -top-2 shadow-md flex items-center justify-center text-xs text-white font-bold"
          style={{ 
            left: `calc(${clampedLevel}% - 12px)`,
            display: interactive ? 'flex' : 'none'
          }}
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        />
      </div>
      
      {/* Tick marks */}
      <div className="relative w-full h-6 mt-1">
        {[0, 25, 50, 75, 100].map((value) => (
          <div 
            key={value} 
            className="absolute transform -translate-x-1/2"
            style={{ left: `${value}%` }}
          >
            <div 
              className={`h-1 w-0.5 mx-auto ${
                Math.abs(clampedLevel - value) < 5 
                  ? 'bg-amber-500' 
                  : 'bg-gray-600'
              }`}
            />
            <div className={`text-xs mt-0.5 ${
              Math.abs(clampedLevel - value) < 5 
                ? 'text-amber-500' 
                : 'text-gray-500'
            }`}>
              {value}%
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 