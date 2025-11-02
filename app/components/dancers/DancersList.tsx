'use client';

import React, { useState, useMemo } from 'react';
import { Dancer } from '../../types/dancer';
import { ScheduledRoutine, Room } from '../../types/schedule';
import { getDancerSchedules } from '../../utils/dancerUtils';
import { Search, ChevronDown, ChevronRight, Calendar, X, Edit, Upload, Plus, Trash2 } from 'lucide-react';

interface DancersListProps {
  dancers: Dancer[];
  scheduledRoutines: ScheduledRoutine[];
  rooms: Room[];
  onClose?: () => void;
  onEditDancer?: (dancer: Dancer) => void;
  onDeleteDancer?: (dancerId: string) => void;
  onBatchDeleteDancers?: (dancerIds: string[]) => void;
  onAddDancer?: () => void;
  onImportCsv?: () => void;
}

export const DancersList: React.FC<DancersListProps> = ({
  dancers,
  scheduledRoutines,
  rooms,
  onClose,
  onEditDancer,
  onDeleteDancer,
  onBatchDeleteDancers,
  onAddDancer,
  onImportCsv
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClasses, setFilterClasses] = useState<string[]>([]);
  const [showClassDropdown, setShowClassDropdown] = useState(false);
  const [expandedDancers, setExpandedDancers] = useState<Set<string>>(new Set());
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [selectedDancerClasses, setSelectedDancerClasses] = useState<string[]>([]);
  const [selectedDancerName, setSelectedDancerName] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleExpand = (dancerId: string) => {
    setExpandedDancers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dancerId)) {
        newSet.delete(dancerId);
      } else {
        newSet.add(dancerId);
      }
      return newSet;
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

  // Get unique values for filters
  const classes = useMemo(() => {
    const classSet = new Set<string>();
    dancers.forEach(d => {
      if (d.classes && d.classes.length > 0) {
        d.classes.forEach(cls => classSet.add(cls));
      }
    });
    return Array.from(classSet).sort();
  }, [dancers]);

  // Filter and search dancers
  const filteredDancers = useMemo(() => {
    return dancers.filter(dancer => {
      // Search filter
      const emailStr = dancer.email 
        ? (Array.isArray(dancer.email) ? dancer.email.join('; ') : dancer.email)
        : '';
      const matchesSearch = searchTerm === '' ||
        dancer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dancer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        emailStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dancer.name.toLowerCase().includes(searchTerm.toLowerCase());

      // Class filter
      const matchesClass = filterClasses.length === 0 ||
        (dancer.classes && dancer.classes.some(cls => filterClasses.includes(cls)));

      return matchesSearch && matchesClass;
    });
  }, [dancers, searchTerm, filterClasses]);

  const allVisibleSelected = useMemo(() =>
    filteredDancers.length > 0 && filteredDancers.every(d => selectedIds.has(d.id))
  , [filteredDancers, selectedIds]);

  const toggleSelectAllVisible = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        filteredDancers.forEach(d => next.delete(d.id));
      } else {
        filteredDancers.forEach(d => next.add(d.id));
      }
      return next;
    });
  };

  return (
    <div className="flex-1 bg-white flex flex-col" style={{ height: '100%' }}>
      {/* Header */}
      <div className="border-b border-gray-200 p-6 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-gray-600" />
            <h1 className="text-2xl font-semibold text-gray-900">Dancers</h1>
          </div>
          <div className="flex items-center gap-2">
            {onBatchDeleteDancers && selectedIds.size > 0 && (
              <button
                onClick={() => {
                  const ids = Array.from(selectedIds);
                  const count = ids.length;
                  const confirmed = window.confirm(`Delete ${count} selected dancer${count > 1 ? 's' : ''}? This cannot be undone.`);
                  if (!confirmed) return;
                  onBatchDeleteDancers(ids);
                  setSelectedIds(new Set());
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete Selected ({selectedIds.size})
              </button>
            )}
            {onAddDancer && (
              <button
                onClick={onAddDancer}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Dancer
              </button>
            )}
            {onImportCsv && (
              <button
                onClick={onImportCsv}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Back to Calendar
              </button>
            )}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            {/* <label className="block text-xs font-medium text-gray-700 mb-1">
              Filter by Classes
            </label> */}
            <button
              type="button"
              onClick={() => setShowClassDropdown(!showClassDropdown)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-left flex items-center justify-between min-h-[42px]"
            >
              <div className="flex flex-wrap gap-1 flex-1">
                {filterClasses.length === 0 ? (
                  <span className="text-gray-400">All Classes</span>
                ) : filterClasses.length <= 2 ? (
                  filterClasses.map(cls => (
                    <span
                      key={cls}
                      className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      {cls}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFilterClasses(filterClasses.filter(c => c !== cls));
                        }}
                        className="ml-1 hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))
                ) : (
                  <span className="text-gray-700">
                    {filterClasses.length} selected
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${showClassDropdown ? 'transform rotate-180' : ''}`} />
            </button>
            
            {showClassDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowClassDropdown(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                  {classes.length === 0 ? (
                    <div className="p-3 text-sm text-gray-500">No classes available</div>
                  ) : (
                    <>
                      <label className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer border-b border-gray-200 sticky top-0 bg-white">
                        <input
                          type="checkbox"
                          checked={filterClasses.length === classes.length && classes.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFilterClasses([...classes]);
                            } else {
                              setFilterClasses([]);
                            }
                          }}
                          className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-gray-700">Select All</span>
                      </label>
                      {classes.map(cls => (
                        <label key={cls} className="flex items-center py-2 px-3 hover:bg-gray-50 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterClasses.includes(cls)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setFilterClasses([...filterClasses, cls]);
                              } else {
                                setFilterClasses(filterClasses.filter(c => c !== cls));
                              }
                            }}
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-700">{cls}</span>
                        </label>
                      ))}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing {filteredDancers.length} of {dancers.length} dancers
        </div>
      </div>

      {/* Dancers Table */}
      <div className="flex-1 overflow-auto bg-white">
        {!dancers || dancers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p className="mb-4">No dancers available.</p>
            <p className="text-sm text-gray-400">Use the buttons above to add dancers manually or import from CSV.</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                {onBatchDeleteDancers && (
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAllVisible}
                  />
                )}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Age</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Birthday</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gender</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Classes</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Schedule</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredDancers.map((dancer) => {
              const isExpanded = expandedDancers.has(dancer.id);
              const schedules = getDancerSchedules(dancer.id, scheduledRoutines, rooms);

              return (
                <React.Fragment key={dancer.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {onBatchDeleteDancers && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(dancer.id)}
                          onChange={() => toggleSelectOne(dancer.id)}
                        />
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleExpand(dancer.id)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        disabled={schedules.length === 0}
                      >
                        {schedules.length > 0 ? (
                          isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-600" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-600" />
                          )
                        ) : (
                          <span className="w-4 h-4 inline-block"></span>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {dancer.name}
                      {dancer.firstName && dancer.lastName && (
                        <span className="block text-xs text-gray-500">
                          {dancer.firstName} {dancer.lastName}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {Array.isArray(dancer.email) 
                        ? dancer.email.join('; ')
                        : dancer.email || '-'
                      }
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dancer.phone || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dancer.age ?? '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatBirthday(dancer.birthday)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {dancer.gender || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 min-w-[300px]">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {schedules.length > 0 ? (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                          {schedules.length} scheduled
                        </span>
                      ) : (
                        <span className="text-gray-400">No schedule</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {onEditDancer && (
                        <button
                          onClick={() => onEditDancer(dancer)}
                          className="p-1 hover:bg-blue-100 rounded transition-colors text-blue-600"
                          title="Edit dancer"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {onDeleteDancer && (
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${dancer.name}? This action cannot be undone.`)) {
                              onDeleteDancer(dancer.id);
                            }
                          }}
                          className="p-1 hover:bg-red-100 rounded transition-colors text-red-600"
                          title="Delete dancer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && schedules.length > 0 && (
                    <tr>
                      <td colSpan={13} className="px-6 py-4 bg-gray-50">
                        <div className="ml-6">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3">
                            Scheduled Routines ({schedules.length})
                          </h4>
                          <div className="space-y-2">
                            {schedules.map((schedule) => (
                              <div
                                key={schedule.scheduledRoutineId}
                                className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
                              >
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-500">Routine:</span>
                                    <p className="font-medium text-gray-900">{schedule.songTitle}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Date:</span>
                                    <p className="font-medium text-gray-900">
                                      {schedule.formattedDate} ({schedule.dayName})
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Time:</span>
                                    <p className="font-medium text-gray-900">
                                      {schedule.startTime} - {schedule.endTime}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Room:</span>
                                    <p className="font-medium text-gray-900">{schedule.roomName}</p>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Duration:</span>
                                    <p className="font-medium text-gray-900">{schedule.duration} min</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        )}
        {filteredDancers.length === 0 && dancers.length > 0 && (
          <div className="text-center py-12 text-gray-500">
            No dancers found matching your search criteria.
          </div>
        )}
      </div>

      {/* Classes Modal */}
      {showClassesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
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

