import type { SetupWorker } from 'msw/browser';

const STORAGE_KEY = 'storyboard-mock-enabled';

let worker: SetupWorker | null = null;
let isActive = false;

/** Check if mocks should be enabled (persisted across reloads) */
export function shouldUseMocks(): boolean {
    const stored = localStorage.getItem(STORAGE_KEY);
    // Default to true (mock mode) unless explicitly disabled
    return stored !== 'false';
}

export async function initMockWorker(): Promise<void> {
    const { setupWorker } = await import('msw/browser');
    const { handlers } = await import('@/mocks/handlers');
    worker = setupWorker(...handlers);
    await worker.start({ onUnhandledRequest: 'bypass' });
    isActive = true;
    localStorage.setItem(STORAGE_KEY, 'true');
}

export async function stopMockWorker(): Promise<void> {
    if (worker && isActive) {
        worker.stop();
        isActive = false;
    }
    localStorage.setItem(STORAGE_KEY, 'false');
}

export async function startMockWorker(): Promise<void> {
    if (worker && !isActive) {
        await worker.start({ onUnhandledRequest: 'bypass' });
        isActive = true;
    }
    localStorage.setItem(STORAGE_KEY, 'true');
}

export function isMockActive(): boolean {
    return isActive;
}
