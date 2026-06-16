# OpenSpec workflow

Funds Manager uses [OpenSpec](https://github.com/Fission-AI/OpenSpec) for spec-driven changes: propose → implement → archive.

## Layout

| Path | Purpose |
|------|---------|
| `openspec/specs/` | Current truth — capabilities after changes land |
| `openspec/changes/<name>/` | Active change (proposal, tasks, delta specs) |
| `openspec/changes/archive/` | Completed changes (dated folders) |

Each change folder typically contains:

- `.openspec.yaml` — schema metadata
- `proposal.md` — why, what, impact
- `tasks.md` — checklist for implementation (`- [ ]` / `- [x]`)
- `design.md` — optional technical notes
- `specs/<capability>/spec.md` — ADDED/MODIFIED/REMOVED requirements

See archived examples under `openspec/changes/archive/`.

## Flow

### 1. Propose (on `main` or early in branch)

Create `openspec/changes/<change-name>/` with at least `proposal.md` and `tasks.md`. Link the GitHub issue in the proposal.

Use Cursor OpenSpec commands if available: `/opsx:propose`, `/opsx:explore`.

### 2. Apply (on `feature/<issue>-<slug>`)

Implement `tasks.md` on your delivery branch. Check off tasks as you complete them.

`/opsx:apply` — implement remaining tasks against the change.

### 3. PR

Include spec artifacts in the PR. Reference the issue: `Closes #N`.

### 4. Archive (after merge)

Sync merged deltas into `openspec/specs/`, then move the change folder:

```bash
openspec archive <change-name> -y
```

Or manually copy spec updates and move to `openspec/changes/archive/YYYY-MM-DD-<change-name>/`.

## When to use OpenSpec

- New features, API changes, multi-file UI work
- Anything that benefits from a written proposal before code

Skip for tiny fixes (typos, one-line bugs) — issue + PR is enough.

## Index

`openspec/changes/README.md` lists planned and in-flight changes.
