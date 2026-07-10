/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly MERMAID_PRIVACY_POLICY_URL?: string;
  readonly MERMAID_HIDE_PRIVACY_POLICY?: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
