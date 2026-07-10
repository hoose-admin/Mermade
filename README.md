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
| `make deploy` | Deploy to GCP Cloud Run (scale-to-zero) |
| `make deploy-url` / `make logs` | Print the service URL / tail logs |

Prefer raw pnpm? The underlying scripts (`pnpm dev`, `pnpm build`, …) still work
if you have the right Node (≥ 24.16.0; the repo is `engine-strict`).

The app builds to a fully static site (`adapter-static`), so its output deploys
anywhere with no server runtime.

## Deploy to GCP (Cloud Run)

The included `Dockerfile` builds the static site and serves it with nginx on port
8080 (Cloud Run's default). Deploys use Cloud Build from source — no local Docker
or image registry wrangling needed.

One-time (defaults target project `mermade` in `us-central1`):

```sh
gcloud auth login
make gcp-enable-apis     # enables Cloud Run, Cloud Build, Artifact Registry
```

Then deploy (and grab the URL):

```sh
make deploy              # builds + rolls out; scale-to-zero, minimal resources
make deploy-url          # print the public https URL
make logs                # tail recent logs
```

`make deploy` is tuned to cost ~nothing when idle: it scales to **zero**
instances (`--min-instances 0`), caps at a **single** instance
(`--max-instances 1`), and uses a small request-billed instance (1 vCPU / 256Mi,
CPU only allocated while serving a request). Any of it can be overridden inline,
e.g. to bump memory or use a different service name:

```sh
make deploy CR_MEMORY=512Mi SERVICE=my-diagrams
```

To build/run the container locally instead:

```sh
make docker-run          # http://localhost:8080
```

## License

MIT — see [`LICENSE`](./LICENSE). Inherits from mermaid-live-editor.
