'use client';

import React, { useState } from 'react';
import BourbonFillIndicator from '@/components/ui/BourbonFillIndicator';

export default function FillIndicatorDemo() {
  const [fillLevel, setFillLevel] = useState(75);
  
  return (
    <div className="container mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-8 text-white">Bourbon Fill Level Indicator</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Interactive Demo */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Interactive Demo</h2>
          <div className="flex flex-col items-center">
            <BourbonFillIndicator 
              level={fillLevel} 
              onChange={setFillLevel} 
              interactive={true}
              size="lg"
            />
          </div>
        </div>
        
        {/* Size Variants */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Size Variants</h2>
          <div className="flex justify-around items-end gap-6">
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2 block">Small</span>
              <BourbonFillIndicator level={75} size="sm" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2 block">Medium</span>
              <BourbonFillIndicator level={75} size="md" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2 block">Large</span>
              <BourbonFillIndicator level={75} size="lg" />
            </div>
          </div>
        </div>
        
        {/* Fill Level Examples */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Fill Levels</h2>
          <div className="flex justify-around gap-4">
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2 block">Empty</span>
              <BourbonFillIndicator level={0} size="md" showLabel={false} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2 block">Half</span>
              <BourbonFillIndicator level={50} size="md" showLabel={false} />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2 block">Full</span>
              <BourbonFillIndicator level={100} size="md" showLabel={false} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Example in UI components */}
      <div className="mt-10 bg-gray-800/60 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-6">Example in Forms</h2>
        <div className="max-w-lg mx-auto bg-gray-900/50 p-6 rounded-lg border border-gray-700">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bottle Level
            </label>
            <div className="flex flex-col space-y-2">
              <div className="flex justify-between text-xs text-white font-medium">
                <span>Empty</span>
                <span>Full</span>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={fillLevel}
                  onChange={(e) => setFillLevel(Number(e.target.value))}
                  className="flex-1 h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex-shrink-0 w-14">
                  <BourbonFillIndicator level={fillLevel} size="sm" showLabel={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Detailed View */}
      <div className="mt-10 bg-gray-800/60 border border-gray-700 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Detailed Fill Levels</h2>
        <div className="flex flex-col md:flex-row gap-8 justify-center">
          <div className="flex flex-col items-center">
            <span className="text-gray-300 mb-2 block">Quarter (25%)</span>
            <BourbonFillIndicator level={25} size="lg" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-300 mb-2 block">Half (50%)</span>
            <BourbonFillIndicator level={50} size="lg" />
          </div>
          <div className="flex flex-col items-center">
            <span className="text-gray-300 mb-2 block">Three-quarters (75%)</span>
            <BourbonFillIndicator level={75} size="lg" />
          </div>
        </div>
      </div>
      
      {/* Code Example */}
      <div className="mt-10">
        <h2 className="text-2xl font-bold mb-4 text-white">How to Use</h2>
        <div className="bg-gray-900 rounded-lg p-6 overflow-auto">
          <pre className="text-gray-300 overflow-x-auto">
            {`import BourbonFillIndicator from '@/components/ui/BourbonFillIndicator';

// Basic usage
<BourbonFillIndicator level={75} />

// Interactive with size
<BourbonFillIndicator 
  level={fillLevel} 
  onChange={setFillLevel}
  interactive={true}
  size="lg"
/>

// Without label
<BourbonFillIndicator level={50} showLabel={false} />`}
          </pre>
        </div>
      </div>
    </div>
  );
} 