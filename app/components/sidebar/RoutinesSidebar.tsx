'use client';

import React, { useState, useMemo } from 'react';
import { Routine } from '../../types/routine';
import { ScheduledRoutine } from '../../types/schedule';
import { RoutineCard } from './RoutineCard';
import { Search, Plus, Filter } from 'lucide-react';

interface RoutinesSidebarProps {
  routines: Routine[];
  scheduledRoutines: ScheduledRoutine[];
  onRoutineClick: (routine: Routine) => void;
  onAddRoutine: () => void;
}

export const RoutinesSidebar: React.FC<RoutinesSidebarProps> = ({
  routines,
  scheduledRoutines,
  onRoutineClick,
  onAddRoutine
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState<string>('all');
  const [selectedTeacher, setSelectedTeacher] = useState<string>('all');

  // Count how many times each routine is scheduled
  const routineScheduledCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    scheduledRoutines.forEach(scheduled => {
      counts[scheduled.routineId] = (counts[scheduled.routineId] || 0) + 1;
    });
    return counts;
  }, [scheduledRoutines]);

  const filteredAndSortedRoutines = useMemo(() => {
    const filtered = routines.filter(routine => {
      const matchesSearch = routine.songTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           routine.teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           routine.dancers.some(dancer => 
                             dancer.name.toLowerCase().includes(searchTerm.toLowerCase())
                           );
      
      const matchesGenre = selectedGenre === 'all' || routine.genre.name === selectedGenre;
      const matchesTeacher = selectedTeacher === 'all' || routine.teacher.name === selectedTeacher;
      
      return matchesSearch && matchesGenre && matchesTeacher;
    });

    // Sort: routines with 6+ scheduled instances go to the bottom
    const maxCount = 6;
    const activeRoutines: Routine[] = [];
    const maxedRoutines: Routine[] = [];

    filtered.forEach(routine => {
      const count = routineScheduledCounts[routine.id] || 0;
      if (count >= maxCount) {
        maxedRoutines.push(routine);
      } else {
        activeRoutines.push(routine);
      }
    });

    return [...activeRoutines, ...maxedRoutines];
  }, [routines, scheduledRoutines, searchTerm, selectedGenre, selectedTeacher, routineScheduledCounts]);

  const uniqueGenres = Array.from(new Set(routines.map(r => r.genre.name)));
  const uniqueTeachers = Array.from(new Set(routines.map(r => r.teacher.name)));
  
  // Debug logging
  console.log('Available genres:', uniqueGenres);
  console.log('Available teachers:', uniqueTeachers);
  console.log('Selected genre:', selectedGenre);
  console.log('Selected teacher:', selectedTeacher);
  console.log('Filtered routines count:', filteredAndSortedRoutines.length);

  return (
    <div className="w-80 bg-gray-50 border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Routines</h2>
          <button
            onClick={onAddRoutine}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Routine
          </button>
        </div>
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search routines, dancers, teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filters</span>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Genre</label>
            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Genres</option>
              {uniqueGenres.map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Teacher</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Teachers</option>
              {uniqueTeachers.map(teacher => (
                <option key={teacher} value={teacher}>{teacher}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Routines List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-3">
          {filteredAndSortedRoutines.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">No routines found</p>
              <p className="text-gray-400 text-xs mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            filteredAndSortedRoutines.map(routine => {
              const scheduledCount = routineScheduledCounts[routine.id] || 0;
              const isMaxed = scheduledCount >= 6;
              return (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  onClick={onRoutineClick}
                  isMaxed={isMaxed}
                  scheduledCount={scheduledCount}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
