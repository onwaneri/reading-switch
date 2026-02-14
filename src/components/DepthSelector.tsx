'use client';

import type { DepthLevel } from '@/types/book';

const LEVELS: { value: DepthLevel; label: string; description: string }[] = [
  { value: 'simple', label: 'Simple', description: 'Word parts only' },
  { value: 'standard', label: 'Standard', description: '+ meanings' },
  { value: 'deep', label: 'Deep', description: '+ origin & family' },
  { value: 'full', label: 'Full SWI', description: 'Complete analysis' },
];

interface DepthSelectorProps {
  depth: DepthLevel;
  onChange: (depth: DepthLevel) => void;
}

export function DepthSelector({ depth, onChange }: DepthSelectorProps) {
  return (
    <div className="flex items-center gap-1" role="group" aria-label="Analysis depth">
      {LEVELS.map((level) => (
        <button
          key={level.value}
          onClick={() => onChange(level.value)}
          title={level.description}
          className={[
            'px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer',
            depth === level.value
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ].join(' ')}
        >
          {level.label}
        </button>
      ))}
    </div>
  );
}
