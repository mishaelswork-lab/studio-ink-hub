# Dependency security

The pre-launch CI audit identified production dependency advisories. A one-time, non-forced npm audit remediation is being run on the dedicated security branch.

Policy:
- Do not use `npm audit fix --force`.
- Keep direct dependency ranges and update the lockfile only where npm can resolve a compatible patched release.
- Require TypeScript, production build, and unit tests to pass before retaining the lockfile update.
- Require no high or critical production dependency advisories before release.
- Re-run the full CI workflow after the lockfile update.

This document will be updated with the verified result.
