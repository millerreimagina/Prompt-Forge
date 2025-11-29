
"use client";

import { useState } from "react";
import type { Optimizer } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { testOptimizer } from "@/ai/flows/test-optimizer-with-example-input";
import { Badge } from "@/components/ui/badge";
import { Info, BrainCircuit, Bot, Database, SlidersHorizontal, ListChecks, FlaskConical, Loader2, Save, FileText, X, PlusCircle, Trash2, Pencil } from "lucide-react";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";

const availableModels = [
    { provider: 'OpenAI', model: 'gpt-4-turbo' },
    { provider: 'Anthropic', model: 'claude-3-sonnet' },
    { provider: 'Google', model: 'gemini-1.5-pro' },
    { provider: 'Custom', model: 'custom' },
];

type GuidedInput = Optimizer['guidedInputs'][0];

export function OptimizerForm({ optimizer }: { optimizer: Optimizer }) {
  const [formData, setFormData] = useState<Optimizer>(optimizer);
  const { toast } = useToast();

  const [testInput, setTestInput] = useState("");
  const [testResult, setTestResult] = useState<{ aiResponse: string; fullPrompt: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [knowledgeBaseFiles, setKnowledgeBaseFiles] = useState<File[]>([]);

  const [models, setModels] = useState(availableModels);
  const [newModel, setNewModel] = useState({ provider: "", model: "" });
  const [isAddModelDialogOpen, setIsAddModelDialogOpen] = useState(false);

  const [isGuidedInputDialogOpen, setIsGuidedInputDialogOpen] = useState(false);
  const [currentGuidedInput, setCurrentGuidedInput] = useState<Partial<GuidedInput> | null>(null);

  const handleFilesChange = (files: File[]) => {
    setKnowledgeBaseFiles(files);
    // Here you would typically handle the file upload to a server
    // and update the optimizer's knowledgeBase array.
    // For now, we'll just update the local state.
    const newKb = files.map(file => ({ id: file.name, name: file.name }));
    setFormData(prev => ({...prev, knowledgeBase: newKb}));
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const result = await testOptimizer({
        optimizerName: formData.name,
        exampleInput: testInput,
      });
      setTestResult(result);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: "An error occurred while testing the optimizer.",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Saving data:", formData);
    toast({
      title: "Optimizer Saved",
      description: `Changes to "${formData.name}" have been saved.`,
    });
  };

  const handleAddModel = () => {
    if (newModel.provider && newModel.model) {
      const newModelOption = { provider: newModel.provider, model: newModel.model };
      setModels([...models, newModelOption]);
      setFormData(prev => ({ ...prev, model: { ...prev.model, ...newModelOption }}));
      setNewModel({ provider: "", model: "" });
      setIsAddModelDialogOpen(false);
    }
  };

  const handleModelChange = (value: string) => {
    const [provider, modelName] = value.split('/');
    setFormData(prev => ({ ...prev, model: { ...prev.model, provider, model: modelName }}));
  }

  const openAddGuidedInput = () => {
    setCurrentGuidedInput({ id: `input-${Date.now()}`, label: '', required: false });
    setIsGuidedInputDialogOpen(true);
  };

  const openEditGuidedInput = (input: GuidedInput) => {
    setCurrentGuidedInput(input);
    setIsGuidedInputDialogOpen(true);
  };

  const handleSaveGuidedInput = () => {
    if (currentGuidedInput && currentGuidedInput.label) {
      const existingInput = formData.guidedInputs.find(i => i.id === currentGuidedInput.id);
      if (existingInput) {
        // Update existing
        setFormData(prev => ({
          ...prev,
          guidedInputs: prev.guidedInputs.map(i => i.id === currentGuidedInput.id ? currentGuidedInput as GuidedInput : i)
        }));
      } else {
        // Add new
        setFormData(prev => ({
          ...prev,
          guidedInputs: [...prev.guidedInputs, currentGuidedInput as GuidedInput]
        }));
      }
      setIsGuidedInputDialogOpen(false);
      setCurrentGuidedInput(null);
    }
  };

  const handleDeleteGuidedInput = (id: string) => {
    setFormData(prev => ({
      ...prev,
      guidedInputs: prev.guidedInputs.filter(i => i.id !== id)
    }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <Tabs defaultValue="general">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 lg:grid-cols-7 mb-6 h-auto flex-wrap">
          <TabsTrigger value="general"><Info className="mr-2 h-4 w-4"/>General</TabsTrigger>
          <TabsTrigger value="model"><Bot className="mr-2 h-4 w-4"/>AI Model</TabsTrigger>
          <TabsTrigger value="prompt"><BrainCircuit className="mr-2 h-4 w-4"/>System Prompt</TabsTrigger>
          <TabsTrigger value="kb"><Database className="mr-2 h-4 w-4"/>Knowledge</TabsTrigger>
          <TabsTrigger value="params"><SlidersHorizontal className="mr-2 h-4 w-4"/>Parameters</TabsTrigger>
          <TabsTrigger value="inputs"><ListChecks className="mr-2 h-4 w-4"/>Inputs</TabsTrigger>
          <TabsTrigger value="testing"><FlaskConical className="mr-2 h-4 w-4"/>Testing</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Information</CardTitle>
              <CardDescription>Define the basic details of your optimizer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Visible Name</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
                </div>
                <div>
                  <Label htmlFor="internalName">Internal Name</Label>
                  <Input id="internalName" value={formData.internalName} onChange={(e) => setFormData({...formData, internalName: e.target.value})} />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="language">Language</Label>
                  <Select value={formData.language} onValueChange={(value) => setFormData({...formData, language: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: 'Published' | 'Draft') => setFormData({...formData, status: value})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Published">Published</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="model">
          <Card>
            <CardHeader>
              <CardTitle>AI Model Configuration</CardTitle>
              <CardDescription>Set the AI model and its parameters for this optimizer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div>
                  <Label>Model</Label>
                  <Select 
                    value={`${formData.model.provider}/${formData.model.model}`}
                    onValueChange={handleModelChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a model" />
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((m, i) => (
                        <SelectItem key={i} value={`${m.provider}/${m.model}`}>
                          {m.provider} / {m.model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Dialog open={isAddModelDialogOpen} onOpenChange={setIsAddModelDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" />Add New Model</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Model</DialogTitle>
                      <DialogDescription>
                        Add a new provider and model to the list.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="provider" className="text-right">
                          Provider
                        </Label>
                        <Input
                          id="provider"
                          value={newModel.provider}
                          onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="model-name" className="text-right">
                          Model
                        </Label>
                        <Input
                          id="model-name"
                          value={newModel.model}
                          onChange={(e) => setNewModel({ ...newModel, model: e.target.value })}
                          className="col-span-3"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" onClick={handleAddModel}>Save Model</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
              <div>
                <Label>Temperature: <Badge variant="secondary">{formData.model.temperature}</Badge></Label>
                <Slider value={[formData.model.temperature]} max={1} step={0.1} onValueChange={([val]) => setFormData({...formData, model: {...formData.model, temperature: val}})} />
              </div>
              <div>
                <Label>Max Tokens: <Badge variant="secondary">{formData.model.maxTokens}</Badge></Label>
                <Slider value={[formData.model.maxTokens]} max={4096} step={64} onValueChange={([val]) => setFormData({...formData, model: {...formData.model, maxTokens: val}})} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="prompt">
           <Card>
            <CardHeader>
              <CardTitle>System Prompt</CardTitle>
              <CardDescription>This is the core instruction that defines the optimizer's behavior.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea value={formData.systemPrompt} onChange={(e) => setFormData({...formData, systemPrompt: e.target.value})} rows={10} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kb">
          <Card>
            <CardHeader>
              <CardTitle>Knowledge Base</CardTitle>
              <CardDescription>Manage modular knowledge blocks for this optimizer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader 
                onFilesChange={handleFilesChange}
                accept="application/pdf, text/plain, .md"
                multiple
              />
              <div className="space-y-2">
                <h4 className="font-semibold">Attached Files</h4>
                {knowledgeBaseFiles.length > 0 ? (
                  <ul className="space-y-2">
                    {knowledgeBaseFiles.map((file, i) => (
                      <li key={i} className="flex items-center justify-between rounded-md border p-3">
                        <div className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm font-medium">{file.name}</span>
                        </div>
                         <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleFilesChange(knowledgeBaseFiles.filter((_, index) => index !== i))}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">No knowledge bases attached.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="params">
          <Card>
            <CardHeader>
              <CardTitle>Generation Parameters</CardTitle>
              <CardDescription>Control how the content is generated.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Number of Variants: <Badge variant="secondary">{formData.generationParams.variants}</Badge></Label>
                <Slider value={[formData.generationParams.variants]} max={10} step={1} onValueChange={([val]) => setFormData({...formData, generationParams: {...formData.generationParams, variants: val}})} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="explain-reasoning" checked={formData.generationParams.explainReasoning} onCheckedChange={(checked) => setFormData({...formData, generationParams: {...formData.generationParams, explainReasoning: checked}})} />
                <Label htmlFor="explain-reasoning">Explain reasoning</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="inputs">
            <Card>
                <CardHeader>
                    <CardTitle>Guided Inputs</CardTitle>
                    <CardDescription>Define what information to ask the user before generation.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        {formData.guidedInputs.map(input => (
                            <div key={input.id} className="flex items-center justify-between rounded-md border p-3">
                                <div>
                                    <p className="font-medium">{input.label}</p>
                                    <Badge variant={input.required ? "default" : "secondary"} className="mt-1">
                                        {input.required ? "Required" : "Optional"}
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => openEditGuidedInput(input)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteGuidedInput(input.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                            </div>
                        ))}
                        {formData.guidedInputs.length === 0 && <p className="text-sm text-muted-foreground">No guided inputs defined.</p>}
                    </div>
                     <Button type="button" variant="outline" onClick={openAddGuidedInput}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Add Input
                    </Button>
                </CardContent>
            </Card>
        </TabsContent>
        
        <TabsContent value="testing">
          <Card>
            <CardHeader>
              <CardTitle>Integrated Testing</CardTitle>
              <CardDescription>Test your optimizer with an example input and see the results instantly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test-input">Example Input</Label>
                <Textarea id="test-input" placeholder="Enter your test input here..." value={testInput} onChange={(e) => setTestInput(e.target.value)} />
              </div>
              <Button type="button" onClick={handleTest} disabled={isTesting}>
                {isTesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Test
              </Button>
              {testResult && (
                <div className="space-y-4 pt-4 border-t">
                  <div>
                    <h3 className="font-semibold mb-2">AI Response</h3>
                    <Card className="bg-muted">
                      <CardContent className="p-4 text-sm whitespace-pre-wrap">{testResult.aiResponse}</CardContent>
                    </Card>
                  </div>
                   <div>
                    <h3 className="font-semibold mb-2">Full Prompt Sent to Model</h3>
                    <Card className="bg-muted">
                      <CardContent className="p-4 text-sm text-muted-foreground whitespace-pre-wrap">{testResult.fullPrompt}</CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      <div className="mt-6 flex justify-end">
        <Button type="submit">
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

       <Dialog open={isGuidedInputDialogOpen} onOpenChange={setIsGuidedInputDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentGuidedInput?.id?.startsWith('input-') ? 'Add' : 'Edit'} Guided Input</DialogTitle>
            <DialogDescription>
              Configure the question you want to ask the user.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="guided-input-label" className="text-right">
                Label
              </Label>
              <Input
                id="guided-input-label"
                value={currentGuidedInput?.label || ''}
                onChange={(e) => setCurrentGuidedInput(prev => ({...prev, label: e.target.value}))}
                className="col-span-3"
                placeholder="e.g., What is the goal of this post?"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-start-2 col-span-3 flex items-center space-x-2">
                <Checkbox 
                  id="guided-input-required"
                  checked={currentGuidedInput?.required || false}
                  onCheckedChange={(checked) => setCurrentGuidedInput(prev => ({...prev, required: !!checked}))}
                />
                <Label htmlFor="guided-input-required">
                  Required
                </Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsGuidedInputDialogOpen(false)}>Cancel</Button>
            <Button type="button" onClick={handleSaveGuidedInput}>Save Input</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}

    