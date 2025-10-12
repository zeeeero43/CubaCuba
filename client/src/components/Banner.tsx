import { useQuery } from "@tanstack/react-query";
import type { Banner as BannerType } from "@shared/schema";
import { OptimizedImage } from "@/components/OptimizedImage";

interface BannerProps {
  position: "header" | "sidebar" | "footer" | "mobile" | "category";
  className?: string;
}

export function Banner({ position, className = "" }: BannerProps) {
  const { data: banners } = useQuery<BannerType[]>({
    queryKey: ["/api/banners/active", position],
    queryFn: async () => {
      const response = await fetch(`/api/banners/active?position=${position}`);
      if (!response.ok) throw new Error("Failed to load banners");
      return response.json();
    },
  });

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <div className={`banner-container ${className}`} data-testid={`banner-${position}`}>
      {banners.map((banner) => (
        <a
          key={banner.id}
          href={banner.linkUrl || "#"}
          target={banner.linkUrl ? "_blank" : "_self"}
          rel={banner.linkUrl ? "noopener noreferrer" : undefined}
          className="block"
          data-testid={`banner-link-${banner.id}`}
        >
          <OptimizedImage
            src={banner.imageUrl}
            alt="Advertisement"
            className="w-full h-auto object-cover rounded-lg"
            data-testid={`banner-image-${banner.id}`}
          />
        </a>
      ))}
    </div>
  );
}
