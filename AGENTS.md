# Architecture rules
- Public artist listings use the shared approved-and-published query without mock fallbacks; database approval rules remain the security boundary.
- Artist application reviews are audited by a database trigger, not client audit writes, so direct authenticated reviews are recorded once.
- Startup animation mounts once per browser session with bounded preloading and reduced-motion support so navigation stays fast.
- Same-user auth focus/token refresh events update the session without rehydrating editable profile data so unsaved rates are preserved.