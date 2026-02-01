'use client';

import { useState, useRef, useEffect } from 'react';
import { DayPicker, DateRange } from 'react-day-picker';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import 'react-day-picker/style.css';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  value: { from: Date; to: Date };
  onChange: (range: { from: Date; to: Date }) => void;
}

const presets = [
  {
    label: 'Last 7 days',
    getValue: () => ({ from: subDays(new Date(), 7), to: new Date() }),
  },
  {
    label: 'Last 30 days',
    getValue: () => ({ from: subDays(new Date(), 30), to: new Date() }),
  },
  {
    label: 'This month',
    getValue: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }),
  },
  {
    label: 'Last 3 months',
    getValue: () => ({ from: subMonths(new Date(), 3), to: new Date() }),
  },
  {
    label: 'Last 6 months',
    getValue: () => ({ from: subMonths(new Date(), 6), to: new Date() }),
  },
];

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handlePresetClick = (preset: typeof presets[0]) => {
    onChange(preset.getValue());
  };

  const handleDayPickerSelect = (range: DateRange | undefined) => {
    if (range?.from && range?.to) {
      onChange({ from: range.from, to: range.to });
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        <span>
          {format(value.from, 'MMM d, yyyy')} - {format(value.to, 'MMM d, yyyy')}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg dark:bg-gray-800 dark:border-gray-700">
          <div className="flex">
            <div className="flex flex-col gap-1 p-3 border-r border-gray-200 dark:border-gray-700">
              {presets.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  className="text-sm text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-200 whitespace-nowrap"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="p-3 date-range-picker">
              <DayPicker
                mode="range"
                selected={{ from: value.from, to: value.to }}
                onSelect={handleDayPickerSelect}
                numberOfMonths={2}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
