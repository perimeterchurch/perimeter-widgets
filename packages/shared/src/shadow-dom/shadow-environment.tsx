import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Environment } from 'downshift';

/**
 * Downshift Environment that points at a shadow root instead of the page
 * document. This is what makes click-outside detection and input-blur
 * detection work for components rendered inside a widget's shadow DOM.
 *
 * Why it matters: by default Downshift attaches a `mousedown` listener to
 * `document`. Inside a shadow DOM, events bubble up through the shadow
 * boundary as retargeted events whose `target` is the shadow host, not the
 * actual element clicked. Downshift's "is this click inside my combobox?"
 * check then misfires. Pointing Downshift at the shadow root fixes both
 * sides of that.
 *
 * `ShadowRoot` exposes `addEventListener`, `removeEventListener`,
 * `activeElement`, and `contains` — everything Downshift's environment
 * abstraction actually touches — so it can stand in for `Document`. We
 * cast through `unknown` because the structural types don't perfectly
 * align (ShadowRoot is a DocumentFragment, not a Document).
 */
const ShadowEnvironmentContext = createContext<Environment | undefined>(
    undefined,
);

export function ShadowEnvironmentProvider({
    shadowRoot,
    children,
}: {
    shadowRoot: ShadowRoot | undefined;
    children: ReactNode;
}) {
    const environment = useMemo<Environment | undefined>(() => {
        if (!shadowRoot) return undefined;
        return {
            addEventListener: shadowRoot.addEventListener.bind(shadowRoot),
            removeEventListener:
                shadowRoot.removeEventListener.bind(shadowRoot),
            document: shadowRoot as unknown as Document,
            Node,
        };
    }, [shadowRoot]);

    return (
        <ShadowEnvironmentContext.Provider value={environment}>
            {children}
        </ShadowEnvironmentContext.Provider>
    );
}

export function useShadowEnvironment(): Environment | undefined {
    return useContext(ShadowEnvironmentContext);
}
