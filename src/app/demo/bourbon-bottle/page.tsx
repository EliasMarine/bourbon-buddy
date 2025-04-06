'use client';

import React, { useState } from 'react';
import BourbonBottleIndicator from '@/components/ui/BourbonBottleIndicator';

export default function BourbonBottleDemo() {
  const [bottleLevel, setBottleLevel] = useState(75);
  
  return (
    <div className="container mx-auto py-12 px-6">
      <h1 className="text-4xl font-bold mb-8 text-white">Bourbon Bottle Indicator</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Interactive Demo */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Interactive Demo</h2>
          <div className="flex flex-col items-center">
            <BourbonBottleIndicator 
              level={bottleLevel} 
              onChange={setBottleLevel} 
              interactive={true}
              size="lg"
            />
          </div>
        </div>
        
        {/* Size Variants */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Size Variants</h2>
          <div className="flex justify-between items-end">
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2">Small</span>
              <BourbonBottleIndicator level={75} size="sm" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2">Medium</span>
              <BourbonBottleIndicator level={75} size="md" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2">Large</span>
              <BourbonBottleIndicator level={75} size="lg" />
            </div>
          </div>
        </div>
        
        {/* Fill Level Examples */}
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Fill Levels</h2>
          <div className="flex justify-between items-end">
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2">Empty</span>
              <BourbonBottleIndicator level={0} size="md" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2">Half</span>
              <BourbonBottleIndicator level={50} size="md" />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-gray-300 mb-2">Full</span>
              <BourbonBottleIndicator level={100} size="md" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Code Example */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4 text-white">How to Use</h2>
        <div className="bg-gray-900 rounded-lg p-6 overflow-auto">
          <pre className="text-gray-300 overflow-x-auto">
            {`import BourbonBottleIndicator from '@/components/ui/BourbonBottleIndicator';

// Basic usage
<BourbonBottleIndicator level={75} />

// Interactive with size
<BourbonBottleIndicator 
  level={bottleLevel} 
  onChange={setBottleLevel}
  interactive={true}
  size="lg"
/>

// Without label
<BourbonBottleIndicator level={50} showLabel={false} />`}
          </pre>
        </div>
      </div>
    </div>
  );
} 