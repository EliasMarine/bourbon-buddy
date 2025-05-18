import React from 'react';
import { nonceStyle } from '@/lib/utils';

interface LoadingDotsProps {
  color?: string;
  size?: number;
  className?: string;
}

export function LoadingDots({ color = '#fff', size = 4, className = '' }: LoadingDotsProps) {
  return (
    <span className={`inline-flex text-center items-center leading-7 ${className}`}>
      <span
        className="animate-bounce mx-0.5 rounded-full"
        style={{
          backgroundColor: color,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: '0ms',
        }}
      />
      <span
        className="animate-bounce mx-0.5 rounded-full"
        style={{
          backgroundColor: color,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: '150ms',
        }}
      />
      <span
        className="animate-bounce mx-0.5 rounded-full"
        style={{
          backgroundColor: color,
          width: `${size}px`,
          height: `${size}px`,
          animationDelay: '300ms',
        }}
      />
    </span>
  );
} 