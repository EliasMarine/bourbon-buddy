'use client';

import { useState, useEffect } from 'react';
import BourbonFillIndicator from './BourbonFillIndicator';

interface BottleLevelSliderProps {
  value: number;
  onChange: (value: number) => void;
  id?: string;
  name?: string;
}

// Predefined levels with descriptions
const bottleLevels = [
  { value: 100, label: 'Full (100%)' },
  { value: 90, label: 'Just opened (90%)' },
  { value: 75, label: 'Three-quarters (75%)' },
  { value: 50, label: 'Half (50%)' },
  { value: 25, label: 'Quarter (25%)' },
  { value: 10, label: 'Almost empty (10%)' },
  { value: 0, label: 'Empty (0%)' },
];

export default function BottleLevelSlider({ 
  value, 
  onChange, 
  id = 'bottleLevel',
  name = 'bottleLevel'
}: BottleLevelSliderProps) {
  const [sliderValue, setSliderValue] = useState(value || 100);
  const [isDragging, setIsDragging] = useState(false);
  
  // Sync with external value
  useEffect(() => {
    if (value !== undefined && !isDragging) {
      setSliderValue(value);
    }
  }, [value, isDragging]);

  // Update the parent component when the value changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    setSliderValue(newValue);
    onChange(newValue);
  };

  // Handle slider drag start/end
  const handleDragStart = () => setIsDragging(true);
  const handleDragEnd = () => {
    setIsDragging(false);
    // Snap to nearest predefined level when dragging ends
    const closestLevel = bottleLevels.reduce((prev, curr) => 
      Math.abs(curr.value - sliderValue) < Math.abs(prev.value - sliderValue) ? curr : prev
    );
    setSliderValue(closestLevel.value);
    onChange(closestLevel.value);
  };

  // Find current level label
  const getCurrentLevelLabel = () => {
    const closestLevel = bottleLevels.reduce((prev, curr) => 
      Math.abs(curr.value - sliderValue) < Math.abs(prev.value - sliderValue) ? curr : prev
    );
    return closestLevel.label;
  };

  // Calculate the fill color based on the level
  const getFillColor = () => {
    if (sliderValue > 75) return 'bg-amber-500'; // Full to near full
    if (sliderValue > 40) return 'bg-amber-600'; // Half-ish
    return 'bg-amber-700'; // Low
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label htmlFor={id} className="block text-sm font-medium text-gray-300">
          Bottle Level
        </label>
        <span className="text-sm text-amber-500 font-medium">
          {getCurrentLevelLabel()}
        </span>
      </div>
      
      <div className="flex items-center gap-4">
        {/* Fill indicator */}
        <div className="flex-shrink-0">
          <BourbonFillIndicator 
            level={sliderValue} 
            size="md"
            showLabel={false}
          />
        </div>
        
        {/* Slider container */}
        <div className="flex-1">
          {/* Slider */}
          <div className="relative">
            <input
              type="range"
              id={id}
              name={name}
              min="0"
              max="100"
              step="1"
              value={sliderValue}
              onChange={handleChange}
              onMouseDown={handleDragStart}
              onMouseUp={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchEnd={handleDragEnd}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
              style={{
                // Custom styling for the slider
                WebkitAppearance: 'none',
                background: `linear-gradient(to right, 
                  ${getFillColor()} 0%, 
                  ${getFillColor()} ${sliderValue}%, 
                  #374151 ${sliderValue}%, 
                  #374151 100%)`
              }}
            />
          </div>
          
          {/* Quick selection buttons */}
          <div className="flex flex-wrap gap-1 mt-4">
            {bottleLevels.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => {
                  setSliderValue(level.value);
                  onChange(level.value);
                }}
                className={`text-xs px-1 py-1 rounded ${
                  Math.abs(sliderValue - level.value) < 5
                    ? 'bg-amber-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 