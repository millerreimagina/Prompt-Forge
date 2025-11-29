import { optimizers } from "@/lib/optimizers";
import { OptimizerForm } from "@/components/admin/optimizer-form";
import { notFound } from "next/navigation";

export default function OptimizerPage({ params }: { params: { id: string } }) {
  const optimizer = optimizers.find((opt) => opt.id === params.id);

  if (!optimizer) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configure Optimizer</h1>
        <p className="text-muted-foreground">Editing "{optimizer.name}"</p>
      </div>
      <OptimizerForm optimizer={optimizer} />
    </div>
  );
}
