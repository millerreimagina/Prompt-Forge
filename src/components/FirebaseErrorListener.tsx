"use client";

import { useEffect } from "react";
import { errorEmitter } from "@/firebase/error-emitter";
import { useToast } from "@/hooks/use-toast";
import { FirestorePermissionError } from "@/firebase/errors";

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: Error) => {
      console.error("Firebase Error Caught:", error);

      let title = "An error occurred";
      let description = error.message;

      if (error instanceof FirestorePermissionError) {
        title = "Permission Denied";
        description = "You do not have permission to perform this action. Check Firestore security rules.";
        // In a real app, you might want to show a more user-friendly message
        // and log the detailed error for developers.
        console.error("Security Rule Context:", error.context);
      }
      
      toast({
        variant: "destructive",
        title: title,
        description: description,
      });
    };

    errorEmitter.on("permission-error", handleError);

    return () => {
      errorEmitter.off("permission-error", handleError);
    };
  }, [toast]);

  return null;
}
