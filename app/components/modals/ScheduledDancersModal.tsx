'use client';

import React, { useState } from 'react';
import { ScheduledRoutine } from '../../types/schedule';
import { X, Users, Calendar, Clock, Music } from 'lucide-react';
import { formatTime } from '../../utils/timeUtils';

interface ScheduledDancersModalProps {
  scheduledRoutine: ScheduledRoutine | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDuration?: (id: string, minutes: number) => void;
}

export const ScheduledDancersModal: React.FC<ScheduledDancersModalProps> = ({
  scheduledRoutine,
  isOpen,
  onClose,
  onUpdateDuration,
}) => {
  // Hooks must be declared unconditionally
  const [localDuration, setLocalDuration] = useState<number>(scheduledRoutine?.duration ?? 0);
  React.useEffect(() => {
    if (scheduledRoutine) setLocalDuration(scheduledRoutine.duration);
  }, [scheduledRoutine]);

  if (!isOpen || !scheduledRoutine) return null;

  const routine = scheduledRoutine.routine;
  const dancers = routine.dancers;

  const formatBirthday = (birthday?: string) => {
    if (!birthday) return '-';
    try {
      const date = new Date(birthday);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return birthday;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      // Parse date string (YYYY-MM-DD) in local timezone to avoid UTC shift
      const [year, month, day] = dateString.split('-').map(Number);
      const date = new Date(year, month - 1, day, 0, 0, 0, 0);
      return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Music className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{routine.songTitle}</h2>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(scheduledRoutine.date)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>
                    {formatTime(scheduledRoutine.startTime.hour, scheduledRoutine.startTime.minute)} - {' '}
                    {formatTime(scheduledRoutine.endTime.hour, scheduledRoutine.endTime.minute)}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Duration Editor */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="flex items-end justify-between gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Rehearsal duration (minutes)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    value={localDuration}
                    onChange={(e) => setLocalDuration(Math.max(1, Number(e.target.value || 0)))}
                    className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                      onClick={() => setLocalDuration((d) => Math.max(1, d - 15))}
                    >-15</button>
                    <button
                      type="button"
                      className="px-2 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100"
                      onClick={() => setLocalDuration((d) => d + 15)}
                    >+15</button>
                  </div>
                </div>
              </div>
              <div>
                <button
                  type="button"
                  onClick={() => onUpdateDuration && onUpdateDuration(scheduledRoutine.id, localDuration)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={!onUpdateDuration || localDuration < 1}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>

          {/* Routine Info */}
          <div className="mb-6 pb-4 border-b border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Teacher:</span>
                <span className="ml-2 font-medium text-gray-900">{routine.teacher.name}</span>
              </div>
              <div>
                <span className="text-gray-500">Genre:</span>
                <span className="ml-2 font-medium text-gray-900">{routine.genre.name}</span>
              </div>
              {routine.level && (
                <div>
                  <span className="text-gray-500">Level:</span>
                  <span className="ml-2 font-medium text-gray-900">{routine.level.name}</span>
                </div>
              )}
              <div>
                <span className="text-gray-500">Duration:</span>
                <span className="ml-2 font-medium text-gray-900">{routine.duration} minutes</span>
              </div>
            </div>
          </div>

          {/* Scheduled Dancers */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Scheduled Dancers ({dancers.length})
              </h3>
            </div>

            {dancers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No dancers scheduled for this routine</p>
              </div>
            ) : (
              <div className="space-y-3">
                {dancers.map((dancer) => (
                  <div
                    key={dancer.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {dancer.avatar ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={dancer.avatar}
                            alt={dancer.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <span className="text-blue-600 font-medium">
                              {dancer.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{dancer.name}</div>
                          <div className="text-sm text-gray-500 space-x-3">
                            {dancer.age && <span>Age: {dancer.age}</span>}
                            {dancer.birthday && (
                              <span>Birthday: {formatBirthday(dancer.birthday)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm text-gray-600">
                      {dancer.email && (
                        <div className="text-xs">
                          {Array.isArray(dancer.email) ? dancer.email.join('; ') : dancer.email}
                        </div>
                      )}
                      {dancer.phone && (
                        <div className="text-xs">{dancer.phone}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

