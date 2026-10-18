"use client";

import { useEffect } from "react";
import { useUserStore } from "@/store/user.store";
import type { UserRecord } from "@/lib/drizzle/schema";
import { toast } from "sonner";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export function AuthInitializer({
  initialUser,
}: {
  initialUser: UserRecord | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    useUserStore.setState({ user: initialUser, isLoading: false });
  }, [initialUser]);

  useEffect(() => {
    const authError = searchParams.get("auth_error");
    if (authError) {
      toast.error(decodeURIComponent(authError));
      const newParams = new URLSearchParams(searchParams.toString());
      newParams.delete("auth_error");
      const nextQuery = newParams.toString();
      const nextUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(nextUrl);
    }
  }, [searchParams, router, pathname]);

  return null;
}
