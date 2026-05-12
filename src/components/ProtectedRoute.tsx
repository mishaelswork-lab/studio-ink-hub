import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { QuotesLoader } from "@/components/QuotesLoader";

interface Props {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

const ProtectedRoute = ({ children, requiredRole, redirectTo = "/login" }: Props) => {
  const { user, loading, roles, session } = useAuth();
  const [serverChecked, setServerChecked] = useState<null | boolean>(null);

  // For admin routes, perform a server-verified check (defense in depth on top of RLS).
  useEffect(() => {
    let cancelled = false;
    if (requiredRole !== "admin" || !session) { setServerChecked(null); return; }
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("verify-admin", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!cancelled) setServerChecked(!error && (data as any)?.isAdmin === true);
      } catch {
        if (!cancelled) setServerChecked(false);
      }
    })();
    return () => { cancelled = true; };
  }, [requiredRole, session]);

  if (loading || (requiredRole === "admin" && session && serverChecked === null)) {
    return <QuotesLoader fullScreen />;
  }

  if (!user) return <Navigate to={redirectTo} replace />;
  if (requiredRole && !roles.includes(requiredRole)) return <Navigate to="/" replace />;
  if (requiredRole === "admin" && serverChecked === false) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default ProtectedRoute;
