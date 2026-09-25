import { useEffect } from "react";
import { useAuthStore } from "@/features/auth/store";

export function Boot({ children }: { children: React.ReactNode }) {
  const fetchMe = useAuthStore((s) => s.fetchMe);
  useEffect(() => {
    void fetchMe();
  }, [fetchMe]);
  return children;
}
