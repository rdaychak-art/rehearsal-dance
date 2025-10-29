'use client';

import React, { useState } from 'react';
import { Dancer } from '../../types/dancer';
import { X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (dancers: Dancer[]) => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport
}) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedDancers, setParsedDancers] = useState<Dancer[]>([]);
  const [error, setError] = useState<string>('');

  const parseCSV = (text: string): Dancer[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must have at least a header and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dancers: Dancer[] = [];

    // Find column indices
    const firstNameIdx = headers.findIndex(h => h.toLowerCase().includes('first name'));
    const lastNameIdx = headers.findIndex(h => h.toLowerCase().includes('last name'));
    const ageIdx = headers.findIndex(h => h.toLowerCase() === 'age');
    const birthDateIdx = headers.findIndex(h => h.toLowerCase().includes('birth date') || h.toLowerCase().includes('birthday'));
    const genderIdx = headers.findIndex(h => h.toLowerCase() === 'gender');
    const classesIdx = headers.findIndex(h => h.toLowerCase() === 'classes');
    const emailIdx = headers.findIndex(h => h.toLowerCase() === 'email');
    const phoneIdx = headers.findIndex(h => h.toLowerCase().includes('phone'));

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Parse CSV line (handling quoted values)
      const values: string[] = [];
      let currentValue = '';
      let insideQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          insideQuotes = !insideQuotes;
        } else if (char === ',' && !insideQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim()); // Add last value

      if (values.length < headers.length) {
        // Pad with empty strings if needed
        while (values.length < headers.length) {
          values.push('');
        }
      }

      const firstName = firstNameIdx >= 0 ? (values[firstNameIdx] || '').trim() : '';
      const lastName = lastNameIdx >= 0 ? (values[lastNameIdx] || '').trim() : '';
      
      if (!firstName && !lastName) continue; // Skip rows without name

      const name = `${firstName} ${lastName}`.trim() || values.find(v => v.trim()) || `Unknown ${i}`;
      const ageStr = ageIdx >= 0 ? values[ageIdx] : '';
      const age = ageStr ? parseInt(ageStr, 10) : undefined;
      
      // Parse birth date - handle various formats
      let birthday: string | undefined;
      if (birthDateIdx >= 0 && values[birthDateIdx]) {
        const dateStr = values[birthDateIdx].trim();
        try {
          // Try to parse date - handle M/D/YYYY format
          const dateParts = dateStr.split('/');
          if (dateParts.length === 3) {
            const month = parseInt(dateParts[0], 10);
            const day = parseInt(dateParts[1], 10);
            const year = parseInt(dateParts[2], 10);
            const date = new Date(year, month - 1, day);
            if (!isNaN(date.getTime())) {
              birthday = date.toISOString().split('T')[0];
            }
          } else {
            // Try direct date parsing
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
              birthday = date.toISOString().split('T')[0];
            } else {
              birthday = dateStr;
            }
          }
        } catch {
          birthday = dateStr;
        }
      }

      const gender = genderIdx >= 0 ? values[genderIdx].trim() : undefined;
      
      // Parse classes - comma-separated
      let classes: string[] = [];
      if (classesIdx >= 0 && values[classesIdx]) {
        const classesStr = values[classesIdx].trim();
        // Remove quotes if present and split by comma
        const cleaned = classesStr.replace(/^"|"$/g, '');
        classes = cleaned.split(',').map(c => c.trim()).filter(c => c.length > 0);
      }

      // Parse emails - semicolon-separated
      let emails: string[] | string | undefined;
      if (emailIdx >= 0 && values[emailIdx]) {
        const emailStr = values[emailIdx].trim();
        if (emailStr.includes(';')) {
          emails = emailStr.split(';').map(e => e.trim()).filter(e => e.length > 0);
        } else {
          emails = emailStr || undefined;
        }
      }

      const phone = phoneIdx >= 0 ? values[phoneIdx].trim() : undefined;

      const dancer: Dancer = {
        id: `dancer-${Date.now()}-${i}`,
        name,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        age: age && !isNaN(age) ? age : undefined,
        birthday,
        gender: gender || undefined,
        classes: classes.length > 0 ? classes : undefined,
        email: emails,
        phone: phone || undefined
      };

      dancers.push(dancer);
    }

    return dancers;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      setError('Please select a CSV file');
      return;
    }

    setCsvFile(file);
    setError('');
    setParsedDancers([]);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const dancers = parseCSV(text);
        setParsedDancers(dancers);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parsedDancers.length === 0) {
      toast.error('No dancers to import');
      return;
    }

    onImport(parsedDancers);
    toast.success(`Successfully imported ${parsedDancers.length} dancers`);
    setCsvFile(null);
    setParsedDancers([]);
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Import Dancers from CSV</h2>
              <p className="text-sm text-gray-600">Upload a CSV file with dancer information</p>
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
        <div className="p-6 overflow-y-auto flex-1">
          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select CSV File
            </label>
            <div className="mt-1 flex items-center gap-4">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <FileText className="w-4 h-4" />
                Choose File
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {csvFile && (
                <span className="text-sm text-gray-600">
                  {csvFile.name}
                </span>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm text-red-800">{error}</span>
            </div>
          )}

          {/* Preview */}
          {parsedDancers.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-700">
                  {parsedDancers.length} dancers found
                </span>
              </div>
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Age</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Gender</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Classes</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parsedDancers.slice(0, 10).map((dancer, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-sm text-gray-900">{dancer.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{dancer.age || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{dancer.gender || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {dancer.classes ? `${dancer.classes.length} classes` : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {Array.isArray(dancer.email) 
                              ? `${dancer.email.length} emails`
                              : dancer.email || '-'
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedDancers.length > 10 && (
                  <div className="px-4 py-2 bg-gray-50 text-sm text-gray-600 text-center">
                    ... and {parsedDancers.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">CSV Format Requirements:</h3>
            <ul className="text-xs text-gray-600 space-y-1 list-disc list-inside">
              <li>First column should be &quot;First Name&quot;</li>
              <li>Second column should be &quot;Last Name&quot;</li>
              <li>Include columns: Age, Birth Date, Gender, Classes, Email, Primary Phone</li>
              <li>Classes should be comma-separated</li>
              <li>Multiple emails should be semicolon-separated (;)</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={parsedDancers.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Import {parsedDancers.length > 0 && `(${parsedDancers.length})`}
          </button>
        </div>
      </div>
    </div>
  );
};

