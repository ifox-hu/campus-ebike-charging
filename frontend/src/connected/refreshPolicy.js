export function createRefreshPolicy({ now = Date.now, baseInterval = 60000 } = {}) {
  let lastBase = null;
  return {
    includeBase(background = false) {
      return !background || lastBase === null || now() - lastBase >= baseInterval;
    },
    baseLoaded() {
      lastBase = now();
    },
    reset() {
      lastBase = null;
    },
  };
}
