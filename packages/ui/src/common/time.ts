/** Normalize Unix timestamp (seconds or ms) to a Date. */
export function toDateFromUnix(value: number | undefined): Date | null {
    if (value === undefined || value === null || Number.isNaN(value)) {
        return null;
    }
    // Go backend uses Unix seconds; JS Date expects ms.
    const ms = value < 1_000_000_000_000 ? value * 1000 : value;
    return new Date(ms);
}

/** Format file mtime for display. */
export function formatFileTime(value: number | undefined): string {
    const date = toDateFromUnix(value);
    if (!date) {
        return "";
    }
    return date.toLocaleString();
}
