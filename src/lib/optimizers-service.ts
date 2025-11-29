'use client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  deleteDoc,
  Firestore,
  writeBatch,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { Optimizer } from './types';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function getOptimizersCollection(db: Firestore) {
  return collection(db, 'optimizers');
}

export async function getOptimizers(db: Firestore): Promise<Optimizer[]> {
  const optimizersCollection = getOptimizersCollection(db);
  const snapshot = await getDocs(optimizersCollection).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: optimizersCollection.path,
      operation: 'list',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw permissionError;
  });
  return snapshot.docs.map(
    (doc) => ({ ...doc.data(), id: doc.id } as Optimizer)
  );
}

export async function getOptimizer(
  db: Firestore,
  id: string
): Promise<Optimizer | null> {
  const docRef = doc(db, 'optimizers', id);
  const snapshot = await getDoc(docRef).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'get',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw permissionError;
  });
  if (snapshot.exists()) {
    return { ...snapshot.data(), id: snapshot.id } as Optimizer;
  }
  return null;
}

export async function saveOptimizer(db: Firestore, optimizer: Optimizer) {
  const { id, ...optimizerData } = optimizer;
  const docRef = id ? doc(db, 'optimizers', id) : doc(collection(db, 'optimizers'));

  setDoc(docRef, optimizerData, { merge: true }).catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: docRef.path,
      operation: 'update',
      requestResourceData: optimizerData,
    });
    errorEmitter.emit('permission-error', permissionError);
    throw permissionError;
  });

  return docRef.id;
}


export async function uploadKnowledgeBaseFile(
  file: File,
  optimizerId: string
): Promise<{ id: string; name: string; url: string }> {
  const storage = getStorage();
  const storageRef = ref(storage, `optimizers/${optimizerId}/kb/${file.name}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  return { id: file.name, name: file.name, url: downloadURL };
}

export async function deleteOptimizers(db: Firestore, optimizerIds: string[]) {
  if (optimizerIds.length === 0) {
    return;
  }
  const batch = writeBatch(db);
  optimizerIds.forEach(id => {
    const docRef = doc(db, 'optimizers', id);
    batch.delete(docRef);
  });

  batch.commit().catch((serverError) => {
    const permissionError = new FirestorePermissionError({
      path: '/optimizers',
      operation: 'delete',
    });
    errorEmitter.emit('permission-error', permissionError);
    throw permissionError;
  });
}
