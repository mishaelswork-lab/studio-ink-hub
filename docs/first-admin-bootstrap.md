# First administrator bootstrap

ArtSpace production currently has no registered users and no administrator role assignments. There is deliberately no hard-coded admin account or default password.

## When the owner is ready to create the first admin

1. Open the **Tartspace** Supabase project (`ufvabnxcpxhusbdgunmb`) and confirm the project ID before running SQL.
2. Sign up through the real ArtSpace customer login using the owner's intended administrator email. Complete email/OTP verification if enabled.
3. In the Supabase SQL Editor for that same project, look up the account's Auth UID by the verified email:

   ```sql
   select id, email
   from auth.users
   where lower(email) = lower('OWNER_EMAIL_HERE');
   ```

4. Verify the returned email is exactly the owner's account. Copy its `id` (UUID), then grant the role:

   ```sql
   insert into public.user_roles (user_id, role)
   values ('VERIFIED_AUTH_UID_HERE'::uuid, 'admin')
   on conflict (user_id, role) do nothing;
   ```

5. Verify the assignment:

   ```sql
   select ur.user_id, ur.role
   from public.user_roles ur
   join auth.users u on u.id = ur.user_id
   where lower(u.email) = lower('OWNER_EMAIL_HERE');
   ```

6. Sign out and back in to ArtSpace, then open `/admin`. Confirm the admin dashboard loads and ordinary customer accounts cannot access it.

## Security rules

- Perform this only after the owner has created and verified their own account.
- Never grant admin based on a client-provided role, profile field, or email entered into the app.
- Do not create a shared/default admin password or expose the service-role key.
- Keep the initial admin set minimal. Grant additional admin roles only after explicit owner approval.
- Do not run this procedure against any Supabase project other than Tartspace (`ufvabnxcpxhusbdgunmb`).
