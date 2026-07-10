const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const nowEpoch = (): bigint => BigInt(Date.now());

/**
 * Converts YYYY-MM-DD into a stable epoch-millisecond day key at UTC midnight.
 * The value is used as a date key, while submittedAt/uploadedAt store the real
 * moment at which an action occurred.
 */
export const dateOnlyToEpoch = (date: string): bigint => {
  const match = DATE_ONLY_PATTERN.exec(date);

  if (!match) {
    throw new Error("Date must use YYYY-MM-DD format");
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const epoch = Date.UTC(year, month - 1, day);
  const parsed = new Date(epoch);

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new Error("Date is not a valid calendar date");
  }

  return BigInt(epoch);
};

export const epochDayToDateOnly = (epoch: bigint): string =>
  new Date(Number(epoch)).toISOString().slice(0, 10);

export const epochToIso = (epoch: bigint): string =>
  new Date(Number(epoch)).toISOString();

export const getCurrentDateInTimeZone = (
  date = new Date(),
  timeZone = process.env.APP_TIME_ZONE || "UTC"
): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = Object.fromEntries(
    parts
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

export const currentDateEpoch = (): bigint =>
  dateOnlyToEpoch(getCurrentDateInTimeZone());
