'use client';

import React, { useState } from 'react';
import { Routine, Teacher, Genre } from '../../types/routine';
import { Dancer } from '../../types/dancer';
import { X, Save, Trash2, Users, Clock, User, Tag, Plus } from 'lucide-react';
import { DancerSelectionModal } from './DancerSelectionModal';

interface RoutineDetailsModalProps {
  routine: Routine | null;
  dancers: Dancer[];
  teachers: Teacher[];
  genres: Genre[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (routine: Routine) => void;
  onDelete: (routineId: string) => void;
}

export const RoutineDetailsModal: React.FC<RoutineDetailsModalProps> = ({
  routine,
  dancers,
  teachers,
  genres,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [editedRoutine, setEditedRoutine] = useState<Routine | null>(null);
  const [showDancerSelection, setShowDancerSelection] = useState(false);
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [selectedDancerClasses, setSelectedDancerClasses] = useState<string[]>([]);
  const [selectedDancerName, setSelectedDancerName] = useState<string>('');

  React.useEffect(() => {
    if (routine) {
      setEditedRoutine({ ...routine });
    }
  }, [routine]);

  if (!isOpen || !editedRoutine) return null;

  const handleSave = () => {
    onSave(editedRoutine);
    onClose();
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
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Teacher and Genre */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Teacher
                </label>
                <select
                  value={editedRoutine.teacher.id}
                  onChange={(e) => {
                    const teacher = teachers.find(t => t.id === e.target.value);
                    if (teacher) {
                      setEditedRoutine(prev => 
                        prev ? { ...prev, teacher } : prev
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {teachers.map(teacher => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Tag className="w-4 h-4 inline mr-1" />
                  Genre
                </label>
                <select
                  value={editedRoutine.genre.id}
                  onChange={(e) => {
                    const genre = genres.find(g => g.id === e.target.value);
                    if (genre) {
                      setEditedRoutine(prev => 
                        prev ? { ...prev, genre, color: genre.color } : prev
                      );
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {genres.map(genre => (
                    <option key={genre.id} value={genre.id}>
                      {genre.name}
                    </option>
                  ))}
                </select>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="15"
                  max="240"
                  step="15"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Level
                </label>
                <select
                  value={editedRoutine.level || ''}
                  onChange={(e) => setEditedRoutine(prev => 
                    prev ? { ...prev, level: e.target.value || undefined } : prev
                  )}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any notes about this routine..."
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
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
