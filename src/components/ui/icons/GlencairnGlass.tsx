'use client';

import { SVGProps } from 'react';

interface GlencairnGlassProps extends SVGProps<SVGSVGElement> {
  fillLevel?: number; // 0-100 percentage
  fillColor?: string;
  className?: string;
}

export default function GlencairnGlass({
  fillLevel = 25,
  fillColor = '#d97706', // amber-600 default
  className = '',
  ...props
}: GlencairnGlassProps) {
  // Ensure fill level is between 0-100
  const normalizedFillLevel = Math.max(0, Math.min(100, fillLevel));
  
  // Create a transformed, simplified version of the Glencairn glass
  // Original SVG coordinates were massive (viewBox="0 0 2100 1818")
  // This is a simplified version that works better for React
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      {/* Glass outline */}
      <path
        d="M30 15 C30 15 40 12 50 12 C60 12 70 15 70 15 V40 C70 40 75 55 75 65 C75 75 65 85 50 85 C35 85 25 75 25 65 C25 55 30 40 30 40 V15 Z"
        fill="none"
      />
      
      {/* Base/foot */}
      <path 
        d="M38 85 C38 85 35 90 50 90 C65 90 62 85 62 85" 
        fill="none" 
      />
      
      {/* Liquid fill - only render if fillLevel > 0 */}
      {normalizedFillLevel > 0 && (
        <path
          d="M30 15 C30 15 40 12 50 12 C60 12 70 15 70 15 V40 C70 40 75 55 75 65 C75 75 65 85 50 85 C35 85 25 75 25 65 C25 55 30 40 30 40 V15 Z"
          fill={fillColor}
          // Use a clipPath to create the fill level effect
          style={{
            clipPath: `polygon(0% 100%, 100% 100%, 100% ${100 - normalizedFillLevel}%, 0% ${100 - normalizedFillLevel}%)`
          }}
        />
      )}
    </svg>
  );
} 