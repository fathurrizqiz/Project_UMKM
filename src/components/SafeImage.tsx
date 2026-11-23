import { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';

interface SafeImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function SafeImage({ src, alt, className = '', fallbackTitle }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-2 bg-[#F3ECE1] dark:bg-[#1D1713] text-[#8A7363] dark:text-[#BBA798] p-4 text-center ${className}`}
        role="img"
        aria-label={alt}
      >
        <Utensils className="w-7 h-7 opacity-60" aria-hidden="true" />
        {fallbackTitle && (
          <span className="text-xs font-medium text-[#5E4A3E] dark:text-[#EADCCF] line-clamp-2">
            {fallbackTitle}
          </span>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
