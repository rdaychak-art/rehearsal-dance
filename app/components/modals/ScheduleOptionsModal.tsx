'use client';

import React, { useState } from 'react';
import { Routine } from '../../types/routine';
import { X, Calendar, Repeat } from 'lucide-react';
import { formatTime } from '../../utils/timeUtils';

interface ScheduleOptionsModalProps {
  routine: Routine;
  timeSlot: { hour: number; minute: number; day: number; roomId: string; date: string };
  roomName: string;
  isOpen: boolean;
  onConfirm: (options: { isRecurring: boolean; weeks: number; endDate?: string }) => void;
  onCancel: () => void;
}

export const ScheduleOptionsModal: React.FC<ScheduleOptionsModalProps> = ({
  routine,
  timeSlot,
  roomName,
  isOpen,
  onConfirm,
  onCancel
}) => {
  const [isRecurring, setIsRecurring] = useState(false);
  const [weeks, setWeeks] = useState(12);
  const [endDate, setEndDate] = useState('');

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm({
      isRecurring,
      weeks,
      endDate: endDate || undefined
    });
  };

  const handleCancel = () => {
    setIsRecurring(false);
    setWeeks(12);
    setEndDate('');
    onCancel();
  };

  // Calculate default end date (12 weeks from start date)
  const startDate = new Date(timeSlot.date);
  const defaultEndDate = new Date(startDate);
  defaultEndDate.setDate(defaultEndDate.getDate() + (weeks * 7) - 7); // 12 weeks later
  const defaultEndDateStr = defaultEndDate.toISOString().split('T')[0];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
          <div className="p-2 bg-blue-100 rounded-full">
            <Calendar className="w-5 h-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">Schedule Rehearsal</h2>
            <p className="text-sm text-gray-600">{routine.songTitle}</p>
          </div>
          <button
            onClick={handleCancel}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Time and Room Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 mb-1">Room</div>
                  <div className="font-medium text-gray-900">{roomName}</div>
                </div>
                <div>
                  <div className="text-gray-600 mb-1">Time</div>
                  <div className="font-medium text-gray-900">
                    {new Date(timeSlot.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {formatTime(timeSlot.hour, timeSlot.minute)}
                  </div>
                </div>
              </div>
            </div>

            {/* Recurring Option */}
            <div className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                id="recurring"
                checked={isRecurring}
                onChange={(e) => setIsRecurring(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <div className="flex-1">
                <label htmlFor="recurring" className="flex items-center gap-2 cursor-pointer">
                  <Repeat className="w-4 h-4 text-gray-600" />
                  <span className="font-medium text-gray-900">Recur every week</span>
                </label>
                <p className="text-sm text-gray-600 mt-1">
                  Block off this time slot every week for unavailable studios
                </p>
              </div>
            </div>

            {/* Recurring Options */}
            {isRecurring && (
              <div className="ml-7 space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <label htmlFor="weeks" className="block text-sm font-medium text-gray-700 mb-2">
                    Number of weeks
                  </label>
                  <input
                    type="number"
                    id="weeks"
                    min="1"
                    max="52"
                    value={weeks}
                    onChange={(e) => setWeeks(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This will create {weeks} scheduled rehearsal{weeks !== 1 ? 's' : ''} (one per week)
                  </p>
                </div>

                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    End date (optional)
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate || defaultEndDateStr}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={timeSlot.date}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Leave empty to use number of weeks instead
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isRecurring ? `Schedule ${weeks} Weeks` : 'Schedule Once'}
          </button>
        </div>
      </div>
    </div>
  );
};

