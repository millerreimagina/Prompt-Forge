"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useAuth } from "@/firebase";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const auth = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);

  React.useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        return;
      }
      try {
        const t = await getIdTokenResult(u, true);
        setIsAdmin(t.claims?.role === "admin");
      } catch {
        setIsAdmin(false);
      }
    });
    return () => unsub();
  }, [auth]);

  const routes = [
    {
      href: `/`,
      label: "Chat",
      active: pathname === `/`,
    },
    ...(isAdmin
      ? [
          {
            href: `/admin`,
            label: "Admin",
            active: pathname.startsWith(`/admin`),
          },
          {
            href: `/admin/users`,
            label: "Users",
            active: pathname.startsWith(`/admin/users`),
          },
        ]
      : []),
  ];

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            route.active
              ? "text-black dark:text-white"
              : "text-muted-foreground"
          )}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
