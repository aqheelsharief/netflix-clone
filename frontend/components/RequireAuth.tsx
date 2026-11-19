"use client";

import { useAuth } from "@/context/Authcontext";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

type RequireAuthProps = {
  children: ReactNode;
  // Also require that a profile was chosen ("Who's watching?")
  requireProfile?: boolean;
};

/*
| Wrap a page with this to keep logged-out users out.
| It waits until the saved login has been checked (`loading`), so refreshing
| the page never bounces a logged-in user to /login.
*/
export default function RequireAuth({
  children,
  requireProfile = false,
}: RequireAuthProps) {
  const router = useRouter();
  const { user, selectedProfile, loading } = useAuth();

  const needsLogin = !loading && !user;
  const needsProfile = !loading && !!user && requireProfile && !selectedProfile;

  useEffect(() => {
    if (needsLogin) router.replace("/login");
    else if (needsProfile) router.replace("/profiles");
  }, [needsLogin, needsProfile, router]);

  if (loading || needsLogin || needsProfile) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white/20 border-t-red-600 rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
