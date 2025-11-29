import { EventEmitter } from 'events';

// This is a global event emitter for Firebase errors.
// It's used to communicate errors from the service layer to the UI layer.
export const errorEmitter = new EventEmitter();
