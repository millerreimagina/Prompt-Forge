"use client";

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useFirestore } from '@/firebase';
import { deleteUsers, getUsers } from '@/lib/users-service';
import type { AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { MoreHorizontal, PlusCircle, Search, Trash2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged, getIdTokenResult } from 'firebase/auth';

const ADMIN_EMAILS = [
  'alexandra.ramirez@gruporeimagina.com',
  'walter.miller@gruporeimagina.com',
  'mikaela.bedregal@gruporeimagina.com',
  'soporte@gruporeimagina.com',
];

export default function UsersAdminPage() {
  const auth = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setIsAdmin(false);
        setChecking(false);
        router.replace('/');
        return;
      }
      try {
        const token = await getIdTokenResult(u, true);
        const byClaim = token.claims?.role === 'admin';
        const byEmail = !!u.email && ADMIN_EMAILS.includes(u.email);
        const admin = byClaim || byEmail;
        setIsAdmin(admin);
        if (!admin) router.replace('/');
      } finally {
        setChecking(false);
      }
    });
    return () => unsub();
  }, [auth, router]);

  const firestore = useFirestore();
  const { toast } = useToast();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (firestore) {
      getUsers(firestore).then(setUsers);
    }
  }, [firestore]);

  const filtered = useMemo(() => {
    if (!search) return users;
    const q = search.toLowerCase();
    return users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
  }, [users, search]);

  const doDelete = async () => {
    if (!firestore) return;
    const idsToDelete = userToDelete ? [userToDelete] : selected;
    if (idsToDelete.length === 0) return;
    await deleteUsers(firestore, idsToDelete);
    setUsers(prev => prev.filter(u => !idsToDelete.includes(u.id)));
    setSelected(prev => prev.filter(id => !idsToDelete.includes(id)));
    setIsDeleteOpen(false);
    setUserToDelete(null);
    toast({ title: 'Users Deleted', description: `${idsToDelete.length} user(s) have been deleted.` });
  };

  const toggleSelected = (id: string, checked: boolean) => {
    setSelected(prev => checked ? [...prev, id] : prev.filter(x => x !== id));
  };

  const roleBadge = (role: AppUser['role']) => role === 'admin' ? 'default' : 'secondary';

  if (checking) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <p className="text-sm text-muted-foreground">Checking permissions…</p>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Users</h1>
          <p className="text-muted-foreground">Manage application users.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search users..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {selected.length > 0 && (
            <Button variant="outline" onClick={() => setIsDeleteOpen(true)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete ({selected.length})
            </Button>
          )}
          <Button asChild>
            <Link href="/admin/users/new"><PlusCircle className="mr-2 h-4 w-4" /> New User</Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map(u => {
          const isSelected = selected.includes(u.id);
          return (
            <div key={u.id} className="relative group">
              <Checkbox checked={isSelected} onCheckedChange={(c) => toggleSelected(u.id, !!c)} className="absolute top-4 left-4 z-10 bg-white" />
              <Card className={cn('flex flex-col h-full transition-shadow hover:shadow-lg', isSelected && 'ring-2 ring-primary')}>
                <CardHeader>
                  <div className="flex justify-between items-start pl-8">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        {u.avatarUrl ? (
                          <AvatarImage src={u.avatarUrl} alt={u.name} />
                        ) : (
                          <AvatarFallback>{(u.name?.[0] || 'U').toUpperCase()}</AvatarFallback>
                        )}
                      </Avatar>
                      <CardTitle>{u.name}</CardTitle>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users/${u.id}`}>Edit</Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => { setUserToDelete(u.id); setIsDeleteOpen(true); }}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex gap-2 items-center pl-8 pt-2">
                    <Badge variant={roleBadge(u.role)}>{u.role}</Badge>
                    <Badge className="border-transparent">{u.company}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <p className="text-sm text-muted-foreground pl-8">{u.email}</p>
                </CardContent>
                <CardFooter>
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/admin/users/${u.id}`}>Manage</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 text-center text-muted-foreground py-16">No users found.</div>
        )}
      </div>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {userToDelete ? 1 : selected.length} user(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
