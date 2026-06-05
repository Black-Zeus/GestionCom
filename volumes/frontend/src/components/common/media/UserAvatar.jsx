/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { UserCircle } from 'lucide-react';

const sizeClasses = {
  sm: { box: 'h-9 w-9', icon: 'h-6 w-6' },
  md: { box: 'h-10 w-10', icon: 'h-6 w-6' },
  lg: { box: 'h-36 w-36', icon: 'h-20 w-20' },
};

const UserAvatar = ({
  src,
  alt = 'Usuario',
  size = 'md',
  className = '',
  placeholderClassName = '',
}) => {
  const [hasError, setHasError] = useState(false);
  const currentSize = sizeClasses[size] || sizeClasses.md;

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${currentSize.box} shrink-0 rounded-md object-cover ${className}`}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className={`flex ${currentSize.box} shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200 ${placeholderClassName}`}>
      <UserCircle className={currentSize.icon} />
    </div>
  );
};

export default UserAvatar;
