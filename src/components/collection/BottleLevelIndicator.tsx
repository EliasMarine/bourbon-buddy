'use client';

import React from 'react';
import { GlassWater } from 'lucide-react';
import BourbonFillIndicator from '../ui/BourbonFillIndicator';

interface BottleLevelIndicatorProps {
  level: number; // 0-100 (empty to full)
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean; // New prop to enable compact mode
  interactive?: boolean; // Add explicit interactive prop 
}

/**
 * Component to display a visual representation of bottle level (from empty to full)
 */
export const BottleLevelIndicator: React.FC<BottleLevelIndicatorProps> = ({
  level,
  size = 'md',
  compact = false, // Default to standard layout
  interactive = false, // Default to non-interactive
}) => {
  // Validate and clamp the level between 0 and 100
  const clampedLevel = Math.max(0, Math.min(100, level));
  
  // Width based on size
  const getWidth = () => {
    if (compact) return 'w-10';
    if (size === 'sm') return 'w-14';
    if (size === 'md') return 'w-20';
    return 'w-24'; // lg
  };
  
  return (
    <div className={`flex items-center ${compact ? 'w-auto' : 'w-full'} justify-center`}>
      <div className={`${getWidth()} flex items-center`}>
        <BourbonFillIndicator
          level={clampedLevel} 
          size={compact ? 'sm' : size}
          showLabel={false}
          className={compact ? 'scale-90' : ''}
          interactive={interactive}
        />
        <span className="text-sm font-bold text-white ml-2">{clampedLevel}%</span>
      </div>
    </div>
  );
};

export default BottleLevelIndicator; 