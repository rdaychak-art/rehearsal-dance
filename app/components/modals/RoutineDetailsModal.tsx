'use client';

import React, { useState } from 'react';
import { Routine, Teacher, Genre, Level } from '../../types/routine';
import { Loader2 } from 'lucide-react';
import { Dancer } from '../../types/dancer';
import { X, Save, Trash2, Users, Clock, User, Tag, Plus } from 'lucide-react';
import { DancerSelectionModal } from './DancerSelectionModal';
import { ManageTeachersModal } from './ManageTeachersModal';
import { ManageGenresModal } from './ManageGenresModal';
import { ManageLevelsModal } from './ManageLevelsModal';

interface RoutineDetailsModalProps {
  routine: Routine | null;
  dancers: Dancer[];
  teachers: Teacher[];
  genres: Genre[];
  levels: Level[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
  onTeachersChange?: (teachers: Teacher[]) => void;
  onGenresChange?: (genres: Genre[]) => void;
  onLevelsChange?: (levels: Level[]) => void;
  saving?: boolean;
}

export const RoutineDetailsModal: React.FC<RoutineDetailsModalProps> = ({
  routine,
  dancers,
  teachers,
  genres,
  levels,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onTeachersChange,
  onGenresChange,
  onLevelsChange,
  saving = false
}) => {
  const [editedRoutine, setEditedRoutine] = useState<Routine | null>(null);
  const [showDancerSelection, setShowDancerSelection] = useState(false);
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [selectedDancerClasses, setSelectedDancerClasses] = useState<string[]>([]);
  const [selectedDancerName, setSelectedDancerName] = useState<string>('');
  const [showManageTeachers, setShowManageTeachers] = useState(false);
  const [showManageGenres, setShowManageGenres] = useState(false);
  const [showManageLevels, setShowManageLevels] = useState(false);
  const [localTeachers, setLocalTeachers] = useState<Teacher[]>(teachers);
  const [localGenres, setLocalGenres] = useState<Genre[]>(genres);
  const [localLevels, setLocalLevels] = useState<Level[]>(levels);

  React.useEffect(() => {
    if (routine) {
      setEditedRoutine({ ...routine });
    }
  }, [routine]);

  React.useEffect(() => setLocalTeachers(teachers), [teachers]);
  React.useEffect(() => setLocalGenres(genres), [genres]);
  React.useEffect(() => setLocalLevels(levels), [levels]);

  if (!isOpen || !editedRoutine) return null;

  // Check if this is a new routine (temp ID starting with 'routine-')
  const isNewRoutine = editedRoutine.id.startsWith('routine-');

  const handleSave = () => {
    onSave(editedRoutine);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this routine?')) {
      onDelete(editedRoutine.id);
      onClose();
    }
  };

  const handleDancerSelection = (selectedDancerIds: string[]) => {
    setEditedRoutine(prev => {
      if (!prev) return prev;
      
      const selectedDancers = dancers.filter(d => selectedDancerIds.includes(d.id));
      return {
        ...prev,
        dancers: selectedDancers
      };
    });
  };

