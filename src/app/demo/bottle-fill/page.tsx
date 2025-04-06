'use client';

import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import AnimatedBottleLevelIndicator from '@/components/ui/AnimatedBottleLevelIndicator';

export default function BottleFillDemoPage() {
  const [currentLevel, setCurrentLevel] = useState(75);

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/collection" className="text-amber-500 hover:text-amber-400 mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Bottle Fill Animation Demo</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-6 bg-gray-800 rounded-lg">
          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-semibold text-amber-500">Small Size</h2>
            <AnimatedBottleLevelIndicator 
              level={currentLevel} 
              size="sm"
              interactive={true}
              onLevelChange={setCurrentLevel}
            />
          </div>

          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-semibold text-amber-500">Medium Size</h2>
            <AnimatedBottleLevelIndicator 
              level={currentLevel} 
              size="md"
              interactive={true}
              onLevelChange={setCurrentLevel}
            />
          </div>

          <div className="flex flex-col items-center space-y-4">
            <h2 className="text-xl font-semibold text-amber-500">Large Size</h2>
            <AnimatedBottleLevelIndicator 
              level={currentLevel} 
              size="lg"
              interactive={true}
              onLevelChange={setCurrentLevel}
            />
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold text-amber-500 mb-4">Interactive Controls</h2>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <div className="text-sm font-medium text-gray-300">Bottle Level</div>
              <div className="text-sm font-medium text-amber-500">{currentLevel}%</div>
            </div>
            
            <div className="relative pt-1">
              <div className="flex justify-between w-full mb-1 bg-gray-700 rounded px-2 py-1">
                <span className="text-xs text-amber-400 font-bold">Empty</span>
                <span className="text-xs text-amber-400 font-bold">Full</span>
              </div>
              
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={currentLevel} 
                onChange={(e) => setCurrentLevel(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, 
                    #d97706 0%, 
                    #d97706 ${currentLevel}%, 
                    #374151 ${currentLevel}%, 
                    #374151 100%)`
                }}
              />
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 mt-4">
            {[0, 10, 25, 50, 75, 90, 100].map(level => (
              <button
                key={level}
                onClick={() => setCurrentLevel(level)}
                className={`px-3 py-1.5 rounded-md transition-colors ${
                  currentLevel === level 
                    ? 'bg-amber-600 text-white' 
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                }`}
              >
                {level}%
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8 p-6 bg-gray-800 rounded-lg">
          <h2 className="text-xl font-semibold text-amber-500 mb-4">How to Use</h2>
          <pre className="bg-gray-900 p-4 rounded-md overflow-x-auto">
            <code className="text-sm text-gray-300">
{`import AnimatedBottleLevelIndicator from '@/components/ui/AnimatedBottleLevelIndicator';

// Basic usage
<AnimatedBottleLevelIndicator 
  level={75} 
  size="md"
/>

// Interactive with callback
<AnimatedBottleLevelIndicator 
  level={bottleLevel} 
  size="lg"
  interactive={true}
  onLevelChange={(newLevel) => setBottleLevel(newLevel)}
/>`}
            </code>
          </pre>
        </div>
      </div>
    </div>
  );
} 