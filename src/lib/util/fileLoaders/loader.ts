import type { State } from '$lib/types';
import { defaultState, sanitizeConfig, updateCodeStore } from '$lib/util/state.svelte';
import { fetchText } from '$lib/util/util';

// Loads a diagram from `?code=<url>&config=<url>` query params. The URLs are
// fetched client-side, so the strict Content-Security-Policy (connect-src) only
// permits same-origin resources — there is no cross-origin/3rd-party fetching.
export const loadDataFromUrl = async (): Promise<void> => {
  const searchParams = new URLSearchParams(window.location.search);
  const codeURL: string | undefined = searchParams.get('code') ?? undefined;
  const configURL: string | undefined = searchParams.get('config') ?? undefined;

  if (!codeURL) {
    return;
  }

  const code = await fetchText(codeURL);
  const config = configURL ? await fetchText(configURL) : defaultState.mermaid;

  const state: Partial<State> = {
    code,
    loader: {
      config: { codeURL, configURL },
      type: 'files'
    },
    mermaid: sanitizeConfig(config || defaultState.mermaid)
  };
  updateCodeStore({
    ...state,
    updateDiagram: true
  });
};
