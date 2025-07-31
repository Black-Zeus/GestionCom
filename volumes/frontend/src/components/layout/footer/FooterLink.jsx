import React from 'react'
import { cn } from '@/utils/cn';

  const FooterLink = ({ href = "#", onClick, children }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
      className={cn(
        "text-gray-600 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400",
        "transition-colors duration-200",
        "text-sm font-medium", 
        "hover:underline underline-offset-2",
        "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-sm"
      )}
    >
      {children}
    </a>
  );

export default FooterLink