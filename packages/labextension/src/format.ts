/**
 * The type of unit used for reporting memory usage.
 */
export type MemoryUnit = 'B' | 'KB' | 'MB' | 'GB' | 'TB' | 'PB';

/**
 * The number of bytes in each memory unit.
 */
export const MEMORY_UNIT_LIMITS: {
  readonly [U in MemoryUnit]: number;
} = {
  B: 1,
  KB: 1024,
  MB: 1048576,
  GB: 1073741824,
  TB: 1099511627776,
  PB: 1125899906842624,
};

export function formatForDisplay(
  numBytes: number | undefined,
  units?: MemoryUnit | undefined
): string {
  const lu = convertToLargestUnit(numBytes, units);
  return lu[0].toFixed(2) + ' ' + lu[1];
}

/**
 * Given a number of bytes, convert to the most human-readable
 * format, (GB, TB, etc).
 * If "units" is given, convert to that scale
 */
export function convertToLargestUnit(
  numBytes: number | undefined,
  units?: MemoryUnit
): [number, MemoryUnit] {
  if (!numBytes) {
    return [0, 'B'];
  }
  if (units && units in MEMORY_UNIT_LIMITS) {
    return [numBytes / MEMORY_UNIT_LIMITS[units], units];
  } else if (numBytes < MEMORY_UNIT_LIMITS.KB) {
    return [numBytes, 'B'];
  } else if (
    MEMORY_UNIT_LIMITS.KB === numBytes ||
    numBytes < MEMORY_UNIT_LIMITS.MB
  ) {
    return [numBytes / MEMORY_UNIT_LIMITS.KB, 'KB'];
  } else if (
    MEMORY_UNIT_LIMITS.MB === numBytes ||
    numBytes < MEMORY_UNIT_LIMITS.GB
  ) {
    return [numBytes / MEMORY_UNIT_LIMITS.MB, 'MB'];
  } else if (
    MEMORY_UNIT_LIMITS.GB === numBytes ||
    numBytes < MEMORY_UNIT_LIMITS.TB
  ) {
    return [numBytes / MEMORY_UNIT_LIMITS.GB, 'GB'];
  } else if (
    MEMORY_UNIT_LIMITS.TB === numBytes ||
    numBytes < MEMORY_UNIT_LIMITS.PB
  ) {
    return [numBytes / MEMORY_UNIT_LIMITS.TB, 'TB'];
  } else {
    return [numBytes / MEMORY_UNIT_LIMITS.PB, 'PB'];
  }
}
