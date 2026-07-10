# agenticDiagram — local dev shortcuts.
# Wraps the Node/pnpm bootstrap so every command "just works":
#   - pins Node to .node-version via fnm (if installed)
#   - runs the repo's pinned pnpm through corepack (no global pnpm needed)
# Run `make` (or `make help`) to see all targets.

NODE_VERSION := $(shell cat .node-version 2>/dev/null || echo 24.16.0)
FNM := $(shell command -v fnm 2>/dev/null)
export COREPACK_ENABLE_DOWNLOAD_PROMPT := 0

# Prefer running under the pinned Node via fnm; fall back to whatever's on PATH.
ifeq ($(FNM),)
  PNPM := corepack pnpm
else
  PNPM := $(FNM) exec --using $(NODE_VERSION) -- corepack pnpm
endif

# --- GCP Cloud Run config (override on the CLI, e.g. `make deploy GCP_REGION=us-west1`) ---
GCP_PROJECT   ?= mermade
GCP_REGION    ?= us-central1
SERVICE       ?= agentic-diagram
# Minimal footprint: scale-to-zero, single instance, request-billed CPU.
CR_CPU        ?= 1
CR_MEMORY     ?= 256Mi
CR_MIN        ?= 0
CR_MAX        ?= 1
CR_CONCURRENCY?= 200

.DEFAULT_GOAL := help
.PHONY: help install dev build preview check lint format test docker-build docker-run \
        gcp-check gcp-enable-apis deploy deploy-url logs undeploy clean clean-all

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

node_modules: package.json pnpm-lock.yaml
	$(PNPM) install
	@touch node_modules

install: node_modules ## Install dependencies (pinned Node via fnm + corepack pnpm)

dev: node_modules ## Run the dev server at http://localhost:3001
	$(PNPM) dev

build: node_modules ## Build the static site into docs/
	$(PNPM) build

preview: node_modules ## Preview the production build locally
	$(PNPM) preview

check: node_modules ## Type-check with svelte-check
	$(PNPM) check

lint: node_modules ## Prettier + ESLint (check only)
	$(PNPM) lint

format: node_modules ## Auto-format with Prettier
	$(PNPM) format

test: node_modules ## Run unit (Vitest) + e2e (Playwright) tests
	$(PNPM) test

docker-build: ## Build the production container image
	docker build -t agentic-diagram .

docker-run: docker-build ## Build + run the container at http://localhost:8080
	docker run --rm -p 8080:8080 agentic-diagram

# --- GCP Cloud Run ---------------------------------------------------------
# Requires the gcloud CLI (authenticated) and a GCP project. `make deploy`
# builds the container with Cloud Build (from the Dockerfile) and rolls it out.

gcp-check:
	@command -v gcloud >/dev/null || { echo "gcloud CLI not found — https://cloud.google.com/sdk/docs/install"; exit 1; }
	@test -n "$(GCP_PROJECT)" || { echo "No GCP project set. Pass GCP_PROJECT=<id> or run: gcloud config set project <id>"; exit 1; }

gcp-enable-apis: gcp-check ## One-time: enable the APIs Cloud Run source deploys need
	gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
		--project $(GCP_PROJECT)

deploy: gcp-check ## Deploy to Cloud Run (scale-to-zero, minimal resources)
	gcloud run deploy $(SERVICE) \
		--source . \
		--project $(GCP_PROJECT) \
		--region $(GCP_REGION) \
		--allow-unauthenticated \
		--port 8080 \
		--cpu $(CR_CPU) \
		--memory $(CR_MEMORY) \
		--min-instances $(CR_MIN) \
		--max-instances $(CR_MAX) \
		--concurrency $(CR_CONCURRENCY) \
		--cpu-throttling \
		--timeout 60

deploy-url: gcp-check ## Print the deployed service URL
	@gcloud run services describe $(SERVICE) --project $(GCP_PROJECT) --region $(GCP_REGION) \
		--format 'value(status.url)'

logs: gcp-check ## Tail recent Cloud Run logs
	gcloud run services logs read $(SERVICE) --project $(GCP_PROJECT) --region $(GCP_REGION) --limit 50

undeploy: gcp-check ## Delete the Cloud Run service
	gcloud run services delete $(SERVICE) --project $(GCP_PROJECT) --region $(GCP_REGION) --quiet

clean: ## Remove build output and caches (keeps node_modules)
	rm -rf docs .svelte-kit

clean-all: clean ## Also remove node_modules
	rm -rf node_modules
