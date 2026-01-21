"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import * as React from "react";
import { useAuth } from "@/firebase";
import { onAuthStateChanged, getIdTokenResult } from "firebase/auth";

const ADMIN_EMAILS = [
  "alexandra.ramirez@gruporeimagina.com",
  "walter.miller@gruporeimagina.com",
  "mikaela.bedregal@gruporeimagina.com",
  "soporte@gruporeimagina.com",
];

export function MainNav({ className, ...props }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const auth = useAuth();
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [isSignedIn, setIsSignedIn] = React.useState(false);

  React.useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        setIsSignedIn(false);
        return;
      }
      try {
        const t = await getIdTokenResult(u, true);
        const byClaim = t.claims?.role === "admin";
        const byEmail = !!u.email && ADMIN_EMAILS.includes(u.email);
        setIsAdmin(byClaim || byEmail);
        setIsSignedIn(true);
      } catch {
        const byEmail = !!u.email && ADMIN_EMAILS.includes(u.email);
        setIsAdmin(byEmail);
        setIsSignedIn(true);
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
    ...(isSignedIn
      ? [
          {
            href: `/admin`,
            label: "Admin",
            active: pathname.startsWith(`/admin`),
          },
        ]
      : []),
    ...(isAdmin
      ? [
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
