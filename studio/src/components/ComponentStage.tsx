import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { resolveTokens } from '@perimeter/theme';
import { applyStyles, type StyleHandle } from '@perimeter/widget-runtime';
import stageCss from '../stage.css?inline';

/**
 * Mounts gallery content inside a shadow root through the SAME styling path a
 * shipped widget uses (applyStyles: rewriteRootToHost + widget sheet + token
 * sheet) with CSS from the same studio pipeline (now rem→px, H1). Kills the
 * light-DOM gallery divergence (parity finding H3).
 */
export function ComponentStage({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
    const styles: StyleHandle = applyStyles(
      shadow,
      'studio-component-stage',
      stageCss,
      resolveTokens({}).cssText,
    );
    const root = document.createElement('div');
    shadow.appendChild(root);
    setContainer(root);
    return () => {
      styles.dispose();
      setContainer(null);
    };
  }, []);

  return <div ref={hostRef}>{container ? createPortal(children, container) : null}</div>;
}
