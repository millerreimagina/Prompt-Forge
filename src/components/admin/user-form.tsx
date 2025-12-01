"use client";

import { useState } from 'react';
import type { AppUser } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore, useStorage } from '@/firebase';
import { saveUser } from '@/lib/users-service';
import { Loader2, Save } from 'lucide-react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { reload } from 'firebase/auth';

export function UserForm({ user }: { user: AppUser }) {
  const [formData, setFormData] = useState<AppUser>(user);
  const [isSaving, setIsSaving] = useState(false);
  const firestore = useFirestore();
  const storage = useStorage();
  const auth = useAuth();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore) return;
    setIsSaving(true);
    try {
      const savedId = await saveUser(firestore, formData);
      setFormData((prev: AppUser) => ({ ...prev, id: savedId }));
      // If the admin updated their own profile, refresh auth profile and notify listeners
      if (auth?.currentUser && auth.currentUser.uid === savedId) {
        try {
          await reload(auth.currentUser);
          window.dispatchEvent(new CustomEvent('auth-profile-updated'));
        } catch {}
      }
      toast({ title: 'User Saved', description: `Changes to "${formData.name}" have been saved.` });
    } catch (e: any) {
      const msg = e?.message || 'Could not save the user.';
      toast({ variant: 'destructive', title: 'Save Failed', description: msg });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>User</CardTitle>
          <CardDescription>Manage user details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Profile Photo</Label>
              <div className="flex items-center gap-3 mt-2">
                <div className="h-12 w-12 rounded-full overflow-hidden border bg-muted flex items-center justify-center">
                  {formData.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={formData.avatarUrl} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs text-muted-foreground">No photo</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer select-none px-3 py-2 border rounded-md hover:bg-muted">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        setUploadError(null);
                        const f = e.target.files?.[0] || null;
                        if (!f) return;
                        const MAX = 5 * 1024 * 1024;
                        if (f.size > MAX) {
                          setUploadError('Image exceeds 5MB.');
                          e.currentTarget.value = '';
                          return;
                        }
                        try {
                          setIsUploading(true);
                          const safeName = f.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
                          const keyBase = formData.id ? formData.id : `temp-${Date.now()}`;
                          const path = `avatars/${keyBase}-${safeName}`;
                          const storageRef = ref(storage, path);
                          await uploadBytes(storageRef, f, { contentType: f.type });
                          const url = await getDownloadURL(storageRef);
                          setFormData((prev: AppUser) => ({ ...prev, avatarUrl: url }));
                          toast({ title: 'Photo uploaded', description: 'Profile photo updated.' });
                        } catch (err: any) {
                          setUploadError(err?.message || 'Upload failed');
                        } finally {
                          setIsUploading(false);
                        }
                      }}
                    />
                  </label>
                  {formData.avatarUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setFormData((prev: AppUser) => ({ ...prev, avatarUrl: undefined }))}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              </div>
              {uploadError && <p className="text-xs text-destructive mt-1">{uploadError}</p>}
              {isUploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={formData.role} onValueChange={(v: AppUser['role']) => setFormData({ ...formData, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="company">Company</Label>
              <Select value={formData.company} onValueChange={(v: AppUser['company']) => setFormData({ ...formData, company: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reimagina">Reimagina</SelectItem>
                  <SelectItem value="Trend Riders">Trend Riders</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save User
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
