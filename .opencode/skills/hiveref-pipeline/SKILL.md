---
name: hiveref-pipeline
description: Orchestrates the full multi-agent development pipeline (plan → build → review → orchestrate). Use when the user says "pipeline", "workflow", "full cycle", or asks to implement something from start to finish.
---

# HiveRef Pipeline — Multi-Agent Development Workflow

This skill orchestrates the full development cycle using 4 specialized subagents:

| Agent | Command | Role |
|-------|---------|------|
| `@planner` | Read-only | Analyze requirements, create atomic task breakdown |
| `@builder` | Full access | Implement code following TDD (test-first) |
| `@reviewer` | Read + tests | Review code, run tests, check conventions |
| `@orchestrator` | Git only | Branch, commit, PR |

## Trigger phrases

Activate this pipeline when the user says: `pipeline:`, `workflow:`, `full cycle:`, `implement from scratch`, `ciclo completo`, `faz tudo`.

## Pipeline steps

### Step 1 — Plan

```
@planner <user's requirements>
```

- The planner explores the codebase and returns an ordered list of sub-tasks
- **Review the plan with the user** before proceeding
- If the user approves, continue to Step 2

### Step 2 — Build (per sub-task)

For each sub-task from the plan, in order:

```
@builder <sub-task details>
```

- The builder follows TDD: writes tests first, then code, then refactors
- After each sub-task, **run the tests** to confirm:
  ```bash
  php artisan test --compact
  ```
- If tests fail, ask the builder to fix them
- Proceed to next sub-task only when all tests pass

### Step 3 — Review

```
@reviewer review the implementation
```

- The reviewer runs tests, linter, and checks all conventions
- **Review the review report with the user**
- If FAILED with critical issues:
  1. Go back to Step 2 (builder) for the affected sub-task
  2. Re-run Step 3 after fixes
- If APPROVED, continue to Step 4

### Step 4 — Orchestrate

```
@orchestrator prepare and create PR for the approved changes
```

- The orchestrator creates a branch, stages files, presents commits for approval, and creates a PR
- Wait for user approval before commits are made
- After PR is created, show the URL to the user

### Step 5 — Verify (human)

Notify the user:
- PR is ready at: `<URL>`
- Tests passed: `<count>`
- Lint: clean
- Next step: user reviews the PR and merges

## Error handling

| Scenario | Action |
|----------|--------|
| Builder tests fail | Ask builder to fix, re-run tests |
| Reviewer finds critical issues | Loop back to builder for affected sub-task |
| Orchestrator finds dirty state | Check `git status`, ask user how to proceed |
| User doesn't approve plan | Ask for clarification, re-run planner |
| Branch already exists | Ask user if they want to delete it or use a different name |

## Rules

- Always present the plan to the user BEFORE building
- Always present commits to the user BEFORE committing
- Always present the review report to the user BEFORE orchestrating
- Never skip steps — follow the order: Plan → Build → Review → Orchestrate
- If the user interrupts the pipeline at any step, stop and wait for instructions
