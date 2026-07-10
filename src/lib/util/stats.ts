/**
 * Analytics shim.
 *
 * This is a standalone, local-first app: it ships with NO analytics and makes
 * no tracking network calls of any kind. These functions are kept as local
 * no-ops so the call sites scattered across the app keep compiling without
 * threading a feature flag through everything.
 */

export const logEvent = (
  _name: string,
  _data?: Record<string, string | number | boolean>
): void => {
  // no-op — this build collects no analytics and sends nothing anywhere.
};

export const saveStatistics = (_stats: {
  code: string;
  renderTime: number;
  isRough: boolean;
  diagramType?: string;
}): void => {
  // no-op — this build collects no analytics and sends nothing anywhere.
};
