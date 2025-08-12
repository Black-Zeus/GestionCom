import React from 'react'
import { cn } from '@/utils/cn';

  const Divider = ({ className }) => (
    <div className={cn(
      "w-[1px] h-4 bg-gray-300 dark:bg-gray-600 flex-shrink-0",
      className
    )} />
  );

export default Divider