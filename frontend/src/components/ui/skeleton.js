import React from 'react';
import { cn } from '../../lib/utils';

function Skeleton({ className, ...props }) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-zinc-700', className)}
      {...props}
    />
  );
}

export { Skeleton };
