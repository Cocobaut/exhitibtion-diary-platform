import React from 'react';
import { IC } from '../../data/mockData';

export function Icon({ name, size = 20, strokeWidth = 1.7, className = '' }) {
  const path = IC[name];
  if (!path) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={path} />
    </svg>
  );
}

export default Icon;
