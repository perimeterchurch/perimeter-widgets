import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { resolveTokens } from '@perimeter/theme';
import { applyStyles, type StyleHandle } from '@perimeter/widget-runtime';
import { useChromeTheme } from '../lib/use-chrome-theme';
import stageCss from '../stage.css?inline';

/**
 * The stage's in-shadow portal target (the div gallery/example content renders
 * into). Exposed so an example with a portaled popup (e.g. the low-level Combobox,
 * which takes a `container`) can portal INTO the shadow root rather than to
 * document.body — where it would lose the stage's token CSS. Null until the stage
 * mounts, and outside any stage. Consume it via {@link StageContainer}.
 */
const StageContainerContext = createContext<HTMLElement | null>(null);

/**
 * Render-prop access to the {@link StageContainerContext} for MDX examples: gives
 * the example the stage's shadow-DOM portal container so popups portal in-tree
 * (themed). Renders nothing until the container exists.
 */
export function StageContainer({ children }: { children: (container: HTMLElement) => ReactNode }) {
  const container = useContext(StageContainerContext);
  return container ? <>{children(container)}</> : null;
}

/**
 * Mounts gallery content inside a shadow root through the SAME styling path a
 * shipped widget uses (applyStyles: rewriteRootToHost + widget sheet + token
 * sheet) with CSS from the same studio pipeline (now rem→px, H1). Kills the
 * light-DOM gallery divergence (parity finding H3).
 */
export function ComponentStage({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const chromeTheme = useChromeTheme();

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

  // Mirror the studio chrome theme onto the stage host so
  // `:host([data-theme="dark"])` — emitted by resolveTokens — activates the dark
  // token block, exactly as a shipped widget's host gets the attribute (see
  // WidgetPreview). Without this the gallery always renders the light token layer
  // on dark chrome, so `text-fg` content (e.g. Label) is invisible against the
  // dark stage.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (chromeTheme === 'dark') host.setAttribute('data-theme', 'dark');
    else host.removeAttribute('data-theme');
  }, [chromeTheme, container]);

  return (
    <div ref={hostRef}>
      {container
        ? createPortal(
            <StageContainerContext.Provider value={container}>
              {children}
            </StageContainerContext.Provider>,
            container,
          )
        : null}
    </div>
  );
}
