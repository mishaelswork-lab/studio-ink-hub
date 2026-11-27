# Dependency security

The latest completed dependency audit on 27 November 2026 reported **15 production dependency advisories**:
- 12 high
- 2 moderate
- 1 low
- 0 critical

The audit identified compatible fixes for all listed packages. A one-time automated lockfile remediation was attempted but GitHub Actions did not schedule any jobs for the temporary workflow revision. The temporary workflow change has been removed; no dependency versions or lockfile entries were changed by that attempt.

Release requirements:
- Apply compatible fixes with `npm audit fix` (never `--force`) in a local or dedicated maintenance environment.
- Commit the resulting lockfile and verify `npm ci`, TypeScript, production build, unit tests, and a fresh `npm audit --omit=dev`.
- Do not publish while high-severity production advisories remain.
