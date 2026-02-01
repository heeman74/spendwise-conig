'use client';

import Spinner from '@/components/ui/Spinner';

interface ParsingProgressProps {
  fileName: string;
}

export default function ParsingProgress({ fileName }: ParsingProgressProps) {
  return (
    <div className="text-center py-12">
      <Spinner size="lg" />
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mt-4 mb-2">
        Parsing your statement...
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Analyzing <span className="font-medium">{fileName}</span> for transactions
      </p>
    </div>
  );
}
