'use client';

import React, { useState } from 'react';
import GlencairnGlass from '@/components/ui/icons/GlencairnGlass';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LogoPreviewPage() {
  const [fillLevel, setFillLevel] = useState(70);
  const [fillColor, setFillColor] = useState('#d97706');

  const colors = [
    { name: 'Amber', value: '#d97706' },
    { name: 'Gold', value: '#eab308' },
    { name: 'Copper', value: '#c2410c' },
    { name: 'Mahogany', value: '#9a3412' },
    { name: 'Ruby', value: '#b91c1c' },
  ];

  const sizes = [
    { name: 'Tiny', size: 24 },
    { name: 'Small', size: 32 },
    { name: 'Medium', size: 48 },
    { name: 'Large', size: 64 },
    { name: 'Extra Large', size: 96 },
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <Link 
          href="/" 
          className="inline-flex items-center text-amber-500 hover:text-amber-400 mb-6"
        >
          <ArrowLeft className="mr-2" size={16} />
          Back to Home
        </Link>

        <h1 className="text-3xl font-bold mb-8">Bourbon Buddy Logo Preview</h1>

        <div className="bg-gray-800/50 rounded-xl p-6 mb-10 shadow-lg border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Logo Preview */}
            <div className="flex flex-col items-center justify-center">
              <div className="p-8 bg-gray-900/50 rounded-xl border border-gray-700 mb-4 flex items-center justify-center">
                <GlencairnGlass 
                  width={96} 
                  height={96} 
                  fillLevel={fillLevel} 
                  fillColor={fillColor}
                  className="text-amber-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <GlencairnGlass 
                  width={24} 
                  height={24} 
                  fillLevel={fillLevel} 
                  fillColor={fillColor}
                  className="text-amber-500"
                />
                <span className="text-xl font-bold text-white">Bourbon Buddy</span>
              </div>
            </div>

            {/* Controls */}
            <div>
              {/* Fill Level Slider */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fill Level: {fillLevel}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fillLevel}
                  onChange={(e) => setFillLevel(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    WebkitAppearance: 'none',
                    background: `linear-gradient(to right, 
                      ${fillColor} 0%, 
                      ${fillColor} ${fillLevel}%, 
                      #374151 ${fillLevel}%, 
                      #374151 100%)`
                  }}
                />
                <div className="flex justify-between mt-2">
                  <button 
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    onClick={() => setFillLevel(0)}
                  >
                    Empty
                  </button>
                  <button 
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    onClick={() => setFillLevel(25)}
                  >
                    25%
                  </button>
                  <button 
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    onClick={() => setFillLevel(50)}
                  >
                    50%
                  </button>
                  <button 
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    onClick={() => setFillLevel(75)}
                  >
                    75%
                  </button>
                  <button 
                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
                    onClick={() => setFillLevel(100)}
                  >
                    Full
                  </button>
                </div>
              </div>

              {/* Color Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Fill Color
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {colors.map((color) => (
                    <button
                      key={color.value}
                      className={`h-10 rounded-lg border-2 ${
                        color.value === fillColor 
                          ? 'border-white' 
                          : 'border-transparent hover:border-gray-500'
                      }`}
                      style={{ backgroundColor: color.value }}
                      onClick={() => setFillColor(color.value)}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Size Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Size Previews
                </label>
                <div className="grid grid-cols-5 gap-4">
                  {sizes.map((size) => (
                    <div key={size.size} className="flex flex-col items-center">
                      <GlencairnGlass 
                        width={size.size} 
                        height={size.size} 
                        fillLevel={fillLevel} 
                        fillColor={fillColor}
                        className="text-amber-500 mb-2"
                      />
                      <span className="text-xs text-gray-400">{size.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 shadow-lg border border-gray-700">
          <h2 className="text-xl font-bold mb-4">Usage Information</h2>
          <div className="bg-gray-900/50 p-4 rounded-lg text-gray-300 font-mono text-sm mb-4 overflow-auto">
            <pre>{`<GlencairnGlass 
  width={24} 
  height={24} 
  fillLevel={${fillLevel}} 
  fillColor="${fillColor}"
  className="text-amber-500"
/>`}</pre>
          </div>
          <p className="text-gray-300">
            <strong>Properties:</strong>
          </p>
          <ul className="list-disc list-inside text-gray-300 ml-4 space-y-1 mt-2">
            <li><code className="text-amber-500">fillLevel</code>: Value between 0-100 representing the fill percentage</li>
            <li><code className="text-amber-500">fillColor</code>: HEX color for the liquid fill</li>
            <li><code className="text-amber-500">className</code>: Additional CSS classes (stroke color is controlled via text-color)</li>
            <li>Any standard SVG props are also accepted</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 