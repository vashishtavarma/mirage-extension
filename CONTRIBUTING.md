# Contributing to Privacy Mesh

## Getting Started

```bash
git clone https://github.com/vashishtavarma/mirage-extension.git
cd mirage-extension
npm install
npm run dev     # watch mode
npm test        # run tests
```

Load the extension in Chrome: `chrome://extensions` → Developer mode → Load unpacked → select the root folder.

## What to Work On

Check open issues. Good first issues are labelled `good first issue`.

Areas that always need help:
- **Platform selectors** — AI sites change their DOM frequently. Keeping `src/content/platforms/` up to date is high-value.
- **Regex patterns** — false positives and false negatives in PII detection.
- **NER in content script context** — moving wink-nlp to run in the content script (has DOM access) to enable full NER.
- **Firefox parity** — testing and fixing bugs on Firefox.

## Pull Request Guidelines

1. **One concern per PR.** A regex fix and a new feature should be separate PRs.
2. **Tests required.** Any change to `src/engine/` must include or update unit tests in `tests/unit/`.
3. **No new external dependencies** without discussion. The extension must stay zero-backend.
4. **Security first.** Never store raw PII. Never make external network calls from extension code.

## Adding a New AI Platform

See [docs/adding-a-platform.md](docs/adding-a-platform.md).

## Code Style

- ESLint + Prettier (run `npm run lint:fix` before pushing)
- No comments unless the WHY is non-obvious
- No `console.log` in production paths (use `console.warn`/`console.error` for real issues)

## Commit Messages

```
<type>: <short summary>
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`

## Security Reports

Please do not open public issues for security vulnerabilities. Email the maintainer directly.
