'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  danger = false
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full mx-4 shadow-xl animate-in fade-in duration-200">
        <div className="flex items-center gap-3 mb-4">
          {danger && (
            <div className="flex-shrink-0 bg-red-600/20 p-2 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-500" />
            </div>
          )}
          <h3 className="text-xl font-semibold text-white">{title}</h3>
        </div>
        
        <p className="text-gray-300 mb-6">{message}</p>
        
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700'
            } text-white rounded-md transition-colors`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
} 