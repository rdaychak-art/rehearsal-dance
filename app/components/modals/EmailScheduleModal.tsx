'use client';

import React, { useMemo, useState } from 'react';
import { Dancer } from '../../types/dancer';
import { ScheduledRoutine } from '../../types/schedule';
import { X, Mail, Download, Copy, Check, Search } from 'lucide-react';
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
  const dayName = getDayName(routine.startTime.day);
  const startTime = formatTime(routine.startTime.hour, routine.startTime.minute);
  const endTime = formatTime(routine.endTime.hour, routine.endTime.minute);
  
  return `${dayName} - ${startTime} to ${endTime}
  Routine: ${routine.routine.songTitle}
  Room: ${routine.roomId}
  Teacher: ${routine.routine.teacher.name}`;
}).join('\n\n')}

Please arrive 10 minutes early for warm-up.

Best regards,
Dance Studio Team
    `.trim();

    return scheduleText;
  };

  const handleCopyToClipboard = async () => {
    if (!selectedDancerData) return;
    
    const routines = getDancerSchedule(selectedDancers[0]);
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
    
    const routines = getDancerSchedule(selectedDancers[0]);
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
  }

  const handleSendEmail = async () => {
    if (selectedDancers.length === 0) return;
    try {
      setIsSending(true);
      const payload: PostBody = { dancerIds: selectedDancers };
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
      const data = (await res.json().catch(() => ({}))) as { results?: { id: string; status: 'sent' | 'skipped'; reason?: string }[] };
      const sent = (data?.results || []).filter((r) => r.status === 'sent').length;
      const skipped = (data?.results || []).length - sent;
      toast.success(`Emails sent: ${sent}${skipped ? `, skipped: ${skipped}` : ''}`);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to send email';
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  const routines = selectedDancers.length === 1 ? getDancerSchedule(selectedDancers[0]) : [];

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

  const canSend = useMemo(() => selectedDancers.length > 0 && !isSending, [selectedDancers.length, isSending]);

  const filteredDancers = useMemo(() => {
    if (!searchQuery.trim()) {
      return dancers;
    }
    const query = searchQuery.toLowerCase().trim();
    return dancers.filter(dancer => 
      dancer.name.toLowerCase().includes(query) ||
      (dancer.email && (
        Array.isArray(dancer.email) 
          ? dancer.email.some(e => e.toLowerCase().includes(query))
          : dancer.email.toLowerCase().includes(query)
      ))
    );
  }, [dancers, searchQuery]);

  const selectedFilteredDancers = useMemo(() => {
    return filteredDancers.filter(d => selectedDancers.includes(d.id));
  }, [filteredDancers, selectedDancers]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
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

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* Dancer Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Select Dancers
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const allFilteredIds = filteredDancers.map(d => d.id);
                    const allSelected = allFilteredIds.every(id => selectedDancers.includes(id));
                    if (allSelected) {
                      // Deselect all filtered dancers
                      setSelectedDancers(selectedDancers.filter(id => !allFilteredIds.includes(id)));
                    } else {
                      // Select all filtered dancers (without duplicates)
                      const newSelection = Array.from(new Set([...selectedDancers, ...allFilteredIds]));
                      setSelectedDancers(newSelection);
                    }
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {selectedFilteredDancers.length === filteredDancers.length && filteredDancers.length > 0
                    ? 'Deselect All'
                    : 'Select All'}
                </button>
              </div>
              {/* Search Input */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search dancers by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto bg-gray-50">
                {filteredDancers.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No dancers found matching &quot;{searchQuery}&quot;
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredDancers.map(dancer => (
                    <label
                      key={dancer.id}
                      className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDancers.includes(dancer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedDancers([...selectedDancers, dancer.id]);
                          } else {
                            setSelectedDancers(selectedDancers.filter(id => id !== dancer.id));
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{dancer.name}</span>
                      {dancer.email && (
                        <span className="text-xs text-gray-500 ml-auto">
                          ({Array.isArray(dancer.email) ? dancer.email.join('; ') : dancer.email})
                        </span>
                      )}
                    </label>
                    ))}
                  </div>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 text-xs text-gray-500">
                  Showing {filteredDancers.length} of {dancers.length} dancers
                </div>
              )}
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
