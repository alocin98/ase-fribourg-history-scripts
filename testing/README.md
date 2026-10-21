# Testing

Black-box smoke tests that run against a **running** stack (backend + frontend).
They cover the main user flow: register → log in → create a document → upload a
ZIP of pages → browse the pages.

```
testing/
├── api/                 # API tests (Vitest + fetch)
│   ├── client.ts        # Cookie- and CSRF-aware API client
│   └── smoke.test.ts
├── e2e/                 # Browser tests (Playwright)
│   └── smoke.spec.ts
├── fixtures/            # Test data (sample-document.zip: two PNG pages)
├── shared/env.ts        # Base URLs, fixture paths, unique test users
├── playwright.config.ts
└── vitest.config.ts
```

Every test creates its own throwaway user (`smoke-…@example.com`) and deletes it
afterwards, which also removes its documents and stored files.

## Setup

```bash
cd testing
npm install
npx playwright install chromium
```

## Running

Start the stack first (`make start` from the repo root), then:

```bash
npm run test:api    # API smoke tests
npm run test:e2e    # Playwright smoke tests
npm test            # both
```

Or from the repo root: `make test-api`, `make test-e2e`, `make test-smoke`.

| Variable  | Default                     | Used by                                   |
| --------- | --------------------------- | ----------------------------------------- |
| `API_URL` | `http://localhost:8000/api` | API tests                                 |
| `APP_URL` | `http://localhost:5173`     | E2E tests (the API is reached via `/api`) |

Example against a backend on another port, with Vite proxying to it:

```bash
# terminal 1 (webapp/frontend)
API_PROXY_TARGET=http://127.0.0.1:8001 npm run dev
# terminal 2 (testing)
API_URL=http://localhost:8001/api npm test
```

Debug a failing e2e test with `npx playwright test --ui` or open the trace with
`npx playwright show-trace test-results/<test>/trace.zip`.
