'use client';

import React, { useState, useEffect } from 'react';
import { Dancer } from '../../types/dancer';
import { X, Save } from 'lucide-react';

interface DancerEditModalProps {
  dancer: Dancer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (dancer: Dancer) => void;
}

export const DancerEditModal: React.FC<DancerEditModalProps> = ({
  dancer,
  isOpen,
  onClose,
  onSave
}) => {
  const [editedDancer, setEditedDancer] = useState<Dancer | null>(null);
  const [classesInput, setClassesInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');

  useEffect(() => {
    if (dancer) {
      setEditedDancer({ ...dancer });
      // Initialize raw input states
      setClassesInput(dancer.classes ? dancer.classes.join(', ') : '');
      if (dancer.email) {
        setEmailInput(Array.isArray(dancer.email) ? dancer.email.join('; ') : dancer.email);
      } else {
        setEmailInput('');
      }
    }
  }, [dancer]);

  if (!isOpen || !editedDancer) return null;

  const handleSave = () => {
    // Parse classes and emails from input strings on save
    const classes = classesInput.split(',').map(c => c.trim()).filter(c => c.length > 0);
    let email: string | string[] | undefined;
    if (emailInput.trim()) {
      if (emailInput.includes(';')) {
        const emails = emailInput.split(';').map(e => e.trim()).filter(e => e.length > 0);
        email = emails.length > 0 ? emails : undefined;
      } else {
        email = emailInput.trim() || undefined;
      }
    }

    const updatedDancer: Dancer = {
      ...editedDancer,
      classes: classes.length > 0 ? classes : undefined,
      email: email
    };

    onSave(updatedDancer);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Dancer</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Name Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name
                </label>
                <input
                  type="text"
                  value={editedDancer.firstName || ''}
                  onChange={(e) => setEditedDancer(prev => prev ? {
                    ...prev,
                    firstName: e.target.value,
                    name: `${e.target.value} ${prev.lastName || ''}`.trim()
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={editedDancer.lastName || ''}
                  onChange={(e) => setEditedDancer(prev => prev ? {
                    ...prev,
                    lastName: e.target.value,
                    name: `${prev.firstName || ''} ${e.target.value}`.trim()
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Age and Birthday */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  value={editedDancer.age || ''}
                  onChange={(e) => setEditedDancer(prev => prev ? {
                    ...prev,
                    age: e.target.value ? parseInt(e.target.value, 10) : undefined
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Birthday
                </label>
                <input
                  type="date"
                  value={editedDancer.birthday || ''}
                  onChange={(e) => setEditedDancer(prev => prev ? {
                    ...prev,
                    birthday: e.target.value || undefined
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Gender and Phone */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <input
                  type="text"
                  value={editedDancer.gender || ''}
                  onChange={(e) => setEditedDancer(prev => prev ? {
                    ...prev,
                    gender: e.target.value || undefined
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={editedDancer.phone || ''}
                  onChange={(e) => setEditedDancer(prev => prev ? {
                    ...prev,
                    phone: e.target.value || undefined
                  } : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email (separate multiple with ;)
              </label>
              <input
                type="text"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="email@example.com; another@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Classes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Classes (comma-separated)
              </label>
              <textarea
                value={classesInput}
                onChange={(e) => setClassesInput(e.target.value)}
                placeholder="Class 1, Class 2, Class 3"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Level
              </label>
              <select
                value={editedDancer.level || ''}
                onChange={(e) => setEditedDancer(prev => prev ? {
                  ...prev,
                  level: e.target.value as 'beginner' | 'intermediate' | 'advanced' | undefined
                } : null)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

