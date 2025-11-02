'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { Dancer } from '../../types/dancer';
import { ScheduledRoutine } from '../../types/schedule';
import { Level } from '../../types/routine';
import { X, Mail, Download, Copy, Check, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { formatTime, getDayName } from '../../utils/timeUtils';
import { toast } from 'react-hot-toast';

interface EmailScheduleModalProps {
  dancers: Dancer[];
  scheduledRoutines: ScheduledRoutine[];
  isOpen: boolean;
  onClose: () => void;
}

export const EmailScheduleModal: React.FC<EmailScheduleModalProps> = ({
  dancers,
  scheduledRoutines,
  isOpen,
  onClose
}) => {
  const [selectedDancers, setSelectedDancers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  type Preset = 'this_week' | 'next_week' | 'this_month' | 'custom';
  const [preset, setPreset] = useState<Preset>('this_week');
  const [from, setFrom] = useState<string>('');
  const [to, setTo] = useState<string>('');
  const [isSending, setIsSending] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);
  
  // Sorting state
  type SortField = 'firstName' | 'lastName' | 'age' | 'email' | 'phone' | 'name';
  type SortDirection = 'asc' | 'desc';
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  useEffect(() => {
    const loadLevels = async () => {
      try {
        const res = await fetch('/api/levels');
        const data = await res.json();
        setLevels(data);
      } catch (e) {
        console.error('Failed to load levels', e);
      }
    };
    loadLevels();
  }, []);

  const selectedDancerData = selectedDancers.length === 1 ? dancers.find(d => d.id === selectedDancers[0]) : undefined;
  
  const getDancerSchedule = (dancerId: string) => {
    return scheduledRoutines.filter(routine =>
      routine.routine.dancers.some(dancer => dancer.id === dancerId)
    );
  };

  const formatScheduleText = (dancer: Dancer, routines: ScheduledRoutine[]) => {
    const scheduleText = `
Hi ${dancer.name},

Here's your rehearsal schedule for this week:

${routines.length === 0 ? 'No rehearsals scheduled this week.' : routines.map(routine => {
  // Parse date string (YYYY-MM-DD) in local timezone to avoid UTC shift
  const [year, month, day] = routine.date.split('-').map(Number);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);
  const formattedDate = date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  const startTime = formatTime(routine.startTime.hour, routine.startTime.minute);
  const endTime = formatTime(routine.endTime.hour, routine.endTime.minute);
  
  return `${formattedDate} - ${startTime} to ${endTime}
  Routine: ${routine.routine.songTitle}
  Room: ${routine.roomId}
  Teacher: ${routine.routine.teacher.name}`;
}).join('\n\n')}

Please arrive 10 minutes early for warm-up.

Sincerely, Performing Dance Arts.
    `.trim();

    return scheduleText;
  };

  const handleCopyToClipboard = async () => {
    if (!selectedDancerData) return;
    
    // Use the filtered routines (already computed in useMemo)
    const scheduleText = formatScheduleText(selectedDancerData, routines);
    
    try {
      await navigator.clipboard.writeText(scheduleText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedDancerData) return;
    
    // Use the filtered routines (already computed in useMemo)
    const scheduleText = formatScheduleText(selectedDancerData, routines);
    
    // Create a simple text file download
    const blob = new Blob([scheduleText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedDancerData.name}_schedule.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  interface PostBody {
    dancerIds: string[];
    preset?: Exclude<Preset, 'custom'>;
    from?: string;
    to?: string;
    levelIds?: string[];
  }

  const handleSendEmail = async () => {
    if (selectedDancers.length === 0) return;
    try {
      setIsSending(true);
      const payload: PostBody = { dancerIds: selectedDancers };
      if (selectedLevelIds.length > 0) {
        payload.levelIds = selectedLevelIds;
      }
      if (preset === 'this_week' || preset === 'this_month') {
        payload.preset = preset === 'this_week' ? 'this_week' : 'this_month';
      } else if (preset === 'next_week') {
        payload.preset = 'next_week';
      } else if (preset === 'custom') {
        if (!from && !to) {
          toast.error('Choose a from/to date or select a preset');
          setIsSending(false);
          return;
        }
        if (from) payload.from = from;
        if (to) payload.to = to;
      }

      const res = await fetch('/api/email/dancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || 'Failed to send');
      }
      const data = (await res.json().catch(() => ({}))) as { 
        results?: { id: string; status: 'sent' | 'skipped'; reason?: string }[];
        teacherResults?: { teacherId: string; status: 'sent' | 'skipped'; reason?: string }[];
      };
      const sent = (data?.results || []).filter((r) => r.status === 'sent').length;
      const skipped = (data?.results || []).length - sent;
      const teacherSent = (data?.teacherResults || []).filter((r) => r.status === 'sent').length;
      const teacherSkipped = (data?.teacherResults || []).length - teacherSent;
      
      let message = `Emails sent: ${sent}${skipped ? `, skipped: ${skipped}` : ''}`;
      if (teacherSent > 0 || teacherSkipped > 0) {
        message += ` | Teachers: ${teacherSent}${teacherSkipped ? `, skipped: ${teacherSkipped}` : ''}`;
      }
      toast.success(message);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send email';
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const toISODate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const computePresetRange = (p: Preset) => {
    const now = new Date();
    if (p === 'this_week') {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day;
      start.setHours(0, 0, 0, 0);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { f: toISODate(start), t: toISODate(end) };
    }
    if (p === 'next_week') {
      const start = new Date(now);
      const day = start.getDay();
      const diff = start.getDate() - day + 7;
      start.setHours(0, 0, 0, 0);
      start.setDate(diff);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { f: toISODate(start), t: toISODate(end) };
    }
    if (p === 'this_month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      return { f: toISODate(start), t: toISODate(end) };
    }
    return { f: from, t: to };
  };

  // Get filtered routines based on date range (matching what the backend sends)
  const routines = useMemo(() => {
    if (selectedDancers.length !== 1) return [];
    
    // Get all routines for the selected dancer
    const dancerId = selectedDancers[0];
    const baseRoutines = scheduledRoutines.filter(routine =>
      routine.routine.dancers.some(dancer => dancer.id === dancerId)
    );
    
    const range = computePresetRange(preset);
    
    // Filter by date range - compare date strings directly
    return baseRoutines.filter(routine => {
      const routineDate = routine.date; // ISO date string (YYYY-MM-DD)
      
      let fromDateStr: string | null = null;
      let toDateStr: string | null = null;
      
      if (preset === 'custom') {
        fromDateStr = from || null;
        toDateStr = to || null;
      } else {
        // For presets, use the computed range
        fromDateStr = range.f || null;
        toDateStr = range.t || null;
      }
      
      // Compare date strings directly (YYYY-MM-DD format)
      if (fromDateStr && routineDate < fromDateStr) return false;
      if (toDateStr && routineDate > toDateStr) return false;
      
      return true;
    });
  }, [selectedDancers, preset, from, to, scheduledRoutines]);

  const canSend = useMemo(() => selectedDancers.length > 0 && !isSending, [selectedDancers.length, isSending]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 inline" />;
    }
    return sortDirection === 'asc' 
      ? <ArrowUp className="w-3 h-3 ml-1 inline" />
      : <ArrowDown className="w-3 h-3 ml-1 inline" />;
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <th
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center">
        {children}
        {getSortIcon(field)}
      </span>
    </th>
  );

  const filteredAndSortedDancers = useMemo(() => {
    // Filter by search query
    const filtered = dancers.filter(dancer => {
      const matchesSearch = !searchQuery.trim() || 
        dancer.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dancer.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dancer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dancer.email && (
          Array.isArray(dancer.email)
            ? dancer.email.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
            : dancer.email.toLowerCase().includes(searchQuery.toLowerCase())
        )) ||
        (dancer.phone && dancer.phone.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Filter by level - check if dancer appears in routines with selected levels
      const matchesLevel = selectedLevelIds.length === 0 || (() => {
        // Check if dancer appears in any routine where the routine's level matches selected levels
        return scheduledRoutines.some(scheduledRoutine => {
          const routine = scheduledRoutine.routine;
          
          // Check if routine has a level and it matches any selected level
          if (!routine.level || !routine.level.id) return false;
          if (!selectedLevelIds.includes(routine.level.id)) return false;
          
          // Check if this dancer is in this routine
          return routine.dancers.some(routineDancer => routineDancer.id === dancer.id);
        });
      })();
      
      return matchesSearch && matchesLevel;
    });

    // Sort if sortField is set
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: string | number = '';
        let bVal: string | number = '';

        switch (sortField) {
          case 'firstName':
            aVal = a.firstName || a.name.split(' ')[0] || '';
            bVal = b.firstName || b.name.split(' ')[0] || '';
            break;
          case 'lastName':
            aVal = a.lastName || a.name.split(' ').slice(1).join(' ') || '';
            bVal = b.lastName || b.name.split(' ').slice(1).join(' ') || '';
            break;
          case 'age':
            aVal = a.age ?? 0;
            bVal = b.age ?? 0;
            break;
          case 'email':
            aVal = a.email 
              ? (Array.isArray(a.email) ? a.email.join('; ') : a.email)
              : '';
            bVal = b.email 
              ? (Array.isArray(b.email) ? b.email.join('; ') : b.email)
              : '';
            break;
          case 'phone':
            aVal = a.phone || '';
            bVal = b.phone || '';
            break;
          case 'name':
            aVal = a.name;
            bVal = b.name;
            break;
        }

        if (sortField === 'age') {
          const comparison = (aVal as number) - (bVal as number);
          return sortDirection === 'asc' ? comparison : -comparison;
        } else {
          const comparison = String(aVal).localeCompare(String(bVal));
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      });
    }

    return filtered;
  }, [dancers, searchQuery, selectedLevelIds, scheduledRoutines, sortField, sortDirection]);

  const selectedFilteredDancers = useMemo(() => {
    return filteredAndSortedDancers.filter(d => selectedDancers.includes(d.id));
  }, [filteredAndSortedDancers, selectedDancers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Email Schedules</h2>
              <p className="text-sm text-gray-600">Send personalized schedules to dancers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 gap-4 mb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {levels.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Level
                </label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-white">
                  <div className="space-y-2">
                    {levels.map(level => (
                      <label
                        key={level.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedLevelIds.includes(level.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedLevelIds([...selectedLevelIds, level.id]);
                            } else {
                              setSelectedLevelIds(selectedLevelIds.filter(id => id !== level.id));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{level.name}</span>
                      </label>
                    ))}
                  </div>
                  {selectedLevelIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedLevelIds([])}
                      className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Uncheck All
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedDancers.length} of {dancers.length} dancers
              {selectedDancers.length > 0 && ` (${selectedDancers.length} selected)`}
            </div>
            <button
              type="button"
              onClick={() => {
                const allFilteredIds = filteredAndSortedDancers.map(d => d.id);
                const allSelected = allFilteredIds.every(id => selectedDancers.includes(id));
                if (allSelected) {
                  setSelectedDancers(selectedDancers.filter(id => !allFilteredIds.includes(id)));
                } else {
                  const newSelection = Array.from(new Set([...selectedDancers, ...allFilteredIds]));
                  setSelectedDancers(newSelection);
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedFilteredDancers.length === filteredAndSortedDancers.length && filteredAndSortedDancers.length > 0
                ? 'Deselect All'
                : 'Select All'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Dancer Selection Table */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Dancers
              </label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={filteredAndSortedDancers.length > 0 && filteredAndSortedDancers.every(d => selectedDancers.includes(d.id))}
                            onChange={(e) => {
                              const allFilteredIds = filteredAndSortedDancers.map(d => d.id);
                              if (e.target.checked) {
                                setSelectedDancers(Array.from(new Set([...selectedDancers, ...allFilteredIds])));
                              } else {
                                setSelectedDancers(selectedDancers.filter(id => !allFilteredIds.includes(id)));
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <SortableHeader field="firstName">First Name</SortableHeader>
                        <SortableHeader field="lastName">Last Name</SortableHeader>
                        <SortableHeader field="name">Full Name</SortableHeader>
                        <SortableHeader field="age">Age</SortableHeader>
                        <SortableHeader field="email">Email</SortableHeader>
                        <SortableHeader field="phone">Phone</SortableHeader>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Gender
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedDancers.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-4 py-8 text-center text-gray-500 text-sm">
                            No dancers found matching your search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedDancers.map(dancer => {
                          const isSelected = selectedDancers.includes(dancer.id);
                          return (
                            <tr
                              key={dancer.id}
                              className={`hover:bg-gray-50 cursor-pointer ${isSelected ? 'bg-blue-50' : ''}`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedDancers(selectedDancers.filter(id => id !== dancer.id));
                                } else {
                                  setSelectedDancers([...selectedDancers, dancer.id]);
                                }
                              }}
                            >
                              <td className="px-4 py-3 whitespace-nowrap">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    if (e.target.checked) {
                                      setSelectedDancers([...selectedDancers, dancer.id]);
                                    } else {
                                      setSelectedDancers(selectedDancers.filter(id => id !== dancer.id));
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.firstName || dancer.name.split(' ')[0] || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.lastName || dancer.name.split(' ').slice(1).join(' ') || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {dancer.name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.age ?? '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.email 
                                  ? (Array.isArray(dancer.email) ? dancer.email.join('; ') : dancer.email)
                                  : '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.phone || '-'}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.gender || '-'}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select
                  value={preset}
                  onChange={(e) => setPreset(e.target.value as Preset)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="this_week">This week</option>
                  <option value="next_week">Next week</option>
                  <option value="this_month">This month</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="date"
                  disabled={preset !== 'custom'}
                  value={preset === 'custom' ? from : computePresetRange(preset).f}
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="date"
                  disabled={preset !== 'custom'}
                  value={preset === 'custom' ? to : computePresetRange(preset).t}
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* Schedule Preview */}
            {selectedDancers.length === 1 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    Schedule for {selectedDancerData?.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyToClipboard}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  </div>
                </div>

                {routines.length === 0 ? (
                  <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
                    <p className="text-gray-600">No rehearsals scheduled for this dancer</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routines.map(routine => (
                      <div key={routine.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {routine.routine.songTitle}
                          </h4>
                          <div className="text-sm text-gray-600">
                            {getDayName(routine.startTime.day)} • {formatTime(routine.startTime.hour, routine.startTime.minute)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">
                          <div>Room: {routine.roomId}</div>
                          <div>Teacher: {routine.routine.teacher.name}</div>
                          <div>Duration: {routine.duration} minutes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Email Preview */}
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Email Preview:</h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {selectedDancerData ? formatScheduleText(selectedDancerData, routines) : 'Select a dancer to preview...'}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {selectedDancers.length > 0 && (
              <span>{selectedDancers.length} dancer{selectedDancers.length !== 1 ? 's' : ''} selected</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Close
            </button>
            <button
              onClick={handleSendEmail}
              disabled={!canSend}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
              {isSending ? 'Sending...' : `Send Email${selectedDancers.length > 1 ? ` to ${selectedDancers.length}` : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
