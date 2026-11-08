# Architecture rules
- Public artist listings use the shared approved-and-published query without mock fallbacks; database approval rules remain the security boundary.
- Artist application reviews are audited by a database trigger, not client audit writes, so direct authenticated reviews are recorded once.
- Startup animation mounts once per browser session with bounded preloading and reduced-motion support so navigation stays fast.
- Same-user auth focus/token refresh events update the session without rehydrating editable profile data so unsaved rates are preserved.- Payment amounts, memberships, boosts and referral use are decided only by the payment functions from platform settings and verified gateway data; clients send gateway ids, never prices, so browsers cannot underpay or self-grant.
- State-based OG eligibility is permanently allocated by a database trigger using a restricted atomic per-state counter; artist state options are shared across signup forms to keep allocation consistent.
