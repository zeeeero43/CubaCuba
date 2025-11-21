import { useState, useRef, useEffect } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
  fallbackSrc?: string;
  'data-testid'?: string;
  // Responsive image sizes
  sizes?: string;
  // Image dimensions for aspect ratio (optional)
  width?: number;
  height?: number;
}

/**
 * Helper function to generate responsive image URLs
 * Supports Google Cloud Storage transformation parameters
 */
function generateResponsiveSources(src: string) {
  // Check if URL supports transformation parameters
  const isGCS = src.includes('storage.googleapis.com') || src.includes('localhost:5000/api/image-proxy');

  if (!isGCS) {
    return {
      srcSet: `${src} 1x`,
      webpSrcSet: undefined,
    };
  }

  // Generate different sizes for responsive loading
  const sizes = [400, 800, 1200];
  const srcSet = sizes.map(w => `${src}?w=${w}&q=80 ${w}w`).join(', ');
  const webpSrcSet = sizes.map(w => `${src}?w=${w}&q=80&fm=webp ${w}w`).join(', ');

  return { srcSet, webpSrcSet };
}

export function OptimizedImage({
  src,
  alt,
  className = '',
  onError,
  fallbackSrc = 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop&crop=center',
  sizes = '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw',
  width,
  height,
  ...props
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>('');
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);
  const { srcSet, webpSrcSet } = generateResponsiveSources(src);

  useEffect(() => {
    // Fallback for browsers without IntersectionObserver (older Android browsers common in Cuba)
    if (typeof IntersectionObserver === 'undefined') {
      setImageSrc(src);
      setIsLoading(false);
      return;
    }

    // Intersection Observer for lazy loading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Load 50px before image enters viewport
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [src]);

  const handleLoad = () => {
    setIsLoading(false);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageError(true);
    setImageSrc(fallbackSrc);
    setIsLoading(false);
    onError?.(e);
  };

  return (
    <div className="relative">
      {isLoading && imageSrc && !imageError && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}
      {imageSrc && (
        <picture>
          {/* WebP format for modern browsers - 30-50% smaller */}
          {webpSrcSet && (
            <source
              type="image/webp"
              srcSet={webpSrcSet}
              sizes={sizes}
            />
          )}
          {/* JPEG/PNG fallback */}
          <img
            ref={imgRef}
            src={imageSrc}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            className={className}
            onLoad={handleLoad}
            onError={handleError}
            loading="lazy"
            decoding="async"
            width={width}
            height={height}
            {...props}
          />
        </picture>
      )}
      {!imageSrc && (
        <div
          ref={imgRef}
          className={`${className} bg-gray-200 dark:bg-gray-700 animate-pulse`}
          aria-label={`Loading ${alt}`}
        />
      )}
    </div>
  );
}
