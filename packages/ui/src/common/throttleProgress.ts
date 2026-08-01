export interface ProgressTick {
    file: string;
    action: string;
    done: number;
    total: number;
}

const THROTTLE_MS = 120;

export interface ProgressThrottler {
    push: (tick: ProgressTick) => void;
    flush: () => void;
}

/** Throttle high-frequency CLI progress lines; call flush before job ends. */
export function createProgressThrottler(
    onTick: (tick: ProgressTick) => void
): ProgressThrottler {
    let pending: ProgressTick | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = (): void => {
        if (timer) {
            clearTimeout(timer);
            timer = null;
        }
        if (!pending) {
            return;
        }
        onTick(pending);
        pending = null;
    };

    const push = (tick: ProgressTick): void => {
        pending = tick;
        if (timer) {
            return;
        }
        timer = setTimeout(flush, THROTTLE_MS);
    };

    return { push, flush };
}
