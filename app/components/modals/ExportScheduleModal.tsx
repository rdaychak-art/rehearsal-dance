'use client';

import React from 'react';
import { X, Download, ChevronDown } from 'lucide-react';
import { Level } from '../../types/routine';

interface ExportScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (from: string, to: string, levelIds: string[]) => void;
}

export const ExportScheduleModal: React.FC<ExportScheduleModalProps> = ({ isOpen, onClose, onExport }) => {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const [fromDate, setFromDate] = React.useState<string>(startOfWeek.toISOString().split('T')[0]);
  const [toDate, setToDate] = React.useState<string>(endOfWeek.toISOString().split('T')[0]);
  const [levels, setLevels] = React.useState<Level[]>([]);
  const [selectedLevelIds, setSelectedLevelIds] = React.useState<string[]>([]);
  const [showLevelDropdown, setShowLevelDropdown] = React.useState(false);

  React.useEffect(() => {
    // Ensure from is not after to
    if (fromDate > toDate) setToDate(fromDate);
  }, [fromDate, toDate]);

  React.useEffect(() => {
    const loadLevels = async () => {
      try {
        const res = await fetch("/api/levels");
        const data = await res.json();
        setLevels(data);
      } catch (e) {
        console.error("Failed to load levels", e);
      }
    };

    // Load levels once when modal opens
    if (isOpen) {
      loadLevels();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Export Schedule</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
        {levels.length > 0 && (
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
              <button
                type="button"
                onClick={() => setShowLevelDropdown(!showLevelDropdown)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between min-h-[42px]"
              >
                <div className="flex flex-wrap gap-1 flex-1">
                  {selectedLevelIds.length === 0 ? (
                    <span className="text-gray-400">All Levels</span>
                  ) : selectedLevelIds.length <= 2 ? (
                    selectedLevelIds
                      .map((levelId) => {
                        const level = levels.find((l) => l.id === levelId);
                        return level ? (
                          <span
                            key={levelId}
                            className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                          >
                            {level.name}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLevelIds(
                                  selectedLevelIds.filter(
                                    (id) => id !== levelId
                                  )
                                );
                              }}
                              className="ml-1 hover:text-blue-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ) : null;
                      })
                      .filter(Boolean)
                  ) : (
                    <span className="text-gray-700">
                      {selectedLevelIds.length} selected
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    showLevelDropdown ? "transform rotate-180" : ""
                  }`}
                />
              </button>

              {showLevelDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowLevelDropdown(false)}
                  />
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {levels.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        No levels available
                      </div>
                    ) : (
                      <>
                        <label className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 sticky top-0 bg-white">
                          <input
                            type="checkbox"
                            checked={
                              selectedLevelIds.length === levels.length &&
                              levels.length > 0
                            }
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedLevelIds(levels.map((l) => l.id));
                              } else {
                                setSelectedLevelIds([]);
                              }
                            }}
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm font-medium text-gray-700">
                            Select All
                          </span>
                        </label>
                        {levels.map((level) => (
                          <label
                            key={level.id}
                            className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedLevelIds.includes(level.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedLevelIds([
                                    ...selectedLevelIds,
                                    level.id,
                                  ]);
                                } else {
                                  setSelectedLevelIds(
                                    selectedLevelIds.filter(
                                      (id) => id !== level.id
                                    )
                                  );
                                }
                              }}
                              className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              {level.name}
                            </span>
                          </label>
                        ))}
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={() => onExport(fromDate, toDate, selectedLevelIds)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};


