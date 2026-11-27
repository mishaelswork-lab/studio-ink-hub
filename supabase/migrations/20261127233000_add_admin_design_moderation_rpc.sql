CREATE OR REPLACE FUNCTION private.admin_moderate_design(p_design_id uuid,p_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public,private AS $$
DECLARE v_admin uuid:=auth.uid();
BEGIN
 IF v_admin IS NULL OR NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id=v_admin AND role='admin') THEN
  RAISE EXCEPTION 'Admin access required' USING ERRCODE='42501';
 END IF;
 UPDATE public.designs SET is_public=false WHERE id=p_design_id;
 IF NOT FOUND THEN RETURN false; END IF;
 INSERT INTO public.admin_audit_log(action,target_type,target_id,admin_id,reason,metadata)
 VALUES('design_unpublished','design',p_design_id,v_admin,NULLIF(trim(p_reason),''),'{}'::jsonb);
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION private.admin_moderate_design(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.admin_moderate_design(uuid,text) TO authenticated;
CREATE OR REPLACE FUNCTION public.admin_moderate_design(p_design_id uuid,p_reason text DEFAULT NULL)
RETURNS boolean LANGUAGE sql SECURITY INVOKER SET search_path=pg_catalog,public,private
AS $$ SELECT private.admin_moderate_design(p_design_id,p_reason) $$;
REVOKE ALL ON FUNCTION public.admin_moderate_design(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.admin_moderate_design(uuid,text) TO authenticated;