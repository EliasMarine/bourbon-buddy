'use client';

import React, { useState, useEffect } from 'react';
import BourbonFillIndicator from './BourbonFillIndicator';

interface SimpleBottleLevelSliderProps {
  value: number;
  onChange: (value: number) => void;
  id?: string;
}

export default function SimpleBottleLevelSlider({
  value,
  onChange,
  id = 'bottleLevel'
}: SimpleBottleLevelSliderProps) {
  const [sliderValue, setSliderValue] = useState(value || 100);
  
  // Sync with external value
  useEffect(() => {
    if (value !== undefined) {
      setSliderValue(value);
    }
  }, [value]);
  
  // Handle slider change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setSliderValue(newValue);
    onChange(newValue);
  };
  
  // Calculate the gradient color based on level
  const getGradientColor = () => {
    if (sliderValue > 75) return '#f59e0b'; // amber-500
    if (sliderValue > 40) return '#d97706'; // amber-600
    return '#b45309'; // amber-700
  };
  
  return (
    <div className="w-full flex flex-col md:flex-row gap-4 md:items-center">
      {/* Fill indicator */}
      <div className="flex-shrink-0 flex justify-center">
        <BourbonFillIndicator
          level={sliderValue}
          size="md"
          showLabel={true}
        />
      </div>
      
      {/* Slider controls */}
      <div className="flex-1 space-y-2">
        <div className="flex justify-between items-center">
          <label htmlFor={id} className="block text-sm font-medium text-gray-300">
            Bottle Level
          </label>
        </div>
        
        <div className="relative">
          {/* Slider */}
          <input
            type="range"
            id={id}
            min="0"
            max="100"
            value={sliderValue}
            onChange={handleChange}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            style={{
              WebkitAppearance: 'none',
              background: `linear-gradient(to right, 
                ${getGradientColor()} 0%, 
                ${getGradientColor()} ${sliderValue}%, 
                #374151 ${sliderValue}%, 
                #374151 100%)`
            }}
          />
          
          {/* Quick level buttons */}
          <div className="flex justify-between mt-4">
            {[0, 25, 50, 75, 100].map((level) => (
              <button
                key={level}
                type="button"
                onClick={() => {
                  setSliderValue(level);
                  onChange(level);
                }}
                className={`px-2 py-1 rounded text-xs ${
                  Math.abs(sliderValue - level) < 5
                    ? 'bg-amber-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {level}%
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 