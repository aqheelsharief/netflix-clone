"use client";

import { useAuth } from "@/context/Authcontext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const router = useRouter();
  const { user, selectedProfile, loading } = useAuth();

  useEffect(() => {
    // Wait until the saved login has been checked, otherwise a logged-in
    // user is briefly "null" and gets sent to /login on every refresh.
    if (loading) return;

    if (!user) router.replace("/login");
    else if (!selectedProfile) router.replace("/profiles");
    else router.replace(`/browse?p=${selectedProfile._id}`);
  }, [user, selectedProfile, loading, router]);

  return (
    <div className="min-h-screen bg-[#141414] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-white/20 border-t-red-600 rounded-full animate-spin" />
    </div>
  );
}
