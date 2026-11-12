import {resolveRuntime} from './runtime-policy.js'
const runtime=resolveRuntime(import.meta.env.MODE,window.location.hostname)
export const useBusinessBackend=runtime.business
export const isLocalBusinessEntry=runtime.localEntry
// Current Pages no longer starts the independent browser-only store.
export const isStaticDemo=false
