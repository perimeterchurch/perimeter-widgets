import { createContext, useContext, type ReactNode } from 'react';

const PortalContainerContext = createContext<HTMLElement | undefined>(
    undefined,
);

export function PortalContainerProvider({
    container,
    children,
}: {
    container: HTMLElement | undefined;
    children: ReactNode;
}) {
    return (
        <PortalContainerContext.Provider value={container}>
            {children}
        </PortalContainerContext.Provider>
    );
}

export function usePortalContainer(): HTMLElement | undefined {
    return useContext(PortalContainerContext);
}
