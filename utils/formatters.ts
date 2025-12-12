export function formatFNumber(f: string | null | undefined): string {
    if (!f) return 'f/?';
    const num = parseFloat(f);
    return isNaN(num) ? 'f/?' : `f/${num.toFixed(1)}`;
}

export function formatExposure(time: string | null | undefined): string {
    if (!time) return '?s';
    const num = parseFloat(time);
    if (isNaN(num)) return '?s';
    if (num >= 1) return `${num.toFixed(1)}s`;
    const fraction = 1 / num;
    return `1/${Math.round(fraction)}s`;
}

export function formatISO(iso: string | null | undefined): string {
    if (!iso) return 'ISO ?';
    const num = Array.isArray(iso) ? iso[0] : iso;
    return `ISO ${num}`;
}
