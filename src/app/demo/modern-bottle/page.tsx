'use client';

import { useState } from 'react';
import { ArrowLeft, Wine } from 'lucide-react';
import Link from 'next/link';
import ModernBottleLevelIndicator from '@/components/ui/ModernBottleLevelIndicator';

export default function ModernBottleDemoPage() {
  const [currentLevel, setCurrentLevel] = useState(75);

  return (
    <div className="min-h-screen bg-gray-900 text-white px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Link href="/collection" className="text-amber-500 hover:text-amber-400 mr-2">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold">Modern Bottle Level Indicator</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Interactive demo */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-amber-500 mb-6">Interactive Demo</h2>
            <ModernBottleLevelIndicator 
              level={currentLevel} 
              onChange={setCurrentLevel}
              interactive={true}
            />
          </div>
          
          {/* Fixed level examples */}
          <div className="bg-gray-800 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-amber-500 mb-6">Fixed Level Examples</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Full (100%)</h3>
                <ModernBottleLevelIndicator level={100} />
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-2">High (75%)</h3>
                <ModernBottleLevelIndicator level={75} />
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Half (50%)</h3>
                <ModernBottleLevelIndicator level={50} />
              </div>
              <div>
                <h3 className="text-sm text-gray-400 mb-2">Low (25%)</h3>
                <ModernBottleLevelIndicator level={25} />
              </div>
            </div>
          </div>
          
          {/* Usage example */}
          <div className="bg-gray-800 p-6 rounded-lg col-span-1 md:col-span-2">
            <h2 className="text-xl font-semibold text-amber-500 mb-4">How to Use</h2>
            <pre className="bg-gray-900 p-4 rounded-md overflow-x-auto">
              <code className="text-sm text-gray-300">
{`import ModernBottleLevelIndicator from '@/components/ui/ModernBottleLevelIndicator';

// Basic usage - non-interactive
<ModernBottleLevelIndicator level={75} />

// Interactive with callback
<ModernBottleLevelIndicator 
  level={bottleLevel} 
  onChange={setBottleLevel}
  interactive={true}
/>`}
              </code>
            </pre>
          </div>
          
          {/* Implementation notes */}
          <div className="bg-gray-800 p-6 rounded-lg col-span-1 md:col-span-2">
            <h2 className="text-xl font-semibold text-amber-500 mb-4">Features</h2>
            <ul className="list-disc pl-5 space-y-2 text-gray-300">
              <li>High-fidelity bottle visualization with liquid animations</li>
              <li>Animated bubbles that appear when liquid is above 20%</li>
              <li>Fluid transitions between level changes with spring physics</li>
              <li>Color gradient that changes based on fill level</li>
              <li>Interactive slider with animated handle and intuitive controls</li>
              <li>Quick selection buttons for common fill levels</li>
              <li>Visual level indicators with percentage markings</li>
              <li>Textual label that automatically updates based on level</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 