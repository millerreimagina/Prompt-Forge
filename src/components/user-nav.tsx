"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import * as React from "react";
import { useRouter } from "next/navigation";

export function UserNav() {
  const userAvatar = PlaceHolderImages.find(p => p.id === 'user-avatar');
  const auth = useAuth();
  const [email, setEmail] = React.useState<string | null>(null);
  const [photoURL, setPhotoURL] = React.useState<string | null>(null);
  const [cacheBust, setCacheBust] = React.useState<number>(0);
  const router = useRouter();

  React.useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setEmail(u?.email ?? null);
      setPhotoURL(u?.photoURL ?? null);
      setCacheBust(Date.now());
    });
    const handler = () => {
      const u = auth.currentUser;
      setPhotoURL(u?.photoURL ?? null);
      setCacheBust(Date.now());
    };
    window.addEventListener('auth-profile-updated', handler as EventListener);
    return () => {
      window.removeEventListener('auth-profile-updated', handler as EventListener);
      unsub();
    };
  }, [auth]);

  // Also bump cache when the url string changes
  React.useEffect(() => {
    if (photoURL) setCacheBust(Date.now());
  }, [photoURL]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            {photoURL ? (
              <AvatarImage
                key={cacheBust}
                src={`${photoURL}${photoURL.includes('?') ? '&' : '?'}v=${cacheBust}`}
                alt="User avatar"
                onError={() => setCacheBust(Date.now())}
              />
            ) : (
              userAvatar && (
                <Image
                  src={userAvatar.imageUrl}
                  alt={userAvatar.description}
                  width={36}
                  height={36}
                  data-ai-hint={userAvatar.imageHint}
                  className="rounded-full"
                />
              )
            )}
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{email ? 'Signed in' : 'Guest'}</p>
            <p className="text-xs leading-none text-muted-foreground break-all">
              {email ?? 'Not signed in'}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {email ? (
          <DropdownMenuItem
            onClick={async () => {
              await signOut(auth);
              router.push('/login');
            }}
          >
            Log out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem asChild>
            <Link href="/login">Sign in</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
