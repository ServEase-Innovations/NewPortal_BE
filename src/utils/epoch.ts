const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const APP_TIME_ZONE =
  process.env.APP_TIME_ZONE || "Asia/Kolkata";

/**
 * Returns the current Unix epoch timestamp in milliseconds.
 *
 * Example:
 * 1784018432000n
 */
export const nowEpoch = (): bigint => {
  return BigInt(Date.now());
};

/**
 * Returns today's date as YYYY-MM-DD using APP_TIME_ZONE.
 *
 * Example:
 * 2026-07-14
 */
export const currentDateOnly = (): string => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
};

/**
 * Converts YYYY-MM-DD into a normalized epoch timestamp.
 *
 * The stored value always represents 00:00:00 UTC for the selected
 * calendar date. This guarantees that create and filter operations
 * produce exactly the same epoch value.
 *
 * Example:
 * 2026-07-09 -> 1783555200000n
 */
export const dateOnlyToEpoch = (
  dateOnly: string
): bigint => {
  const normalizedDate = dateOnly.trim();

  if (!DATE_ONLY_REGEX.test(normalizedDate)) {
    throw new Error(
      "Date must be in YYYY-MM-DD format"
    );
  }

  const [year, month, day] = normalizedDate
    .split("-")
    .map(Number);

  const milliseconds = Date.UTC(
    year,
    month - 1,
    day,
    0,
    0,
    0,
    0
  );

  const parsedDate = new Date(milliseconds);

  /*
   * Reject impossible dates such as 2026-02-31.
   */
  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day
  ) {
    throw new Error("Invalid calendar date");
  }

  return BigInt(milliseconds);
};

/**
 * Returns today's normalized date epoch.
 */
export const currentDateEpoch = (): bigint => {
  return dateOnlyToEpoch(currentDateOnly());
};

/**
 * Converts a normalized date epoch into YYYY-MM-DD.
 */
export const epochDayToDateOnly = (
  epoch: bigint
): string => {
  const milliseconds = Number(epoch);

  if (!Number.isSafeInteger(milliseconds)) {
    throw new Error("Invalid epoch value");
  }

  return new Date(milliseconds)
    .toISOString()
    .slice(0, 10);
};

/**
 * Converts an epoch timestamp into an ISO datetime.
 */
export const epochToIso = (
  epoch: bigint
): string => {
  const milliseconds = Number(epoch);

  if (!Number.isSafeInteger(milliseconds)) {
    throw new Error("Invalid epoch value");
  }

  return new Date(milliseconds).toISOString();
};