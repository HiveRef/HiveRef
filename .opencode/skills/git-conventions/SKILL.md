---
name: git-conventions
description: Use when creating commits, branches, or preparing PRs. Enforces Conventional Commits, grouped commits with user approval, branch naming @user/numero/tipo/nome, and user-only push.
---

## Commits

### Conventional Commits

Every commit message MUST follow the [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>: <short description>

<optional body>
```

Types: `feat:`, `fix:`, `test:`, `refactor:`, `chore:`, `docs:`, `style:`, `perf:`.

### Grouping

Before showing commits to the user, group related changes into as few commits as makes sense:

- One `feat:` commit for a feature + its tests, lint fixes, etc.
- One `fix:` for a bugfix + its tests.
- One `refactor:` for structural changes.
- Separate `test:` commits only when adding tests for already-shipped code.

### Approval workflow

**NEVER commit without user approval.** Present the proposed commit(s) to the user:

```markdown
I'll make these commits:

1. `feat: implement login with GitHub OAuth`
2. `fix: handle rate limit on codespace creation`

May I proceed?
```

Wait for confirmation before staging or committing.

### Staging

Stage only intended files. Use `git add <file>` for specific files, never `git add .` or `git add -A` unless explicitly asked.

```
git add app/Actions/Github/Login.php
git add tests/Feature/GitHub/LoginTest.php
```

Check `git status` and `git diff --cached` before committing to verify correctness.

### DO NOT

- `git push` — the user pushes manually.
- `git commit --amend` — creates a new commit instead.
- `git rebase` or `git merge` — unless explicitly asked.
- `git commit --no-verify` — never skip hooks.
- `git config` changes.

---

## Branches

### Naming convention

```
@{username}/{issue-number}/{type}/{kebab-case-name}
```

Examples:
- `@carlosegoulart/9/feat/DeepSeek-opencode-Integration`
- `@carlosegoulart/10/fix/webhook-rate-limit`
- `@carlosegoulart/11/refactor/prompt-analysis`
- `@carlosegoulart/12/test/codespace-provisioning`

Types: `feat/`, `fix/`, `refactor/`, `test/`, `chore/`, `docs/`.

### Creating branches

When creating a branch, derive the issue number from the branch being worked on. If unsure, ask the user for the issue number.

```bash
git checkout -b @carlosegoulart/13/feat/new-feature
```

### DO NOT

- Push the branch — the user handles pushes.
- Delete branches.
- Force-push.
