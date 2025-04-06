'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EditProfilePage() {
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
        name: formData.get('name'),
        username: formData.get('username'),
        location: formData.get('location'),
        occupation: formData.get('occupation'),
        education: formData.get('education'),
        bio: formData.get('bio'),
      };

      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      await updateSession();
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
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
            <h1 className="text-2xl font-bold text-white">Edit Profile Details</h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <div className="space-y-6">
                {/* Basic Information */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Basic Information</h2>
                  <div className="grid gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        defaultValue={session.user?.name || ''}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        placeholder="Enter your full name"
                      />
                    </div>

                    <div>
                      <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                        Username
                      </label>
                      <input
                        type="text"
                        id="username"
                        name="username"
                        defaultValue={session.user?.username || ''}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        placeholder="Choose a username"
                      />
                    </div>
                  </div>
                </div>

                {/* Location & Work */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">Location & Work</h2>
                  <div className="grid gap-6">
                    <div>
                      <label htmlFor="location" className="block text-sm font-medium text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        id="location"
                        name="location"
                        defaultValue={session.user?.location || ''}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        placeholder="Where are you based?"
                      />
                    </div>

                    <div>
                      <label htmlFor="occupation" className="block text-sm font-medium text-gray-300 mb-2">
                        Occupation
                      </label>
                      <input
                        type="text"
                        id="occupation"
                        name="occupation"
                        defaultValue={session.user?.occupation || ''}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        placeholder="What do you do?"
                      />
                    </div>

                    <div>
                      <label htmlFor="education" className="block text-sm font-medium text-gray-300 mb-2">
                        Education
                      </label>
                      <input
                        type="text"
                        id="education"
                        name="education"
                        defaultValue={session.user?.education || ''}
                        className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                        placeholder="Where did you study?"
                      />
                    </div>
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <h2 className="text-lg font-semibold text-white mb-4">About You</h2>
                  <div>
                    <label htmlFor="bio" className="block text-sm font-medium text-gray-300 mb-2">
                      Bio
                    </label>
                    <textarea
                      id="bio"
                      name="bio"
                      rows={4}
                      defaultValue={session.user?.bio || ''}
                      className="w-full bg-gray-900/50 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500"
                      placeholder="Tell us about yourself and your interest in spirits..."
                    />
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