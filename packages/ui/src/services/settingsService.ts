import type { SyncOptions } from "@commandojs/shared/types/SyncTypes";

export function loadSettings(): Partial<SyncOptions> {
    try {
        const raw = localStorage.getItem("commando-settings");
        if (raw) return JSON.parse(raw);
    } catch {
        /* corrupted data, use defaults */
    }
    return {};
}

export function saveSettings(opts: Partial<SyncOptions>): void {
    localStorage.setItem("commando-settings", JSON.stringify(opts));
}
