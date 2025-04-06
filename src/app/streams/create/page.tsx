'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeft, Video, Users, Lock, Globe, Copy, Plus, X, Mail, Info, Send } from 'lucide-react';
import type { Spirit } from '@/types';
import Link from 'next/link';

type Privacy = 'public' | 'private';

export default function CreateStreamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [spirits, setSpirits] = useState<Spirit[]>([]);
  const [error, setError] = useState('');
  const [privacy, setPrivacy] = useState<Privacy>('public');
  const [invitedEmails, setInvitedEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [step, setStep] = useState<1 | 2>(1);
  
  // Store form data to persist between steps
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    spiritId: '',
  });

  // Reference to the form element
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!session) {
      router.push('/login');
      return;
    }

    fetchSpirits();
  }, [session, router]);

  const fetchSpirits = async () => {
    try {
      const response = await fetch('/api/collection');
      const data = await response.json();
      setSpirits(data.spirits || []);
    } catch (error) {
      console.error('Failed to fetch spirits:', error);
      toast.error('Failed to load your spirits collection');
    }
  };

  const addInvitedEmail = () => {
    if (!emailInput.trim()) return;
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailInput)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    if (!invitedEmails.includes(emailInput)) {
      setInvitedEmails([...invitedEmails, emailInput]);
      setEmailInput('');
    } else {
      toast.error('This email has already been added');
    }
  };

  const removeInvitedEmail = (email: string) => {
    setInvitedEmails(invitedEmails.filter(e => e !== email));
  };

  // Update form data when input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const goToNextStep = () => {
    // Validate and save form data from step 1
    if (!formData.title.trim()) {
      toast.error('Please enter a title for your tasting');
      return;
    }
    
    setStep(2);
  };

  const goToPreviousStep = () => {
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate required fields first
      if (!formData.title) {
        throw new Error('Title is required');
      }
      
      // For private streams, require at least one email
      if (privacy === 'private' && invitedEmails.length === 0) {
        throw new Error('Please add at least one email to invite for a private tasting');
      }

      // Combine form data with privacy settings
      const streamData = {
        ...formData,
        privacy: privacy,
        // Always include the invitedEmails array (empty for public, filled for private)
        invitedEmails: privacy === 'private' ? invitedEmails : [],
      };

      const response = await fetch('/api/streams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(streamData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create stream');
      }

      const stream = await response.json();
      toast.success('Tasting stream created!');
      router.push(`/streams/${stream.id}`);
    } catch (error: any) {
      console.error('Stream creation error:', error);
      setError(error.message || 'Failed to create stream');
      toast.error(error.message || 'Failed to create stream');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-180px)]">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="flex items-center gap-4 mb-6">
          <Link
            href="/streams"
            className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft size={20} className="text-amber-500" />
          </Link>
          <h1 className="text-3xl font-bold text-white">Start a Tasting</h1>
        </div>

        <div className="max-w-3xl mx-auto">
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center w-full max-w-xs">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 1 ? 'bg-amber-600' : 'bg-amber-500'} text-white font-bold`}>
                1
              </div>
              <div className={`flex-1 h-1 mx-2 ${step === 1 ? 'bg-gray-600' : 'bg-amber-500'}`}></div>
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${step === 1 ? 'bg-gray-600' : 'bg-amber-500'} text-white font-bold`}>
                2
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-b from-gray-800/90 to-gray-900/90 backdrop-blur-sm rounded-xl border border-gray-700 shadow-xl overflow-hidden mb-10">
            {error && (
              <div className="mb-0 bg-red-900/60 border-b border-red-700 text-red-100 px-4 py-3">
                {error}
              </div>
            )}

            <form ref={formRef} onSubmit={handleSubmit} className="p-6">
              {step === 1 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">Tasting Details</h2>
                    <p className="text-gray-400 text-sm">Tell us about the tasting you're hosting</p>
                  </div>

                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-200 mb-1">
                      Title*
                    </label>
                    <input
                      type="text"
                      id="title"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      required
                      className="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm 
                      focus:border-amber-500 focus:ring-amber-500 placeholder:text-gray-400 p-3"
                      placeholder="What are we tasting today?"
                    />
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-200 mb-1">
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      rows={4}
                      className="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm 
                      focus:border-amber-500 focus:ring-amber-500 placeholder:text-gray-400 p-3"
                      placeholder="Tell others what to expect in this tasting session..."
                    />
                  </div>

                  <div>
                    <label htmlFor="spiritId" className="block text-sm font-medium text-gray-200 mb-1">
                      Featured Spirit
                    </label>
                    <select
                      id="spiritId"
                      name="spiritId"
                      value={formData.spiritId}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm 
                      focus:border-amber-500 focus:ring-amber-500 p-3"
                    >
                      <option value="">Select a spirit (optional)</option>
                      {spirits.map((spirit) => (
                        <option key={spirit.id} value={spirit.id}>
                          {spirit.name} - {spirit.brand}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-end mt-8">
                    <button
                      type="button"
                      onClick={goToNextStep}
                      className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
                    >
                      Continue to Privacy Settings
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold text-white mb-2">Privacy Settings</h2>
                    <p className="text-gray-400 text-sm">Who can join your tasting session?</p>
                  </div>

                  {/* Hidden fields to preserve form data */}
                  <input type="hidden" name="title" value={formData.title} />
                  <input type="hidden" name="description" value={formData.description} />
                  <input type="hidden" name="spiritId" value={formData.spiritId} />

                  <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <button
                      type="button"
                      onClick={() => setPrivacy('public')}
                      className={`flex-1 p-4 rounded-xl border ${
                        privacy === 'public' 
                          ? 'border-amber-500 bg-amber-600/20' 
                          : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                      } transition-all`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <Globe size={24} className={privacy === 'public' ? 'text-amber-400' : 'text-gray-400'} />
                      </div>
                      <h3 className={`text-lg font-medium ${privacy === 'public' ? 'text-white' : 'text-gray-300'}`}>Public</h3>
                      <p className="text-gray-400 text-sm mt-1">Anyone can join your tasting session</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPrivacy('private')}
                      className={`flex-1 p-4 rounded-xl border ${
                        privacy === 'private' 
                          ? 'border-amber-500 bg-amber-600/20' 
                          : 'border-gray-700 bg-gray-800/50 hover:bg-gray-800'
                      } transition-all`}
                    >
                      <div className="flex items-center justify-center mb-2">
                        <Lock size={24} className={privacy === 'private' ? 'text-amber-400' : 'text-gray-400'} />
                      </div>
                      <h3 className={`text-lg font-medium ${privacy === 'private' ? 'text-white' : 'text-gray-300'}`}>Private</h3>
                      <p className="text-gray-400 text-sm mt-1">Only invited friends can join</p>
                    </button>
                  </div>

                  {privacy === 'private' && (
                    <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
                      <div className="flex items-start gap-2 mb-4">
                        <Info size={18} className="text-amber-400 mt-0.5" />
                        <p className="text-sm text-gray-300">
                          <span className="text-white font-medium">Required: </span>
                          Invite at least one friend to your private tasting session. They will receive an email invitation when you start the stream.
                        </p>
                      </div>
                      
                      <div className="flex gap-2 mb-3">
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="friend@example.com"
                          className="flex-1 rounded-lg bg-gray-700 border-gray-600 text-white shadow-sm 
                          focus:border-amber-500 focus:ring-amber-500 placeholder:text-gray-400 p-2"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addInvitedEmail();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={addInvitedEmail}
                          className="px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 focus:outline-none"
                        >
                          <Plus size={18} />
                        </button>
                      </div>

                      {invitedEmails.length > 0 && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-300 mb-2">Invited friends:</p>
                          <div className="flex flex-wrap gap-2">
                            {invitedEmails.map(email => (
                              <div key={email} className="flex items-center gap-1 bg-gray-700 px-2 py-1 rounded-full">
                                <Mail size={14} className="text-amber-400" />
                                <span className="text-sm text-gray-200">{email}</span>
                                <button 
                                  type="button"
                                  onClick={() => removeInvitedEmail(email)}
                                  className="text-gray-400 hover:text-white p-1"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {invitedEmails.length === 0 && (
                        <p className="text-amber-400 text-sm mt-3">
                          <span className="font-medium">*</span> You must add at least one email to create a private tasting
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-8">
                    <button
                      type="button"
                      onClick={goToPreviousStep}
                      className="px-4 py-2 text-gray-300 hover:text-white"
                    >
                      Back to Details
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || (privacy === 'private' && invitedEmails.length === 0)}
                      className={`px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                        (privacy === 'private' && invitedEmails.length === 0) ? 'opacity-50 hover:from-amber-600 hover:to-amber-700' : ''
                      }`}
                    >
                      {isLoading ? 'Creating...' : 'Start Tasting'}
                      <Video size={18} />
                    </button>
                  </div>

                  {privacy === 'private' && invitedEmails.length === 0 && (
                    <p className="text-amber-400 text-sm text-center mt-2">
                      You must add at least one email invitation before creating a private tasting
                    </p>
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 