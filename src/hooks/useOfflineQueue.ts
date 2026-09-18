import { useState, useEffect } from 'react';

interface QueuedAction {
  id: string;
  type: 'ASSIGN_EPI' | 'RETURN_EPI';
  payload: any;
  timestamp: number;
}

export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queue, setQueue] = useState<QueuedAction[]>([]);

  useEffect(() => {
    // Load queue from localStorage
    const saved = localStorage.getItem('offline_queue');
    if (saved) {
      try {
        setQueue(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse offline queue');
      }
    }

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addToQueue = (action: Omit<QueuedAction, 'id' | 'timestamp'>) => {
    const newAction: QueuedAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };
    
    const newQueue = [...queue, newAction];
    setQueue(newQueue);
    localStorage.setItem('offline_queue', JSON.stringify(newQueue));
  };

  const removeFromQueue = (id: string) => {
    const newQueue = queue.filter(q => q.id !== id);
    setQueue(newQueue);
    localStorage.setItem('offline_queue', JSON.stringify(newQueue));
  };

  const clearQueue = () => {
    setQueue([]);
    localStorage.removeItem('offline_queue');
  };

  return {
    isOnline,
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue
  };
}
