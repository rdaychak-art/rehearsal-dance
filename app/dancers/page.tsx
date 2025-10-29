'use client';

import Link from 'next/link';
import { DancersList } from '../components/dancers/DancersList';
import { mockDancers } from '../data/mockDancers';
import { mockScheduledRoutines, mockRooms } from '../data/mockSchedules';
import { ArrowLeft } from 'lucide-react';

export default function DancersPage() {
  return (
    <div className="h-screen bg-gray-100 flex flex-col overflow-hidden">
      {/* Navigation Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Schedule</span>
        </Link>
      </div>
      
      <DancersList
        dancers={mockDancers}
        scheduledRoutines={mockScheduledRoutines}
        rooms={mockRooms}
      />
    </div>
  );
}

