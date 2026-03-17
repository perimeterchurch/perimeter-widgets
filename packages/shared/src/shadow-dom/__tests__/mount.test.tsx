import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountWidget, type MountResult } from '../mount';

function TestComponent() {
    return <div data-testid="test-widget">Hello Widget</div>;
}

describe('mountWidget', () => {
    const mountResults: MountResult[] = [];

    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        // Clean up all mounted widgets to prevent React async work after teardown
        for (const result of mountResults) {
            result.destroy();
        }
        mountResults.length = 0;
    });

    function mount(options: Parameters<typeof mountWidget>[0]) {
        const result = mountWidget(options);
        if (result) mountResults.push(result);
        return result;
    }

    it('returns null if target element does not exist', () => {
        const result = mount({
            elementId: 'nonexistent',
            component: TestComponent,
            styles: '',
        });
        expect(result).toBeNull();
    });

    it('creates a shadow root on the target element', () => {
        const el = document.createElement('div');
        el.id = 'test-widget';
        document.body.appendChild(el);

        mount({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '',
        });

        expect(el.shadowRoot).not.toBeNull();
    });

    it('injects styles into the shadow root', () => {
        const el = document.createElement('div');
        el.id = 'test-widget';
        document.body.appendChild(el);

        mount({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '.test { color: red; }',
        });

        const styleTag = el.shadowRoot?.querySelector('style');
        expect(styleTag?.textContent).toContain('.test { color: red; }');
    });

    it('returns a destroy function that unmounts the widget', () => {
        const el = document.createElement('div');
        el.id = 'test-widget';
        document.body.appendChild(el);

        const result = mount({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '',
        });

        expect(result).not.toBeNull();
        expect(result!.destroy).toBeInstanceOf(Function);

        // Should not throw
        result!.destroy();
        // Remove from tracking since we already destroyed it
        mountResults.pop();
    });

    it('reuses existing shadow root on re-mount', () => {
        const el = document.createElement('div');
        el.id = 'test-widget';
        document.body.appendChild(el);

        mount({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '',
        });

        const shadowRoot = el.shadowRoot;

        // Re-mount should not throw
        const result = mount({
            elementId: 'test-widget',
            component: TestComponent,
            styles: '',
        });

        expect(result).not.toBeNull();
        expect(el.shadowRoot).toBe(shadowRoot);
    });
});
