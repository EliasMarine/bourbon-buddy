'use client';

import React, { useState, useEffect } from 'react';

interface BourbonFillIndicatorProps {
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
  { value: 75, label: '¾' },
  { value: 50, label: '½' },
  { value: 25, label: '¼' },
  { value: 0, label: 'Empty' }
];

// Size mappings for vertical orientation - increased sizes for all variants
const sizeConfig: Record<SizeType, { 
  barWidth: string;
  barHeight: string;
  fontSize: string;
  markerSize: string;
  labelWidth: string;
}> = {
  sm: {
    barWidth: 'w-4',
    barHeight: 'h-20',
    fontSize: 'text-xs',
    markerSize: 'w-2.5 h-0.5',
    labelWidth: 'w-16'
  },
  md: {
    barWidth: 'w-6',
    barHeight: 'h-28',
    fontSize: 'text-sm',
    markerSize: 'w-3.5 h-0.5',
    labelWidth: 'w-20'
  },
  lg: {
    barWidth: 'w-8',
    barHeight: 'h-36',
    fontSize: 'text-base',
    markerSize: 'w-5 h-0.5',
    labelWidth: 'w-24'
  }
};

export default function BourbonFillIndicator({
  level,
  onChange,
  interactive = false,
  className = '',
  size = 'md',
  showLabel = true
}: BourbonFillIndicatorProps) {
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
  
  // Calculate the fill color based on level
  const getFillColor = () => {
    if (currentLevel <= 25) return 'bg-amber-700';
    if (currentLevel <= 50) return 'bg-amber-600';
    if (currentLevel <= 75) return 'bg-amber-500';
    return 'bg-amber-400';
  };
  
  // Get level label text
  const getLevelLabel = () => {
    if (currentLevel <= 5) return 'Empty';
    if (currentLevel <= 30) return '¼ Full';
    if (currentLevel <= 60) return '½ Full';
    if (currentLevel <= 85) return '¾ Full';
    return 'Full';
  };

  const config = sizeConfig[size];
  
  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Two-part layout - first the label, then the fill bar */}
      <div className="flex flex-col items-center w-full">
        {/* Label in its own section */}
        {showLabel && (
          <div className={`font-medium text-amber-500 ${config.fontSize} ${config.labelWidth} text-center mb-3 h-6 w-full`}>
            {currentLevel}% ({getLevelLabel()})
          </div>
        )}
        
        {/* Fill bar in a separate section below */}
        <div className={`flex flex-col items-center ${config.barWidth} mt-1`}>
          {/* Vertical fill bar wrapper */}
          <div className="flex items-end w-full">
            {/* Fill bar */}
            <div className={`relative ${config.barWidth} ${config.barHeight} bg-[#101625] border border-gray-600 rounded overflow-hidden flex flex-col justify-end`}>
              {/* Fill level (rises from bottom) */}
              <div 
                className={`${getFillColor()}`}
                style={{ 
                  height: `${currentLevel}%`,
                  transition: 'height 0.3s ease-out'
                }}
              />
              
              {/* Level markers - positioned from bottom */}
              {[25, 50, 75].map((mark) => (
                <div 
                  key={mark}
                  className="absolute left-0 right-0 flex justify-center pointer-events-none"
                  style={{ bottom: `${mark}%` }}
                >
                  <div className={`${config.markerSize} bg-white/30 rounded-full`}></div>
                </div>
              ))}
              
              {/* Labels for 25%, 50%, 75% marks */}
              <div className="absolute -right-9 inset-y-0 flex flex-col justify-between pointer-events-none text-[10px] text-gray-400">
                <div style={{ marginTop: 'auto', marginBottom: '2px' }}>25%</div>
                <div style={{ margin: 'auto 0' }}>50%</div>
                <div style={{ marginBottom: 'auto', marginTop: '2px' }}>75%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Interactive controls - only show if interactive */}
      {interactive && (
        <div className="w-full mt-3 space-y-3">
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
              className="absolute h-5 w-5 bg-amber-500 rounded-full -top-1.5 shadow-lg flex items-center justify-center cursor-pointer"
              style={{ 
                left: `calc(${currentLevel}% - 10px)`,
                transition: 'left 0.1s ease-out'
              }}
            />
          </div>
          
          {/* Quick selection buttons */}
          <div className="flex justify-between pt-2">
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