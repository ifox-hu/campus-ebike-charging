// Pages preserves the original management UI and catalog on every host.
export function resolveRuntime(mode, _hostname) {
  return { business: mode === 'connected', localEntry: false };
}
