// Public Pages opens the local system; it does not host Java or MySQL.
export function resolveRuntime(mode,hostname) {
 const loopback=['127.0.0.1','localhost','[::1]','::1'].includes(hostname)
 return {business:mode==='connected'||mode==='pages'&&loopback,localEntry:mode==='pages'&&!loopback}
}
