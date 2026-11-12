// Pages preserves the original management UI and catalog on every host.
export function resolveRuntime(mode,hostname) {
 return {business:mode==='connected',localEntry:false}
}
