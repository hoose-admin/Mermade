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

.DEFAULT_GOAL := help
.PHONY: help install dev build preview check lint format test docker-build docker-run clean clean-all

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

clean: ## Remove build output and caches (keeps node_modules)
	rm -rf docs .svelte-kit

clean-all: clean ## Also remove node_modules
	rm -rf node_modules
