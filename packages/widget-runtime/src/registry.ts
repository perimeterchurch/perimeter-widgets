export interface InstanceHandle {
  unmount(): void;
  /** Re-resolve tokens on this instance (used by the studio theme editor). */
  updateTokens(overrides: Partial<Record<string, string>>): void;
}

const instances = new Map<string, Set<InstanceHandle>>();

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
  instances.clear();
}
