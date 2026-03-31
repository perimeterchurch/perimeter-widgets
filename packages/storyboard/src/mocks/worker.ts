import type { SetupWorker } from 'msw/browser';

let worker: SetupWorker | null = null;
let isActive = false;

export async function initMockWorker(): Promise<void> {
    const { setupWorker } = await import('msw/browser');
    const { handlers } = await import('@/mocks/handlers');
    worker = setupWorker(...handlers);
    await worker.start({ onUnhandledRequest: 'bypass' });
    isActive = true;
}

export function stopMockWorker(): void {
    if (worker && isActive) {
        worker.stop();
        isActive = false;
    }
}

export function startMockWorker(): void {
    if (worker && !isActive) {
        worker.start({ onUnhandledRequest: 'bypass' });
        isActive = true;
    }
}

export function isMockActive(): boolean {
    return isActive;
}
