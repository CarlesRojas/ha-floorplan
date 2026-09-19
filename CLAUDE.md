# Working rules

## Branch state before any work

Before starting any task, check the state of the branch you are working on against `main`:

- If the branch's pull request was merged into `main`: do not add commits to it. Start the new work on a fresh branch created from the latest `origin/main` (`git fetch origin main && git checkout -B <branch> origin/main`). Any pull request opened for it is a new one.
- If the branch was rebased or force-pushed: fetch it and continue the work on top of that.
- If the branch is open and unchanged: continue as is.

Check this on every new session and again right before every commit: fetch, confirm the branch's pull request is still open and the remote branch has not moved. Never commit on stale assumptions.

Keep working on the same branch and pull request while it is open, whatever the task. Only start a new branch when the pull request was merged or the user asks for one.

## Project

Custom Lovelace card for Home Assistant: a 3D model of the flat with entities bound to objects. React + Three.js, Vite in lib mode building a single `dist/card.js`. See `README.md` for the local Home Assistant setup.

- Package manager: pnpm. `pnpm build` runs tsc and vite, `pnpm lint` runs oxlint, `pnpm watch` rebuilds on change.
- Styling: Tailwind v4, injected into the card's shadow root from `src/index.css`. Use the `cn` helper from `src/lib/utils.ts`.
- `dist/` is bind-mounted into the Home Assistant container. Never empty it from the build config.
- Write in plain sentences. Never use em dashes, in code comments, commit messages, or docs.
- When giving the user card YAML, always give the complete card config, never a fragment to merge.