  const removeDancer = (dancerId: string) => {
    setEditedRoutine(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        dancers: prev.dancers.filter(d => d.id !== dancerId)
      };
    });
  };

  const formatBirthday = (birthday?: string) => {
    if (!birthday) return '-';
    try {
      const date = new Date(birthday);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return birthday;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Routine Details</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-170px)]">
          <div className="space-y-6">
            {/* Song Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Song Title
              </label>
              <input
                type="text"
                value={editedRoutine.songTitle}
                onChange={(e) => setEditedRoutine(prev => 
                  prev ? { ...prev, songTitle: e.target.value } : prev
                )}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
              />
            </div>

            {/* Teacher and Genre */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Teacher
                </label>
                <div className="flex gap-2">
                <select
                  value={editedRoutine.teacher.id}
                  onChange={(e) => {
                    const teacher = localTeachers.find(t => t.id === e.target.value);
                    if (teacher) {
                      setEditedRoutine(prev => 
                        prev ? { ...prev, teacher } : prev
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  {localTeachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" onClick={() => setShowManageTeachers(true)}>
                  Manage
                </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Genre
                </label>
                <div className="flex gap-2">
                <select
                  value={editedRoutine.genre.id}
                  onChange={(e) => {
                    const genre = localGenres.find(g => g.id === e.target.value);
                    if (genre) {
                      setEditedRoutine(prev => 
                        prev ? { ...prev, genre, color: genre.color } : prev
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  {localGenres.map(genre => (
                    <option key={genre.id} value={genre.id}>
                      {genre.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" onClick={() => setShowManageGenres(true)}>
                  Manage
                </button>
                </div>
              </div>
            </div>

            {/* Duration and Level */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  value={editedRoutine.duration}
                  onChange={(e) => setEditedRoutine(prev => 
                    prev ? { ...prev, duration: parseInt(e.target.value) || 0 } : prev
                  )}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder-gray-400"
                  min="15"
                  max="240"
                  step="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <div className="flex gap-2">
                <select
                  key={`level-select-${localLevels.length}-${localLevels.map(l => l.id).join(',')}`}
                  value={editedRoutine.level?.id || ''}
                  onChange={(e) => {
                    const level = localLevels.find(l => l.id === e.target.value);
                    if (level) {
                      setEditedRoutine(prev => 
                        prev ? { ...prev, level } : prev
                      );
                    } else {
                      setEditedRoutine(prev => 
                        prev ? { ...prev, level: undefined } : prev
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-gray-900"
                >
                  <option value="">Select Level</option>
                  {localLevels.map(level => (
                    <option key={level.id} value={level.id}>
                      {level.name}
                    </option>
                  ))}
                </select>
                <button type="button" className="px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50" onClick={() => setShowManageLevels(true)}>
                  Manage
                </button>
                </div>
              </div>
            </div>

            {/* Dancers */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  <Users className="w-4 h-4 inline mr-1" />
                  Dancers ({editedRoutine.dancers.length} selected)
                </label>
                <button
                  type="button"
                  onClick={() => setShowDancerSelection(true)}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Select
                </button>
              </div>
              
              {editedRoutine.dancers.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-8 text-center text-gray-500">
                  No dancers selected. Click &quot;Select&quot; to add dancers to this routine.
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="overflow-x-auto max-h-80 overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            First Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Name
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Age
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Birthday
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Gender
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                            Classes
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Primary Phone
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {editedRoutine.dancers.map((dancer) => (
                          <tr key={dancer.id} className="hover:bg-gray-50">
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {dancer.firstName || dancer.name.split(' ')[0] || '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {dancer.lastName || dancer.name.split(' ').slice(1).join(' ') || '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {dancer.age ?? '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {formatBirthday(dancer.birthday)}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {dancer.gender || '-'}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 min-w-[300px]">
                              <div className="flex flex-wrap gap-1">
                                {dancer.classes && dancer.classes.length > 0 ? (
                                  <>
                                    {dancer.classes.slice(0, 3).map((cls, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-block px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs"
                                      >
                                        {cls}
                                      </span>
                                    ))}
                                    {dancer.classes.length > 3 && (
                                      <button
                                        onClick={() => {
                                          setSelectedDancerClasses(dancer.classes || []);
                                          setSelectedDancerName(dancer.name);
                                          setShowClassesModal(true);
                                        }}
                                        className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium hover:bg-blue-200 transition-colors cursor-pointer"
                                        title="View all classes"
                                      >
                                        +{dancer.classes.length - 3} more
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  '-'
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {dancer.email 
                                ? (Array.isArray(dancer.email) ? dancer.email.join('; ') : dancer.email)
                                : '-'
                              }
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                              {dancer.phone || '-'}
                            </td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">
                              <button
                                type="button"
                                onClick={() => removeDancer(dancer.id)}
                                className="text-red-600 hover:text-red-800 transition-colors"
                                title="Remove dancer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Inactive Status */}
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <input
                type="checkbox"
                id="isInactive"
                checked={editedRoutine.isInactive || false}
                onChange={(e) => setEditedRoutine(prev => 
                  prev ? { ...prev, isInactive: e.target.checked } : prev
                )}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isInactive" className="flex-1 cursor-pointer">
                <span className="block text-sm font-medium text-gray-700">
                  Mark as inactive
                </span>
                <span className="block text-xs text-gray-500 mt-1">
                  Inactive routines are greyed out and moved to the bottom of the list
                </span>
              </label>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={editedRoutine.notes || ''}
                onChange={(e) => setEditedRoutine(prev => 
                  prev ? { ...prev, notes: e.target.value } : prev
                )}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-400"
                placeholder="Add any notes about this routine..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          {!isNewRoutine && (
            <button
              onClick={handleDelete}
              disabled={saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${saving ? 'opacity-60 cursor-not-allowed text-red-300' : 'text-red-600 hover:bg-red-50'}`}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
          )}
          {isNewRoutine && <div />}
          
          <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className={`px-4 py-2 rounded-lg transition-colors ${saving ? 'opacity-60 cursor-not-allowed bg-gray-100 text-gray-400' : 'text-gray-600 hover:bg-gray-100'}`}
          >
              Cancel
            </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${saving ? 'bg-blue-400 cursor-wait' : 'bg-blue-600 hover:bg-blue-700'} text-white`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {saving ? 'Saving...' : isNewRoutine ? 'Add Routine' : 'Save Changes'}
          </button>
          </div>
        </div>
      </div>

      {/* Dancer Selection Modal */}
      <DancerSelectionModal
        dancers={dancers}
        selectedDancers={editedRoutine.dancers}
        isOpen={showDancerSelection}
        onClose={() => setShowDancerSelection(false)}
        onApply={handleDancerSelection}
      />

      {/* Manage Teachers */}
      <ManageTeachersModal
        isOpen={showManageTeachers}
        teachers={localTeachers}
        onClose={() => setShowManageTeachers(false)}
        onChange={(next) => {
          const updatedTeachers = next as unknown as Teacher[];
          setLocalTeachers(updatedTeachers);
          // Update parent state to reflect changes across the app
          onTeachersChange?.(updatedTeachers);
          // If current selection was deleted, align to first item
          if (!next.find(t => t.id === editedRoutine.teacher.id) && next.length > 0) {
            const newTeacher = next[0] as unknown as Teacher;
            setEditedRoutine(prev => (prev ? { ...prev, teacher: newTeacher } : prev));
          }
        }}
      />

      {/* Manage Genres */}
      <ManageGenresModal
        isOpen={showManageGenres}
        genres={localGenres}
        onClose={() => setShowManageGenres(false)}
        onChange={(next) => {
          const updatedGenres = next as unknown as Genre[];
          setLocalGenres(updatedGenres);
          // Update parent state to reflect changes across the app
          onGenresChange?.(updatedGenres);
          if (!next.find(g => g.id === editedRoutine.genre.id) && next.length > 0) {
            const newGenre = next[0] as unknown as Genre;
            setEditedRoutine(prev => (prev ? { ...prev, genre: newGenre, color: newGenre.color } : prev));
          }
        }}
      />

      {/* Manage Levels */}
      <ManageLevelsModal
        isOpen={showManageLevels}
        levels={localLevels}
        onClose={() => setShowManageLevels(false)}
        onChange={(next) => {
          const updatedLevels = next as unknown as Level[];
          setLocalLevels(updatedLevels);
          // Update parent state to reflect changes across the app
          onLevelsChange?.(updatedLevels);
          // Ensure React re-renders the select by updating localLevels
          if (editedRoutine.level && !updatedLevels.find(l => l.id === editedRoutine.level?.id)) {
            setEditedRoutine(prev => (prev ? { ...prev, level: undefined } : prev));
          }
        }}
      />

      {/* Classes Modal */}
      {showClassesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Classes - {selectedDancerName}
              </h2>
              <button
                onClick={() => {
                  setShowClassesModal(false);
                  setSelectedDancerClasses([]);
                  setSelectedDancerName('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              <div className="flex flex-wrap gap-2">
                {selectedDancerClasses.map((cls, idx) => (
                  <span
                    key={idx}
                    className="inline-block px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm"
                  >
                    {cls}
                  </span>
                ))}
              </div>
              {selectedDancerClasses.length === 0 && (
                <p className="text-gray-500">No classes assigned.</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  setShowClassesModal(false);
                  setSelectedDancerClasses([]);
                  setSelectedDancerName('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
