"use client";

import Link from "next/link";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, Search, Trash2, MoreHorizontal, FileUp, FileDown } from "lucide-react";
import { useFirestore } from "@/firebase";
import { deleteOptimizers, getOptimizers, saveOptimizer } from "@/lib/optimizers-service";
import { Optimizer } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

export default function AdminDashboard() {
  const [searchTerm, setSearchTerm] = useState("");
  const [optimizers, setOptimizers] = useState<Optimizer[]>([]);
  const [selectedOptimizers, setSelectedOptimizers] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [optimizerToDelete, setOptimizerToDelete] = useState<string | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    if (firestore) {
      getOptimizers(firestore).then(setOptimizers);
    }
  }, [firestore]);

  const filteredOptimizers = useMemo(() => {
    if (!searchTerm) {
      return optimizers;
    }
    return optimizers.filter(optimizer => 
      optimizer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      optimizer.description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, optimizers]);

  const handleSelectOptimizer = (optimizerId: string, isSelected: boolean) => {
    if (isSelected) {
      setSelectedOptimizers(prev => [...prev, optimizerId]);
    } else {
      setSelectedOptimizers(prev => prev.filter(id => id !== optimizerId));
    }
  };
  
  const handleDelete = async () => {
    if (!firestore) return;
    const idsToDelete = optimizerToDelete ? [optimizerToDelete] : selectedOptimizers;
    if (idsToDelete.length === 0) return;

    try {
      await deleteOptimizers(firestore, idsToDelete);
      setOptimizers(prev => prev.filter(opt => !idsToDelete.includes(opt.id)));
      setSelectedOptimizers(prev => prev.filter(id => !idsToDelete.includes(id)));
      toast({
        title: "Optimizers Deleted",
        description: `${idsToDelete.length} optimizer(s) have been deleted.`,
      });
    } catch(error) {
       toast({
        variant: "destructive",
        title: "Delete Failed",
        description: "Could not delete the selected optimizers.",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setOptimizerToDelete(null);
    }
  }

  const promptDelete = (optimizerId?: string) => {
    if (optimizerId) {
      setOptimizerToDelete(optimizerId);
    }
    setIsDeleteDialogOpen(true);
  }

  const handleToggleStatus = async (optimizer: Optimizer) => {
    if (!firestore) return;
    const newStatus: Optimizer['status'] = optimizer.status === 'Published' ? 'Draft' : 'Published';
    const updatedOptimizer: Optimizer = { ...optimizer, status: newStatus };
    try {
      await saveOptimizer(firestore, updatedOptimizer);
      setOptimizers(prev => prev.map(opt => opt.id === optimizer.id ? updatedOptimizer : opt));
      toast({
        title: `Optimizer ${newStatus}`,
        description: `"${optimizer.name}" is now ${newStatus.toLowerCase()}.`,
      });
    } catch(error) {
       toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not update the optimizer status.",
      });
    }
  }

  const handleDuplicate = async (optimizer: Optimizer) => {
    if (!firestore) return;
    const clone: Optimizer = {
      ...optimizer,
      id: '',
      internalName: `${optimizer.internalName} (Copy)`,
      name: `${optimizer.name} (Copy)`,
      status: 'Draft',
      knowledgeBase: [...(optimizer.knowledgeBase || [])],
      generationParams: { ...(optimizer.generationParams || {}) },
      guidedInputs: [...(optimizer.guidedInputs || [])],
    };
    try {
      const newId = await saveOptimizer(firestore, clone);
      const created: Optimizer = { ...clone, id: newId };
      setOptimizers(prev => [created, ...prev]);
      toast({
        title: 'Optimizer Duplicated',
        description: `"${optimizer.name}" was duplicated as Draft.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Failed',
        description: 'Could not duplicate the optimizer.',
      });
    }
  };

  const getOrganizationBadgeColor = (organization: Optimizer['organization']) => {
    switch (organization) {
      case 'Reimagina': return 'bg-blue-200 text-blue-800';
      case 'Trend Riders': return 'bg-purple-200 text-purple-800';
      case 'Personal': return 'bg-green-200 text-green-800';
      default: return 'bg-gray-200 text-gray-800';
    }
  }

  return (
    <>
      <div className="container mx-auto py-8 px-4 md:px-6">
        <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage your content optimizers.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search optimizers..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {selectedOptimizers.length > 0 ? (
                <Button variant="outline" onClick={() => promptDelete()}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete ({selectedOptimizers.length})
                </Button>
            ) : null}
            <Button asChild>
              <Link href="/admin/optimizers/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                New Optimizer
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/admin/users">Users</Link>
            </Button>
          </div>
        </div>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOptimizers.map((optimizer) => {
              const isSelected = selectedOptimizers.includes(optimizer.id);
              return (
              <div key={optimizer.id} className="relative group">
                 <Checkbox
                  checked={isSelected}
                  onCheckedChange={(checked) => handleSelectOptimizer(optimizer.id, !!checked)}
                  className="absolute top-4 left-4 z-10 bg-white"
                  aria-label={`Select ${optimizer.name}`}
                />
                <Card className={cn("flex flex-col h-full transition-shadow hover:shadow-lg", isSelected && "ring-2 ring-primary")}>
                  <CardHeader>
                    <div className="flex justify-between items-start pl-8">
                      <CardTitle>
                        {optimizer.name}
                      </CardTitle>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleDuplicate(optimizer)}>
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(optimizer)}>
                            {optimizer.status === 'Published' ? (
                              <><FileDown className="mr-2 h-4 w-4" /> Unpublish</>
                            ) : (
                              <><FileUp className="mr-2 h-4 w-4" /> Publish</>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onSelect={() => promptDelete(optimizer.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                     <div className="flex gap-2 items-center pl-8 pt-2">
                        <Badge variant={optimizer.status === 'Published' ? 'default' : 'secondary'}>
                          {optimizer.status}
                        </Badge>
                        <Badge className={cn("border-transparent", getOrganizationBadgeColor(optimizer.organization))}>
                          {optimizer.organization}
                        </Badge>
                      </div>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-muted-foreground line-clamp-2 pl-8">{optimizer.description}</p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                      <Link href={`/admin/optimizers/${optimizer.id}`}>
                        Configure
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )
          })}
          {filteredOptimizers.length === 0 && (
            <div className="md:col-span-2 lg:col-span-3 text-center text-muted-foreground py-16">
              No optimizers found for "{searchTerm}".
            </div>
          )}
        </div>
      </div>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete {optimizerToDelete ? 1 : selectedOptimizers.length} optimizer(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOptimizerToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
