// Optional build-time configuration. Client-exposed vars must keep the
// MERMAID_ prefix (see `envPrefix` in vite.config.js). Everything external —
// analytics, hosted renderers, doc links, commercial integrations — has been
// removed; the app is fully standalone and only these privacy hooks remain.
export const env = {
  hidePrivacyPolicy: import.meta.env.MERMAID_HIDE_PRIVACY_POLICY === 'true',
  privacyPolicyUrl: import.meta.env.MERMAID_PRIVACY_POLICY_URL ?? ''
} as const;
