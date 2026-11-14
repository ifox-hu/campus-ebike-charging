// Reuse an existing page to preserve its filters and avoid stack exhaustion.
export function navigationTarget(pages, url) {
  const route = url.split('?')[0].replace(/^\//, '');
  if (!url.includes('?')) {
    const index = pages.map(page => page.route).lastIndexOf(route);
    if (index >= 0) return { method: 'navigateBack', delta: pages.length - 1 - index };
  }
  return { method: pages.length >= 10 ? 'redirectTo' : 'navigateTo', url };
}
