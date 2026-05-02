-- Update membership defaults: ₹199 every 3 months
ALTER TABLE public.memberships ALTER COLUMN amount SET DEFAULT 199;
ALTER TABLE public.memberships ALTER COLUMN expires_at SET DEFAULT (now() + interval '90 days');

-- Admin audit log: records moderation/admin actions
CREATE TABLE public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL,
  action text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.admin_audit_log FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert audit log"
  ON public.admin_audit_log FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) AND auth.uid() = admin_id);

CREATE INDEX idx_admin_audit_created ON public.admin_audit_log (created_at DESC);
CREATE INDEX idx_admin_audit_target ON public.admin_audit_log (target_type, target_id);