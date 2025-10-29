'use client';

import React from 'react';
import { Conflict } from '../../types/schedule';
import { AlertTriangle, X, CheckCircle } from 'lucide-react';

interface ConflictWarningModalProps {
  conflicts: Conflict[];
  isOpen: boolean;
  onResolve: () => void;
  onDismiss: () => void;
}

export const ConflictWarningModal: React.FC<ConflictWarningModalProps> = ({
  conflicts,
  isOpen,
  onResolve,
  onDismiss
}) => {
  if (!isOpen || conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
          <div className="p-2 bg-red-100 rounded-full">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scheduling Conflict</h2>
            <p className="text-sm text-gray-600">Some dancers are double-booked</p>
          </div>
          <button
            onClick={onDismiss}
            className="ml-auto p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-4">
            {conflicts.map((conflict, index) => (
              <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <div className="p-1 bg-red-100 rounded-full mt-0.5">
                    <AlertTriangle className="w-3 h-3 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-red-900">
                      {conflict.dancerName}
                    </div>
                    <div className="text-sm text-red-700 mt-1">
                      Already scheduled in:
                    </div>
                    <ul className="text-sm text-red-600 mt-1 space-y-1">
                      {conflict.conflictingRoutines.map((routine, idx) => (
                        <li key={idx} className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-red-400 rounded-full"></span>
                          <span className="font-medium">{routine.routineTitle}</span>
                          <span className="text-red-500">in {routine.studioName}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Warning:</strong> Scheduling this routine will create conflicts. 
                Consider rescheduling or removing conflicting dancers.
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onDismiss}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onResolve}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <CheckCircle className="w-4 h-4" />
            Schedule Anyway
          </button>
        </div>
      </div>
    </div>
  );
};
