type ProgressCallback = (data: MonitorProgress) => void;

export interface MonitorProgress {
  stage: 'started' | 'collecting' | 'matching' | 'verifying' | 'completed' | 'error';
  message: string;
  matched?: number;
  verified?: number;
  total?: number;
  error?: string;
}

class ProgressEmitter {
  private listeners: Map<string, ProgressCallback[]> = new Map();
  private monitorListeners: Map<string, ProgressCallback[]> = new Map();
  private progressStore: Map<string, MonitorProgress> = new Map();

  emit(monitorId: string, progress: MonitorProgress) {
    console.log(`[ProgressEmitter] emit(${monitorId}):`, progress.stage);
    this.progressStore.set(monitorId, progress);
    const callbacks = this.monitorListeners.get(monitorId) || [];
    callbacks.forEach(cb => cb(progress));
  }

  on(monitorId: string, callback: ProgressCallback) {
    if (!this.monitorListeners.has(monitorId)) {
      this.monitorListeners.set(monitorId, []);
    }
    this.monitorListeners.get(monitorId)!.push(callback);

    // Return unsubscribe function
    return () => {
      const cbs = this.monitorListeners.get(monitorId) || [];
      const index = cbs.indexOf(callback);
      if (index > -1) cbs.splice(index, 1);
    };
  }

  getProgress(monitorId: string): MonitorProgress | undefined {
    return this.progressStore.get(monitorId);
  }

  clear(monitorId: string) {
    this.monitorListeners.delete(monitorId);
    this.progressStore.delete(monitorId);
  }
}

export const progressEmitter = new ProgressEmitter();