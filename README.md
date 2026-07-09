# agenticDiagram

A local-first Mermaid diagram editor — edit, preview, and export diagrams in the
browser. Fork of [`mermaid-js/mermaid-live-editor`](https://github.com/mermaid-js/mermaid-live-editor)
(SvelteKit + Svelte 5 + Vite), reworked as a personal local tool.

Custom additions on top of the fork: multi-tab editing, a warm light/dark reskin,
in-editor AI edits (bring your own Google Gemini API key), and saving `.mmd` files
straight to disk.

## Run it locally

The `Makefile` wraps the toolchain — it pins Node to `.node-version` via
[`fnm`](https://github.com/Schniz/fnm) and runs the repo's pinned pnpm through
corepack, so no global pnpm is needed:

```sh
make dev      # installs deps if needed, then serves at http://localhost:3001
```

Run `make` on its own to list every target:

| Target | What it does |
| --- | --- |
| `make dev` | Start the dev server (port 3001) |
| `make build` | Build the static site into `docs/` |
| `make preview` | Serve the production build locally |
| `make check` | Type-check with `svelte-check` |
| `make lint` / `make format` | Prettier + ESLint |
| `make test` | Unit (Vitest) + e2e (Playwright) |
| `make clean` | Remove build output and caches |
| `make docker-run` | Build + run the container at http://localhost:8080 |

Prefer raw pnpm? The underlying scripts (`pnpm dev`, `pnpm build`, …) still work
if you have the right Node (≥ 24.16.0; the repo is `engine-strict`).

The app builds to a fully static site (`adapter-static`), so its output deploys
anywhere with no server runtime.

## Deploy to GCP (Cloud Run)

The included `Dockerfile` builds the static site and serves it with nginx on port
8080 (Cloud Run's default). To deploy:

```sh
gcloud run deploy agentic-diagram \
  --source . \
  --region <your-region> \
  --allow-unauthenticated
```

To build/run the container locally:

```sh
docker build -t agentic-diagram .
docker run --rm -p 8080:8080 agentic-diagram   # http://localhost:8080
```

## License

MIT — see [`LICENSE`](./LICENSE). Inherits from mermaid-live-editor.
