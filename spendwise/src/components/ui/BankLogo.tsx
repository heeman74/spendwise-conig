'use client';

import { useState } from 'react';
import { getLogoUrl, getBrandColor, getInitials } from '@/lib/institution-logos';

interface BankLogoProps {
  institution: string;
  size?: number;
  className?: string;
}

export default function BankLogo({ institution, size = 40, className = '' }: BankLogoProps) {
  const logoUrl = getLogoUrl(institution);
  const [imgError, setImgError] = useState(false);

  const showFallback = !logoUrl || imgError;

  if (showFallback) {
    const bgColor = getBrandColor(institution);
    const initials = getInitials(institution);
    const fontSize = size * 0.4;

    return (
      <div
        className={`flex items-center justify-center rounded-lg flex-shrink-0 ${className}`}
        style={{
          width: size,
          height: size,
          backgroundColor: bgColor,
        }}
      >
        <span
          className="font-bold text-white leading-none"
          style={{ fontSize }}
        >
          {initials}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={logoUrl}
        alt={`${institution} logo`}
        width={size * 0.65}
        height={size * 0.65}
        onError={() => setImgError(true)}
        className="object-contain"
      />
    </div>
  );
}
