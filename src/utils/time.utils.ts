/**
 * Utility functions for time and duration parsing
 */

/**
 * Convert JWT expiry string to milliseconds for cookie maxAge
 * @param expiryString - Time string in format like "15m", "1h", "24h", "7d"
 * @returns Duration in milliseconds
 */
export const parseJWTExpiryToMs = (expiryString: string): number => {
  const defaultTime = "15m";
  const timeStr = expiryString || defaultTime;
  
  // Parse time string (e.g., "15m", "1h", "24h")
  const regex = /^(\d+)([smhd])$/;
  const match = regex.exec(timeStr);
  if (!match) {
    // Default to 15 minutes if parsing fails
    return 15 * 60 * 1000;
  }
  
  const [, value, unit] = match;
  const numValue = Number.parseInt(value, 10);
  
  switch (unit) {
    case 's': return numValue * 1000;
    case 'm': return numValue * 60 * 1000;
    case 'h': return numValue * 60 * 60 * 1000;
    case 'd': return numValue * 24 * 60 * 60 * 1000;
    default: return 15 * 60 * 1000; // 15 minutes default
  }
};
