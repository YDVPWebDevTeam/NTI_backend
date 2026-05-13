---
name: code-reviewer
description: Review backend or frontend code for bugs, regressions, security issues, missing guards, weak tests, and maintainability issues. Use when asked to "review this branch", "review this PR", "compare to main", "give me PR comments", or "write inline review comments". When the user wants PR-ready comments, provide each finding with exact placement guidance, the comment text to post, and a concrete suggested fix.
metadata:
  author: local
  version: "1.0.0"
  argument-hint: <branch-or-files>
---

# Code Reviewer

Review code with a PR-review mindset.

## Priorities

1. Bugs and behavioral regressions
2. Security issues: authorization gaps, data exposure, unsafe trust boundaries, missing validation, and secrets handling
3. Workflow and state-machine gaps
4. Data integrity and concurrency risks
5. Missing or weak tests around risky paths
6. Maintainability issues that are likely to cause drift or confusion

Do not lead with style nits when there are correctness issues.

## Review Workflow

1. Compare the target branch or files against the correct baseline, usually `main`.
2. Read the changed implementation and changed tests.
3. Check for:
   - dropped or regressed behavior
   - missing status or permission guards
   - security issues such as broken access control, privilege escalation, insecure defaults, unvalidated input, unsafe deserialization, or returning sensitive fields
   - schema and migration mismatches
   - DTO and API contract inconsistencies
   - concurrency/versioning issues
   - tests that miss the risky paths
4. Prefer findings that are actionable and anchored in code, not broad opinions.

## Output

Start with findings, ordered by severity. For each finding:

- State severity: `High`, `Medium`, or `Low`
- Explain the issue and impact
- Include file references

After findings, include open questions or assumptions only if they matter.

## PR-Ready Comment Format

When the user asks for PR comments, inline comments, "where should I place this", or similar, provide comments in this exact shape:

1. `<short issue title>`
   Place on: `[path](/abs/path/file.ts:line)` and mention the relevant function or block
   Comment: `<text ready to paste into GitHub review>`
   Suggested fix:
   - `<concrete implementation direction>`
   - `<optional safer alternative>`

Rules for placement guidance:

- Place the comment on the smallest code block that clearly owns the problem.
- Do not place comments on DTO mappers, tests, or unrelated helpers when the real issue is elsewhere.
- If the exact line previously referenced is wrong, correct it explicitly.
- For duplicated logic comments, place them on the duplicated helper or branch, not on a caller that merely uses it.
- For behavior mismatches, place them where the missing guard or override actually happens.

## Security Review Expectations

Treat security findings as first-class review items, not secondary style notes.

For deeper or dedicated security analysis, explicitly invoke `$security-auditor` alongside this skill.

Always check for:

- broken access control
- trust in client-provided identifiers or roles
- missing ownership checks
- leaking internal or sensitive fields in DTOs or API responses
- missing validation on externally controlled input
- unsafe raw SQL, shell, filesystem, or network usage
- workflows that allow mutation outside intended states

If a security concern is plausible but not fully proven from the diff alone, say that clearly and explain the attack path or failure mode.

## Skill Structure

This is a valid Codex skill when stored as:

- `.../code-reviewer/SKILL.md`
- `.../code-reviewer/agents/openai.yaml`

Do not move `SKILL.md` under `agents/`. The `agents/` folder is only for optional UI metadata such as `openai.yaml`.

## Comment Writing Style

- Keep comments direct and technical.
- Describe the problem before the fix.
- Prefer "This allows...", "This can cause...", or "This duplicates..." over vague wording.
- For non-blocking comments, make that clear by tone rather than by writing a long disclaimer.
- If a finding is blocking, say why merge would be risky.

## When No Issues Are Found

Say explicitly that you found no review findings, then mention any residual test gaps or unverified assumptions.
