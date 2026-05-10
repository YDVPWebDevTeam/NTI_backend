---
name: security-auditor
description: Review backend or frontend code for vulnerabilities, insecure auth/session flows, risky trust boundaries, and OWASP exposure. Use when asked to perform a security audit, review authentication/authorization logic, harden APIs, or fix security findings. When the user wants security-review comments, provide each finding with exact placement guidance, comment text to post, and a concrete remediation.
metadata:
  author: local
  version: "1.0.0"
  argument-hint: <branch-or-files>
---

# Security Auditor

Review code with an application security mindset.

## Priorities

1. Broken access control and privilege escalation
2. Authentication/session weaknesses: JWT/OAuth2/SAML flow errors, token lifetime/rotation/revocation gaps, insecure cookie/session config
3. Injection and unsafe execution: SQL/NoSQL/command/template injection, SSRF, insecure deserialization
4. Sensitive data exposure: PII/secrets in logs or responses, weak crypto choices, improper key handling
5. Security misconfiguration: CORS, CSP, security headers, permissive defaults, debug exposure
6. Dependency and supply-chain risk in changed paths

Do not lead with style nits when there are exploitable or high-impact issues.

## Review Workflow

1. Compare target branch or files against the right baseline, usually `main`.
2. Start from changed files, then expand into connected auth, middleware, validation, and persistence paths.
3. Trace trust boundaries and externally controlled input.
4. Check for:
   - missing authz guards or ownership checks
   - trusting client-provided roles, user IDs, or tenant IDs
   - missing validation/sanitization on external input
   - unsafe query/command construction or external call patterns
   - leakage of secrets/internal fields in API responses or logs
   - insecure defaults in CORS/CSP/header configuration
   - tests that miss abuse and negative paths
5. Prefer findings that are practical, reproducible, and anchored in code.

## Output

Start with findings, ordered by severity. For each finding:

- State severity: `High`, `Medium`, or `Low`
- Explain the issue and impact
- Describe the likely attack path
- Include file references
- Provide concrete remediation guidance

After findings, include open questions or assumptions only if they affect risk assessment.

## PR-Ready Comment Format

When the user asks for PR comments, inline comments, or placement guidance, provide comments in this exact shape:

1. `<short issue title>`
   Place on: `[path](/abs/path/file.ts:line)` and mention the relevant function or block
   Comment: `<text ready to paste into GitHub review>`
   Suggested fix:
   - `<concrete implementation direction>`
   - `<optional safer alternative>`

Rules for placement guidance:

- Place the comment where the vulnerable behavior is introduced.
- Do not place comments on wrappers/callers when the root cause is deeper.
- If a previously referenced line is inaccurate, correct it explicitly.
- For repeated vulnerabilities, comment on the shared helper or repeated source.

## Security Review Expectations

Always evaluate these classes when relevant to the change:

- OWASP Top 10 categories (current edition)
- broken access control and authorization drift
- input validation and injection prevention
- cryptography and secret management
- session/token management
- secure error handling and information disclosure
- security logging and monitoring hooks

If risk is plausible but not fully provable from diff-only context, state uncertainty clearly and explain what evidence would confirm it.

## Skill Structure

This is a valid Codex skill when stored as:

- `.../security-auditor/SKILL.md`
- `.../security-auditor/agents/openai.yaml`

Do not move `SKILL.md` under `agents/`. The `agents/` folder is only for optional UI metadata such as `openai.yaml`.

## Comment Writing Style

- Keep comments direct and technical.
- Describe exploitability and impact before proposing the fix.
- Prefer concrete statements like "This allows..." or "This can leak...".
- If a finding is blocking, say why shipping would be risky.

## When No Issues Are Found

State explicitly that no security findings were identified, then note any residual gaps (for example, unverified runtime config, dependency scan not run, or missing abuse-case tests).
