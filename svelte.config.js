import adapter from '@sveltejs/adapter-static';
import 'dotenv/config';
import { sveltePreprocess } from 'svelte-preprocess';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: [sveltePreprocess({})],
  kit: {
    alias: {
      '$/*': './src/lib/*'
    },
    paths: {
      base: process.env.MERMAID_BASE_PATH ?? ''
    },
    // Strict Content-Security-Policy. This is a static SPA (adapter-static, no
    // server to set headers), so SvelteKit embeds the policy as a <meta> tag in
    // every prerendered page and hashes its own inline bootstrap script — hence
    // script-src needs no 'unsafe-inline'.
    //
    // The load-bearing line is connect-src: the browser may only open network
    // connections to our own origin and Google's Gemini endpoint. So even if a
    // user's API key were read out of localStorage by injected script, the
    // browser refuses to send it anywhere else — exfiltration is blocked.
    //
    // style-src keeps 'unsafe-inline' because Mermaid injects <style> at runtime
    // that we can't hash. This stays effective only while SvelteKit adds no
    // style hash of its own (a hash makes browsers ignore 'unsafe-inline'), so
    // do NOT set kit.inlineStyleThreshold — leaving it 0 keeps CSS external.
    //
    // frame-ancestors / X-Frame-Options are ignored in a meta-delivered CSP, so
    // clickjacking protection lives in nginx.conf instead.
    csp: {
      mode: 'hash',
      directives: {
        'default-src': ['self'],
        'script-src': ['self'],
        'style-src': ['self', 'unsafe-inline'],
        'img-src': ['self', 'data:', 'blob:'],
        'font-src': ['self', 'data:'],
        'connect-src': ['self', 'https://generativelanguage.googleapis.com'],
        'worker-src': ['self', 'blob:'],
        'object-src': ['none'],
        'base-uri': ['self'],
        'form-action': ['self']
      }
    },
    adapter: adapter({
      pages: 'docs',
      fallback: '404.html'
    })
  }
};

export default config;
