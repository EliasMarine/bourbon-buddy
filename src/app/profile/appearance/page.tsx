'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Palette, Eye, EyeOff, Globe } from 'lucide-react';
import Link from 'next/link';

export default function AppearanceSettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!session) {
    redirect('/login');
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const data = {
        publicProfile: formData.get('publicProfile') === 'true',
        // Add more appearance settings here
      };

      const response = await fetch('/api/user/appearance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update appearance settings');
      }

      await updateSession();
      toast.success('Appearance settings updated successfully');
    } catch (error) {
      console.error('Error updating appearance settings:', error);
      toast.error('Failed to update appearance settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link
              href="/profile"
              className="p-2 hover:bg-gray-800 rounded-full transition-colors"
            >
              <ArrowLeft className="text-gray-400 hover:text-white" />
            </Link>
            <h1 className="text-2xl font-bold text-white">Profile Appearance</h1>
          </div>

          {/* Settings Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Privacy Settings */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 text-white mb-6">
                <Globe className="h-6 w-6 text-amber-500" />
                <h2 className="text-lg font-semibold">Profile Privacy</h2>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">Public Profile</p>
                    <p className="text-sm text-gray-400">Allow others to view your profile</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      name="publicProfile"
                      value="true"
                      className="sr-only peer"
                      defaultChecked={session.user?.publicProfile ?? false}
                    />
                    <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-amber-500/25 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Theme Settings */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="flex items-center gap-3 text-white mb-6">
                <Palette className="h-6 w-6 text-amber-500" />
                <h2 className="text-lg font-semibold">Theme Settings</h2>
              </div>
              
              <div className="space-y-6">
                {/* Theme Color */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile Accent Color
                  </label>
                  <div className="grid grid-cols-6 gap-3">
                    {['amber', 'red', 'blue', 'green', 'purple', 'pink'].map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-full aspect-square rounded-lg bg-${color}-500 hover:ring-2 hover:ring-${color}-500/50 transition-all`}
                      />
                    ))}
                  </div>
                </div>

                {/* Layout Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Profile Layout
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      className="aspect-video bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                    >
                      <div className="w-full h-full border-2 border-dashed border-gray-600 rounded flex items-center justify-center text-gray-400">
                        Classic
                      </div>
                    </button>
                    <button
                      type="button"
                      className="aspect-video bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors"
                    >
                      <div className="w-full h-full border-2 border-dashed border-gray-600 rounded flex items-center justify-center text-gray-400">
                        Modern
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 