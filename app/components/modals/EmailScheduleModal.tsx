"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Dancer } from "../../types/dancer";
import { ScheduledRoutine } from "../../types/schedule";
import { Level, Routine, Teacher } from "../../types/routine";
import {
  X,
  Mail,
  Download,
  Copy,
  Check,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronDown,
} from "lucide-react";
import { formatTime, getDayName } from "../../utils/timeUtils";
import { toast } from "react-hot-toast";

interface EmailScheduleModalProps {
  dancers: Dancer[];
  scheduledRoutines: ScheduledRoutine[];
  allRoutines?: Routine[]; // Optional: all routines (not just scheduled)
  isOpen: boolean;
  onClose: () => void;
}

export const EmailScheduleModal: React.FC<EmailScheduleModalProps> = ({
  dancers,
  scheduledRoutines,
  allRoutines,
  isOpen,
  onClose,
}) => {
  const [selectedDancers, setSelectedDancers] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  type Preset = "this_week" | "next_week" | "this_month" | "custom";
  const [preset, setPreset] = useState<Preset>("this_week");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [fromEmail, setFromEmail] = useState<string>("info@pdato.ca");
  const [customMessage, setCustomMessage] = useState<string>("");
  const [isSending, setIsSending] = useState(false);
  const [levels, setLevels] = useState<Level[]>([]);
  const [selectedLevelIds, setSelectedLevelIds] = useState<string[]>([]);
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>([]);

  // Sorting state
  type SortField =
    | "firstName"
    | "lastName"
    | "age"
    | "email"
    | "phone"
    | "name";
  type SortDirection = "asc" | "desc";
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  useEffect(() => {
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

  const selectedDancerData =
    selectedDancers.length === 1
      ? dancers.find((d) => d.id === selectedDancers[0])
      : undefined;

  const formatScheduleText = (dancer: Dancer, routines: ScheduledRoutine[]) => {
    const customMsg = customMessage.trim()
      ? `\n${customMessage.trim()}\n\n`
      : "";
    const scheduleText = `
Hi ${dancer.name},${customMsg}Here's your rehearsal schedule for this week:

${
  routines.length === 0
    ? "No rehearsals scheduled this week."
    : routines
        .map((routine) => {
          // Parse date string (YYYY-MM-DD) in local timezone to avoid UTC shift
          const [year, month, day] = routine.date.split("-").map(Number);
          const date = new Date(year, month - 1, day, 0, 0, 0, 0);
          const formattedDate = date.toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          });
          const startTime = formatTime(
            routine.startTime.hour,
            routine.startTime.minute
          );
          const endTime = formatTime(
            routine.endTime.hour,
            routine.endTime.minute
          );

          return `${formattedDate} - ${startTime} to ${endTime}
  Routine: ${routine.routine.songTitle}
  Genre: ${routine.routine.genre.name}
  Room: ${routine.roomId}
  Teacher: ${routine.routine.teacher.name}`;
        })
        .join("\n\n")
}

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
      console.error("Failed to copy to clipboard:", err);
    }
  };

  const handleDownloadPDF = () => {
    if (!selectedDancerData) return;

    // Use the filtered routines (already computed in useMemo)
    const scheduleText = formatScheduleText(selectedDancerData, routines);

    // Create a simple text file download
    const blob = new Blob([scheduleText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedDancerData.name}_schedule.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  interface PostBody {
    dancerIds: string[];
    preset?: Exclude<Preset, "custom">;
    from?: string;
    to?: string;
    levelIds?: string[];
    fromEmail?: string;
    customMessage?: string;
    teacherIds?: string[];
  }

  const handleSendEmail = async () => {
    if (selectedDancers.length === 0) return;
    try {
      setIsSending(true);
      setProgress({
        current: 0,
        total: selectedDancers.length,
        message: "Starting...",
      });
      const payload: PostBody = { dancerIds: selectedDancers };
      if (selectedLevelIds.length > 0) {
        payload.levelIds = selectedLevelIds;
      }
      if (preset === "this_week" || preset === "this_month") {
        payload.preset = preset === "this_week" ? "this_week" : "this_month";
      } else if (preset === "next_week") {
        payload.preset = "next_week";
      } else if (preset === "custom") {
        if (!from && !to) {
          toast.error("Choose a from/to date or select a preset");
          setIsSending(false);
          setProgress(null);
          return;
        }
        if (from) payload.from = from;
        if (to) payload.to = to;
      }
      if (fromEmail) {
        payload.fromEmail = fromEmail;
      }
      if (customMessage.trim()) {
        payload.customMessage = customMessage.trim();
      }
      // Always send teacherIds array - empty array means no teachers should receive emails
      payload.teacherIds = selectedTeacherIds;

      const res = await fetch("/api/email/dancer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        // Try to read error message
        try {
          const text = await res.text();
          try {
            const data = JSON.parse(text);
            throw new Error(data?.message || "Failed to send");
          } catch {
            throw new Error(text || "Failed to send");
          }
        } catch (e) {
          if (e instanceof Error) throw e;
          throw new Error("Failed to send email");
        }
      }

      // Check if response is streaming (text/event-stream)
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("text/event-stream")) {
        // Fallback to JSON response (for backwards compatibility)
        const data = (await res.json().catch(() => ({}))) as {
          results?: {
            id: string;
            status: "sent" | "skipped";
            reason?: string;
          }[];
          teacherResults?: {
            teacherId: string;
            status: "sent" | "skipped";
            reason?: string;
          }[];
        };
        const sent = (data?.results || []).filter(
          (r) => r.status === "sent"
        ).length;
        const skipped = (data?.results || []).length - sent;
        const teacherSent = (data?.teacherResults || []).filter(
          (r) => r.status === "sent"
        ).length;
        const teacherSkipped =
          (data?.teacherResults || []).length - teacherSent;

        let message = `Emails sent: ${sent}${
          skipped ? `, skipped: ${skipped}` : ""
        }`;
        if (teacherSent > 0 || teacherSkipped > 0) {
          message += ` | Teachers: ${teacherSent}${
            teacherSkipped ? `, skipped: ${teacherSkipped}` : ""
          }`;
        }
        toast.success(message);
        return;
      }

      // Read the streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let buffer = "";
      let finalData: any = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === "progress") {
                setProgress({
                  current: data.current,
                  total: data.total,
                  message: data.message,
                });
              } else if (data.type === "complete") {
                finalData = data;
                setProgress({
                  current: data.total || selectedDancers.length,
                  total: data.total || selectedDancers.length,
                  message: "Complete!",
                });
              } else if (data.type === "error") {
                throw new Error(data.message || "Unknown error");
              }
            } catch (e) {
              console.error("Failed to parse SSE message:", e);
            }
          }
        }
      }

      // Process any remaining buffer
      if (buffer.trim()) {
        const lines = buffer.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "complete") {
                finalData = data;
              }
            } catch (e) {
              console.error("Failed to parse SSE message:", e);
            }
          }
        }
      }

      if (finalData) {
        const sent = (finalData.results || []).filter(
          (r: { status: string }) => r.status === "sent"
        ).length;
        const skipped = (finalData.results || []).length - sent;
        const teacherSent = (finalData.teacherResults || []).filter(
          (r: { status: string }) => r.status === "sent"
        ).length;
        const teacherSkipped =
          (finalData.teacherResults || []).length - teacherSent;

        let message = `Emails sent: ${sent}${
          skipped ? `, skipped: ${skipped}` : ""
        }`;
        if (teacherSent > 0 || teacherSkipped > 0) {
          message += ` | Teachers: ${teacherSent}${
            teacherSkipped ? `, skipped: ${teacherSkipped}` : ""
          }`;
        }
        toast.success(message);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to send email";
      toast.error(message);
    } finally {
      setIsSending(false);
      setProgress(null);
    }
  };

  const toISODate = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const computePresetRange = useCallback(
    (p: Preset) => {
      const now = new Date();
      if (p === "this_week") {
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
      if (p === "next_week") {
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
      if (p === "this_month") {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { f: toISODate(start), t: toISODate(end) };
      }
      return { f: from, t: to };
    },
    [from, to]
  );

  // Get filtered routines based on date range (matching what the backend sends)
  const routines = useMemo(() => {
    if (selectedDancers.length !== 1) return [];

    // Get all routines for the selected dancer
    const dancerId = selectedDancers[0];
    const baseRoutines = scheduledRoutines.filter((routine) =>
      routine.routine.dancers.some((dancer) => dancer.id === dancerId)
    );

    const range = computePresetRange(preset);

    // Filter by date range - compare date strings directly
    return baseRoutines.filter((routine) => {
      const routineDate = routine.date; // ISO date string (YYYY-MM-DD)

      let fromDateStr: string | null = null;
      let toDateStr: string | null = null;

      if (preset === "custom") {
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
  }, [
    selectedDancers,
    preset,
    from,
    to,
    scheduledRoutines,
    computePresetRange,
  ]);

  const canSend = useMemo(
    () => selectedDancers.length > 0 && !isSending,
    [selectedDancers.length, isSending]
  );

  // Calculate included teachers based on selected dancers, date range, and level filters
  const includedTeachers = useMemo(() => {
    if (selectedDancers.length === 0) return [];

    const range = computePresetRange(preset);
    let fromDateStr: string | null = null;
    let toDateStr: string | null = null;

    if (preset === "custom") {
      fromDateStr = from || null;
      toDateStr = to || null;
    } else {
      fromDateStr = range.f || null;
      toDateStr = range.t || null;
    }

    // Get all routines for selected dancers
    const relevantRoutines = scheduledRoutines.filter((routine) => {
      // Check if routine includes at least one selected dancer
      const hasSelectedDancer = routine.routine?.dancers?.some((dancer) =>
        selectedDancers.includes(dancer.id)
      );
      if (!hasSelectedDancer) return false;

      // Filter by date range
      const routineDate = routine.date;
      if (fromDateStr && routineDate < fromDateStr) return false;
      if (toDateStr && routineDate > toDateStr) return false;

      // Filter by level if selected
      if (selectedLevelIds.length > 0) {
        if (
          !routine.routine?.level ||
          !selectedLevelIds.includes(routine.routine.level.id)
        ) {
          return false;
        }
      }

      return true;
    });

    // Extract unique teachers
    const teacherMap = new Map<string, Teacher>();
    relevantRoutines.forEach((routine) => {
      const teacher = routine.routine?.teacher;
      if (teacher && teacher.id && !teacherMap.has(teacher.id)) {
        teacherMap.set(teacher.id, teacher);
      }
    });

    const teachers = Array.from(teacherMap.values());
    console.log("Included teachers calculated:", teachers.length, teachers);
    return teachers;
  }, [
    selectedDancers,
    preset,
    from,
    to,
    scheduledRoutines,
    selectedLevelIds,
    computePresetRange,
  ]);

  // Update selectedTeacherIds when includedTeachers changes (set all as selected by default)
  useEffect(() => {
    if (includedTeachers.length > 0) {
      const includedTeacherIds = includedTeachers.map((t) => t.id);
      setSelectedTeacherIds((prev) => {
        const currentSet = new Set(prev);
        const includedSet = new Set(includedTeacherIds);

        // Add new teachers that weren't previously selected
        const newTeachers = includedTeacherIds.filter(
          (id) => !currentSet.has(id)
        );

        // Remove teachers that are no longer included
        const toRemove = Array.from(currentSet).filter(
          (id) => !includedSet.has(id)
        );

        if (newTeachers.length > 0 || toRemove.length > 0) {
          return Array.from(
            new Set([
              ...prev.filter((id) => !toRemove.includes(id)),
              ...newTeachers,
            ])
          );
        }

        return prev;
      });
    } else {
      // If no teachers included, clear selection
      setSelectedTeacherIds([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [includedTeachers.map((t) => t.id).join(",")]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 ml-1 inline" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="w-3 h-3 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 ml-1 inline" />
    );
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: SortField;
    children: React.ReactNode;
  }) => (
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
    const filtered = dancers.filter((dancer) => {
      const matchesSearch =
        !searchQuery.trim() ||
        dancer.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dancer.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dancer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dancer.email &&
          (Array.isArray(dancer.email)
            ? dancer.email.some((e) =>
                e.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : dancer.email
                .toLowerCase()
                .includes(searchQuery.toLowerCase()))) ||
        (dancer.phone &&
          dancer.phone.toLowerCase().includes(searchQuery.toLowerCase()));

      // Filter by level - check if dancer appears in routines with selected levels
      const matchesLevel =
        selectedLevelIds.length === 0 ||
        (() => {
          // Use all routines if provided, otherwise fall back to scheduled routines
          const routinesToCheck =
            allRoutines || scheduledRoutines.map((sr) => sr.routine);

          // Check if dancer appears in any routine where the routine's level matches selected levels
          return routinesToCheck.some((routine) => {
            // Check if routine has a level and it matches any selected level
            if (!routine.level || !routine.level.id) return false;
            if (!selectedLevelIds.includes(routine.level.id)) return false;

            // Check if this dancer is in this routine
            return routine.dancers.some(
              (routineDancer) => routineDancer.id === dancer.id
            );
          });
        })();

      return matchesSearch && matchesLevel;
    });

    // Sort if sortField is set
    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: string | number = "";
        let bVal: string | number = "";

        switch (sortField) {
          case "firstName":
            aVal = a.firstName || a.name.split(" ")[0] || "";
            bVal = b.firstName || b.name.split(" ")[0] || "";
            break;
          case "lastName":
            aVal = a.lastName || a.name.split(" ").slice(1).join(" ") || "";
            bVal = b.lastName || b.name.split(" ").slice(1).join(" ") || "";
            break;
          case "age":
            aVal = a.age ?? 0;
            bVal = b.age ?? 0;
            break;
          case "email":
            aVal = a.email
              ? Array.isArray(a.email)
                ? a.email.join("; ")
                : a.email
              : "";
            bVal = b.email
              ? Array.isArray(b.email)
                ? b.email.join("; ")
                : b.email
              : "";
            break;
          case "phone":
            aVal = a.phone || "";
            bVal = b.phone || "";
            break;
          case "name":
            aVal = a.name;
            bVal = b.name;
            break;
        }

        if (sortField === "age") {
          const comparison = (aVal as number) - (bVal as number);
          return sortDirection === "asc" ? comparison : -comparison;
        } else {
          const comparison = String(aVal).localeCompare(String(bVal));
          return sortDirection === "asc" ? comparison : -comparison;
        }
      });
    }

    return filtered;
  }, [
    dancers,
    searchQuery,
    selectedLevelIds,
    scheduledRoutines,
    allRoutines,
    sortField,
    sortDirection,
  ]);

  const selectedFilteredDancers = useMemo(() => {
    return filteredAndSortedDancers.filter((d) =>
      selectedDancers.includes(d.id)
    );
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
              <h2 className="text-xl font-semibold text-gray-900">
                Email Schedules
              </h2>
              <p className="text-sm text-gray-600">
                Send personalized schedules to dancers
              </p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
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
              <div className="relative">
                {/* Level Filter */}
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
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Showing {filteredAndSortedDancers.length} of {dancers.length}{" "}
              dancers
              {selectedDancers.length > 0 &&
                ` (${selectedDancers.length} selected)`}
            </div>
            <button
              type="button"
              onClick={() => {
                const allFilteredIds = filteredAndSortedDancers.map(
                  (d) => d.id
                );
                const allSelected = allFilteredIds.every((id) =>
                  selectedDancers.includes(id)
                );
                if (allSelected) {
                  setSelectedDancers(
                    selectedDancers.filter((id) => !allFilteredIds.includes(id))
                  );
                } else {
                  const newSelection = Array.from(
                    new Set([...selectedDancers, ...allFilteredIds])
                  );
                  setSelectedDancers(newSelection);
                }
              }}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {selectedFilteredDancers.length ===
                filteredAndSortedDancers.length &&
              filteredAndSortedDancers.length > 0
                ? "Deselect All"
                : "Select All"}
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
              <div className="border border-gray-300 rounded-lg h-[400px] overflow-hidden">
                <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                          <input
                            type="checkbox"
                            checked={
                              filteredAndSortedDancers.length > 0 &&
                              filteredAndSortedDancers.every((d) =>
                                selectedDancers.includes(d.id)
                              )
                            }
                            onChange={(e) => {
                              const allFilteredIds =
                                filteredAndSortedDancers.map((d) => d.id);
                              if (e.target.checked) {
                                setSelectedDancers(
                                  Array.from(
                                    new Set([
                                      ...selectedDancers,
                                      ...allFilteredIds,
                                    ])
                                  )
                                );
                              } else {
                                setSelectedDancers(
                                  selectedDancers.filter(
                                    (id) => !allFilteredIds.includes(id)
                                  )
                                );
                              }
                            }}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <SortableHeader field="firstName">
                          First Name
                        </SortableHeader>
                        <SortableHeader field="lastName">
                          Last Name
                        </SortableHeader>
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
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-gray-500 text-sm"
                          >
                            No dancers found matching your search criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredAndSortedDancers.map((dancer) => {
                          const isSelected = selectedDancers.includes(
                            dancer.id
                          );
                          return (
                            <tr
                              key={dancer.id}
                              className={`hover:bg-gray-50 cursor-pointer ${
                                isSelected ? "bg-blue-50" : ""
                              }`}
                              onClick={() => {
                                if (isSelected) {
                                  setSelectedDancers(
                                    selectedDancers.filter(
                                      (id) => id !== dancer.id
                                    )
                                  );
                                } else {
                                  setSelectedDancers([
                                    ...selectedDancers,
                                    dancer.id,
                                  ]);
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
                                      setSelectedDancers([
                                        ...selectedDancers,
                                        dancer.id,
                                      ]);
                                    } else {
                                      setSelectedDancers(
                                        selectedDancers.filter(
                                          (id) => id !== dancer.id
                                        )
                                      );
                                    }
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.firstName ||
                                  dancer.name.split(" ")[0] ||
                                  "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.lastName ||
                                  dancer.name.split(" ").slice(1).join(" ") ||
                                  "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {dancer.name}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.age ?? "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.email
                                  ? Array.isArray(dancer.email)
                                    ? dancer.email.join("; ")
                                    : dancer.email
                                  : "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.phone || "-"}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                {dancer.gender || "-"}
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

            {/* Teacher Selection */}
            {selectedDancers.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Include Teachers{" "}
                  {includedTeachers.length > 0 &&
                    `(${selectedTeacherIds.length} of ${includedTeachers.length} selected)`}
                </label>
                {includedTeachers.length > 0 ? (
                  <>
                    <div className="border border-gray-300 rounded-lg p-3 bg-gray-50 max-h-48 overflow-y-auto">
                      <div className="space-y-2">
                        {includedTeachers.map((teacher) => {
                          const isSelected = selectedTeacherIds.includes(
                            teacher.id
                          );
                          return (
                            <label
                              key={teacher.id}
                              className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedTeacherIds((prev) => [
                                      ...prev,
                                      teacher.id,
                                    ]);
                                  } else {
                                    setSelectedTeacherIds((prev) =>
                                      prev.filter((id) => id !== teacher.id)
                                    );
                                  }
                                }}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">
                                {teacher.name}
                              </span>
                              {teacher.email && (
                                <span className="text-xs text-gray-500 ml-auto">
                                  {teacher.email}
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>
                      {includedTeachers.length > 1 && (
                        <div className="mt-2 pt-2 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                selectedTeacherIds.length ===
                                includedTeachers.length
                              ) {
                                setSelectedTeacherIds([]);
                              } else {
                                setSelectedTeacherIds(
                                  includedTeachers.map((t) => t.id)
                                );
                              }
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                          >
                            {selectedTeacherIds.length ===
                            includedTeachers.length
                              ? "Deselect All"
                              : "Select All"}
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Teachers who have routines with the selected dancers in
                      the chosen date range.
                    </p>
                  </>
                ) : (
                  <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                    <p className="text-sm text-gray-500">
                      No teachers found for the selected dancers in the chosen
                      date range.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Range
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From
                </label>
                <input
                  type="date"
                  disabled={preset !== "custom"}
                  value={
                    preset === "custom" ? from : computePresetRange(preset).f
                  }
                  onChange={(e) => setFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
              <div className="md:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To
                </label>
                <input
                  type="date"
                  disabled={preset !== "custom"}
                  value={
                    preset === "custom" ? to : computePresetRange(preset).t
                  }
                  onChange={(e) => setTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* From Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Email
              </label>
              <select
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="info@pdato.ca">info@pdato.ca</option>
                <option value="kristen@performingdancearts.ca">
                  kristen@performingdancearts.ca
                </option>
                <option value="nicole@performingdancearts.ca">
                  nicole@performingdancearts.ca
                </option>
              </select>
            </div>

            {/* Custom Message */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Message (optional)
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Enter any additional information or instructions to include before the schedule..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                This message will appear at the beginning of the email, before
                the schedule.
              </p>
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
                      {copied ? (
                        <Check className="w-4 h-4" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                      {copied ? "Copied!" : "Copy"}
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
                    <p className="text-gray-600">
                      No rehearsals scheduled for this dancer
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routines.map((routine) => (
                      <div
                        key={routine.id}
                        className="p-4 border border-gray-200 rounded-lg"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900">
                            {routine.routine.songTitle}
                          </h4>
                          <div className="text-sm text-gray-600">
                            {getDayName(routine.startTime.day)} •{" "}
                            {formatTime(
                              routine.startTime.hour,
                              routine.startTime.minute
                            )}
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
                  <h4 className="text-sm font-medium text-gray-700 mb-2">
                    Email Preview:
                  </h4>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 max-h-40 overflow-y-auto">
                    <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                      {selectedDancerData
                        ? formatScheduleText(selectedDancerData, routines)
                        : "Select a dancer to preview..."}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          {progress && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  {progress.message}
                </span>
                <span className="text-sm text-gray-600">
                  {progress.current} / {progress.total}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      (progress.current / progress.total) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-gray-600">
              {selectedDancers.length > 0 && (
                <span>
                  {selectedDancers.length} dancer
                  {selectedDancers.length !== 1 ? "s" : ""} selected
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                disabled={isSending}
              >
                Close
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!canSend}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Mail className="w-4 h-4" />
                {isSending
                  ? "Sending..."
                  : `Send Email${
                      selectedDancers.length > 1
                        ? ` to ${selectedDancers.length}`
                        : ""
                    }`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
