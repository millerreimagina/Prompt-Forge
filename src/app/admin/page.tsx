import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { optimizers } from "@/lib/optimizers";
import { PlusCircle } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your content optimizers.</p>
        </div>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          New Optimizer
        </Button>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {optimizers.map((optimizer) => (
          <Card key={optimizer.id} className="flex flex-col">
            <CardHeader>
              <CardTitle className="flex justify-between items-start">
                {optimizer.name}
                <Badge variant={optimizer.status === 'Published' ? 'default' : 'secondary'}>
                  {optimizer.status}
                </Badge>
              </CardTitle>
              <CardDescription className="line-clamp-2">{optimizer.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="text-sm text-muted-foreground space-y-2">
                <p><span className="font-semibold">Model:</span> {optimizer.model.provider} / {optimizer.model.model}</p>
                <p><span className="font-semibold">Language:</span> {optimizer.language}</p>
              </div>
            </CardContent>
            <CardFooter>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/admin/optimizers/${optimizer.id}`}>
                  Configure
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
