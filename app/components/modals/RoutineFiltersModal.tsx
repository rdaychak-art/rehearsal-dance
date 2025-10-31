'use client';

import React from 'react';
import { X, Filter, ArrowUpAZ, ArrowDownAZ } from 'lucide-react';

export interface RoutineFiltersModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedGenre: string;
  selectedTeacher: string;
  selectedLevel: string;
  hideInactive: boolean;
  sortOrder: 'A-Z' | 'Z-A' | 'none';
  uniqueGenres: string[];
  uniqueTeachers: string[];
  uniqueLevels: string[];
  onGenreChange: (genre: string) => void;
  onTeacherChange: (teacher: string) => void;
  onLevelChange: (level: string) => void;
  onHideInactiveChange: (hide: boolean) => void;
  onSortOrderChange: (order: 'A-Z' | 'Z-A' | 'none') => void;
}

export const RoutineFiltersModal: React.FC<RoutineFiltersModalProps> = ({
  isOpen,
  onClose,
  selectedGenre,
  selectedTeacher,
  selectedLevel,
  hideInactive,
  sortOrder,
  uniqueGenres,
  uniqueTeachers,
  uniqueLevels,
  onGenreChange,
  onTeacherChange,
  onLevelChange,
  onHideInactiveChange,
  onSortOrderChange,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">Filter Routines</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Genre</label>
              <select
                value={selectedGenre}
                onChange={(e) => onGenreChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Genres</option>
                {uniqueGenres.map(genre => (
                  <option key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teacher</label>
              <select
                value={selectedTeacher}
                onChange={(e) => onTeacherChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Teachers</option>
                {uniqueTeachers.map(teacher => (
                  <option key={teacher} value={teacher}>{teacher}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
              <select
                value={selectedLevel}
                onChange={(e) => onLevelChange(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Levels</option>
                {uniqueLevels.map(level => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
            </div>

            <div className="pt-4 border-t border-gray-200 space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hideInactive}
                  onChange={(e) => onHideInactiveChange(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">Hide inactive routines</span>
              </label>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort Order</label>
                <button
                  onClick={() => {
                    // Cycle through: A-Z -> Z-A -> none -> A-Z
                    if (sortOrder === 'A-Z') {
                      onSortOrderChange('Z-A');
                    } else if (sortOrder === 'Z-A') {
                      onSortOrderChange('none');
                    } else {
                      onSortOrderChange('A-Z');
                    }
                  }}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                    sortOrder !== 'none'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {sortOrder === 'A-Z' ? (
                    <>
                      <ArrowUpAZ className="w-4 h-4" />
                      <span>Sort A-Z</span>
                    </>
                  ) : sortOrder === 'Z-A' ? (
                    <>
                      <ArrowDownAZ className="w-4 h-4" />
                      <span>Sort Z-A</span>
                    </>
                  ) : (
                    <>
                      <ArrowUpAZ className="w-4 h-4" />
                      <span>Unsorted</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

