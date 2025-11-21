import { useQuery, useInfiniteQuery } from '@tanstack/react-query';

export interface ListingThumbnail {
  id: string;
  title: string;
  price: string;
  currency: string;
  locationCity: string;
  thumbnail: string | null;
  imageCount: number;
  featured: string;
  condition: string;
  views: number;
}

export interface ListingThumbnailsResponse {
  listings: ListingThumbnail[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

interface UseListingThumbnailsOptions {
  categoryId?: string;
  region?: string;
  priceMin?: number;
  priceMax?: number;
  condition?: string;
  source?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Optimized hook for fetching listing thumbnails
 * Uses /api/listings/thumbnails endpoint which returns 70% less data
 * Perfect for grid views where full listing details aren't needed
 */
export function useListingThumbnails(options: UseListingThumbnailsOptions = {}) {
  const params = new URLSearchParams();

  if (options.categoryId) params.append('categoryId', options.categoryId);
  if (options.region) params.append('region', options.region);
  if (options.priceMin !== undefined) params.append('priceMin', options.priceMin.toString());
  if (options.priceMax !== undefined) params.append('priceMax', options.priceMax.toString());
  if (options.condition) params.append('condition', options.condition);
  if (options.source) params.append('source', options.source);
  if (options.q) params.append('q', options.q);
  if (options.page) params.append('page', options.page.toString());
  if (options.pageSize) params.append('pageSize', options.pageSize.toString());

  return useQuery<ListingThumbnailsResponse>({
    queryKey: ['listing-thumbnails', options],
    queryFn: async () => {
      const response = await fetch(`/api/listings/thumbnails?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch listing thumbnails');
      }
      return response.json();
    },
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Infinite scroll version for home page
 */
export function useInfiniteListingThumbnails(options: UseListingThumbnailsOptions = {}) {
  const baseParams = new URLSearchParams();

  if (options.categoryId) baseParams.append('categoryId', options.categoryId);
  if (options.region) baseParams.append('region', options.region);
  if (options.priceMin !== undefined) baseParams.append('priceMin', options.priceMin.toString());
  if (options.priceMax !== undefined) baseParams.append('priceMax', options.priceMax.toString());
  if (options.condition) baseParams.append('condition', options.condition);
  if (options.source) baseParams.append('source', options.source);
  if (options.q) baseParams.append('q', options.q);
  if (options.pageSize) baseParams.append('pageSize', options.pageSize.toString());

  return useInfiniteQuery<ListingThumbnailsResponse>({
    queryKey: ['listing-thumbnails-infinite', options],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams(baseParams);
      params.append('page', pageParam.toString());

      const response = await fetch(`/api/listings/thumbnails?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch listing thumbnails');
      }
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (lastPage.currentPage < lastPage.totalPages) {
        return lastPage.currentPage + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}
