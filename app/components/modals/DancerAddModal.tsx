'use client';

import React, { useState } from 'react';
import { Dancer } from '../../types/dancer';
import { X, Save, Plus } from 'lucide-react';

interface DancerAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (dancer: Dancer) => void;
}

export const DancerAddModal: React.FC<DancerAddModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [newDancer, setNewDancer] = useState<Partial<Dancer>>({
    name: '',
    firstName: '',
    lastName: '',
    age: undefined,
    birthday: undefined,
    gender: '',
    phone: '',
    email: '',
    classes: [],
    level: undefined,
    genres: []
  });
  const [classesInput, setClassesInput] = useState<string>('');
  const [genresInput, setGenresInput] = useState<string>('');
  const [emailInput, setEmailInput] = useState<string>('');

  const resetForm = () => {
    setNewDancer({
      name: '',
      firstName: '',
      lastName: '',
      age: undefined,
      birthday: undefined,
      gender: '',
      phone: '',
      email: '',
      classes: [],
      level: undefined,
      genres: []
    });
    setClassesInput('');
    setGenresInput('');
    setEmailInput('');
  };

  const handleSave = () => {
    // Validate required fields
    if (!newDancer.name || (!newDancer.firstName && !newDancer.lastName)) {
      if (!newDancer.firstName && !newDancer.lastName) {
        // Generate name from firstName and lastName if name is missing
        const fullName = `${newDancer.firstName || ''} ${newDancer.lastName || ''}`.trim();
        if (!fullName) {
          alert('Please enter at least a name or first/last name');
          return;
        }
        newDancer.name = fullName;
      }
    }

    // Parse classes, genres, and emails from input strings
    const classes = classesInput.split(',').map(c => c.trim()).filter(c => c.length > 0);
    const genres = genresInput.split(',').map(g => g.trim()).filter(g => g.length > 0);
    // Parse email - if contains semicolon, make it an array, otherwise a string
    let email: string | string[] | undefined;
    if (emailInput.trim()) {
      if (emailInput.includes(';')) {
        const emails = emailInput.split(';').map(e => e.trim()).filter(e => e.length > 0);
        email = emails.length > 0 ? emails : undefined;
      } else {
        email = emailInput.trim() || undefined;
      }
    }

    const dancer: Dancer = {
      id: `dancer-${Date.now()}`,
      name: newDancer.name || `${newDancer.firstName || ''} ${newDancer.lastName || ''}`.trim(),
      firstName: newDancer.firstName || undefined,
      lastName: newDancer.lastName || undefined,
      age: newDancer.age,
      birthday: newDancer.birthday,
      gender: newDancer.gender || undefined,
      phone: newDancer.phone || undefined,
      email: email,
      classes: classes.length > 0 ? classes : undefined,
      level: newDancer.level,
      genres: genres.length > 0 ? genres : undefined
    };

    onSave(dancer);
    resetForm();
    onClose();
  };


  const handleNameChange = (field: 'firstName' | 'lastName', value: string) => {
    setNewDancer(prev => {
      const updated = { ...prev, [field]: value };
      // Auto-generate full name
      const fullName = `${updated.firstName || ''} ${updated.lastName || ''}`.trim();
      if (fullName) {
        updated.name = fullName;
      }
      return updated;
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add New Dancer</h2>
          </div>
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
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
                  value={newDancer.firstName || ''}
                  onChange={(e) => handleNameChange('firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name
                </label>
                <input
                  type="text"
                  value={newDancer.lastName || ''}
                  onChange={(e) => handleNameChange('lastName', e.target.value)}
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
                  value={newDancer.age || ''}
                  onChange={(e) => setNewDancer(prev => ({
                    ...prev,
                    age: e.target.value ? parseInt(e.target.value, 10) : undefined
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Birthday
                </label>
                <input
                  type="date"
                  value={newDancer.birthday || ''}
                  onChange={(e) => setNewDancer(prev => ({
                    ...prev,
                    birthday: e.target.value || undefined
                  }))}
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
                <select
                  value={newDancer.gender || ''}
                  onChange={(e) => setNewDancer(prev => ({
                    ...prev,
                    gender: e.target.value || undefined
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Gender</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-binary">Non-binary</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone
                </label>
                <input
                  type="text"
                  value={newDancer.phone || ''}
                  onChange={(e) => setNewDancer(prev => ({
                    ...prev,
                    phone: e.target.value || undefined
                  }))}
                  placeholder="(416) 555-1234"
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
                value={newDancer.level || ''}
                onChange={(e) => setNewDancer(prev => ({
                  ...prev,
                  level: e.target.value as 'beginner' | 'intermediate' | 'advanced' | undefined
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Level</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>

            {/* Genres */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Genres (comma-separated)
              </label>
              <input
                type="text"
                value={genresInput}
                onChange={(e) => setGenresInput(e.target.value)}
                placeholder="ballet, contemporary, jazz"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              resetForm();
              onClose();
            }}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Add Dancer
          </button>
        </div>
      </div>
    </div>
  );
};

