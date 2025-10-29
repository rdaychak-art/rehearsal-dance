'use client';

import React, { useState, useMemo } from 'react';
import { Dancer } from '../../types/dancer';
import { X, Search, ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';

interface DancerSelectionModalProps {
  dancers: Dancer[];
  selectedDancers: Dancer[];
  isOpen: boolean;
  onClose: () => void;
  onApply: (selectedDancerIds: string[]) => void;
}

type SortField = 'firstName' | 'lastName' | 'age' | 'birthday' | 'gender' | 'email' | 'phone';
type SortDirection = 'asc' | 'desc';

export const DancerSelectionModal: React.FC<DancerSelectionModalProps> = ({
  dancers,
  selectedDancers,
  isOpen,
  onClose,
  onApply
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filterGender, setFilterGender] = useState<string>('');
  const [tempSelectedIds, setTempSelectedIds] = useState<Set<string>>(
    new Set(selectedDancers.map(d => d.id))
  );
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [selectedDancerClasses, setSelectedDancerClasses] = useState<string[]>([]);
  const [selectedDancerName, setSelectedDancerName] = useState<string>('');

  React.useEffect(() => {
    if (isOpen) {
      setTempSelectedIds(new Set(selectedDancers.map(d => d.id)));
    }
  }, [isOpen, selectedDancers]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleToggleDancer = (dancerId: string) => {
    setTempSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dancerId)) {
        newSet.delete(dancerId);
      } else {
        newSet.add(dancerId);
      }
      return newSet;
    });
  };

  const filteredAndSortedDancers = useMemo(() => {
    let filtered = dancers.filter(dancer => {
      const matchesSearch = searchTerm === '' || 
        dancer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dancer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dancer.email && (
          Array.isArray(dancer.email)
            ? dancer.email.some(e => e.toLowerCase().includes(searchTerm.toLowerCase()))
            : dancer.email.toLowerCase().includes(searchTerm.toLowerCase())
        )) ||
        dancer.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesGender = filterGender === '' || dancer.gender === filterGender;
      
      return matchesSearch && matchesGender;
    });

    if (sortField) {
      filtered.sort((a, b) => {
        let aVal: any = '';
        let bVal: any = '';

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
          case 'birthday':
            aVal = a.birthday || '';
            bVal = b.birthday || '';
            break;
          case 'gender':
            aVal = a.gender || '';
            bVal = b.gender || '';
            break;
          case 'email':
            aVal = a.email || '';
            bVal = b.email || '';
            break;
          case 'phone':
            aVal = a.phone || '';
            bVal = b.phone || '';
            break;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          const comparison = aVal.localeCompare(bVal);
          return sortDirection === 'asc' ? comparison : -comparison;
        } else {
          const comparison = aVal - bVal;
          return sortDirection === 'asc' ? comparison : -comparison;
        }
      });
    }

    return filtered;
  }, [dancers, searchTerm, filterGender, sortField, sortDirection]);

  const genders = useMemo(() => {
    const genderSet = new Set<string>();
    dancers.forEach(d => {
      if (d.gender) genderSet.add(d.gender);
    });
    return Array.from(genderSet).sort();
  }, [dancers]);

  const formatBirthday = (birthday?: string) => {
    if (!birthday) return '-';
    try {
      const date = new Date(birthday);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return birthday;
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Select Dancers</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
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
            <div>
              <select
                value={filterGender}
                onChange={(e) => setFilterGender(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Genders</option>
                {genders.map(gender => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredAndSortedDancers.length} of {dancers.length} dancers
            {tempSelectedIds.size > 0 && ` (${tempSelectedIds.size} selected)`}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
                  <input
                    type="checkbox"
                    checked={filteredAndSortedDancers.length > 0 && filteredAndSortedDancers.every(d => tempSelectedIds.has(d.id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setTempSelectedIds(prev => {
                          const newSet = new Set(prev);
                          filteredAndSortedDancers.forEach(d => newSet.add(d.id));
                          return newSet;
                        });
                      } else {
                        setTempSelectedIds(prev => {
                          const newSet = new Set(prev);
                          filteredAndSortedDancers.forEach(d => newSet.delete(d.id));
                          return newSet;
                        });
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <SortableHeader field="firstName">First Name</SortableHeader>
                <SortableHeader field="lastName">Last Name</SortableHeader>
                <SortableHeader field="age">Age</SortableHeader>
                <SortableHeader field="birthday">Birthday</SortableHeader>
                <SortableHeader field="gender">Gender</SortableHeader>
                <SortableHeader field="email">Email</SortableHeader>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[300px]">
                  Classes
                </th>
                <SortableHeader field="phone">Primary Phone</SortableHeader>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedDancers.map((dancer) => {
                const isSelected = tempSelectedIds.has(dancer.id);
                return (
                  <tr
                    key={dancer.id}
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleDancer(dancer.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dancer.firstName || dancer.name.split(' ')[0] || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dancer.lastName || dancer.name.split(' ').slice(1).join(' ') || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dancer.age ?? '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatBirthday(dancer.birthday)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dancer.gender || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dancer.email 
                        ? (Array.isArray(dancer.email) ? dancer.email.join('; ') : dancer.email)
                        : '-'
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 min-w-[300px]">
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {dancer.phone || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredAndSortedDancers.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No dancers found matching your search criteria.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {tempSelectedIds.size} dancer{tempSelectedIds.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApply(Array.from(tempSelectedIds));
                onClose();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Check className="w-4 h-4" />
              Apply Selection
            </button>
          </div>
        </div>
      </div>

      {/* Classes Modal */}
      {showClassesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70]">
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

