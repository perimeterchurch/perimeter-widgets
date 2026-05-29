export interface InstanceHandle {
  unmount(): void;
  /** Called by applyOverrides to re-resolve tokens on this instance. */
  updateTokens(overrides: Record<string, string>): void;
}

const cssMap = new Map<string, string>();
const instances = new Map<string, Set<InstanceHandle>>();

export function registerCss(name: string, cssText: string): void {
  cssMap.set(name, cssText);
}

export function getCss(name: string): string | undefined {
  return cssMap.get(name);
}

export function registerInstance(name: string, handle: InstanceHandle): void {
  let set = instances.get(name);
  if (!set) {
    set = new Set();
    instances.set(name, set);
  }
  set.add(handle);
}

export function deregisterInstance(name: string, handle: InstanceHandle): void {
  instances.get(name)?.delete(handle);
}

export function getInstances(name: string): InstanceHandle[] {
  return Array.from(instances.get(name) ?? []);
}

export function clearAll(): void {
  cssMap.clear();
  instances.clear();
}
