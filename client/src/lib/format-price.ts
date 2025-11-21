import type { Listing } from "@shared/schema";

/**
 * Format price for display - removes .00 for whole numbers
 */
export function formatPrice(listing: Listing): string {
  if (!listing.price) {
    return "Precio a consultar";
  }

  // Parse the price as a number
  const priceNum = parseFloat(listing.price);

  // Format without decimals if it's a whole number
  const formattedPrice = priceNum % 1 === 0
    ? priceNum.toFixed(0)
    : priceNum.toFixed(2);

  return `${formattedPrice} ${listing.currency || "CUP"}`;
}
