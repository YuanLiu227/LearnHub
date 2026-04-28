import { useEffect } from 'react';
import { useAppStore } from '@/stores/appStore';
import { requestNotificationPermission } from '@/hooks/useNotification';

export function NotificationSetup() {
  const config = useAppStore(state => state.config);
  const updateConfig = useAppStore(state => state.updateConfig);

  useEffect(() => {
    if (config.notificationEnabled) {
      requestNotificationPermission().then(granted => {
        if (!granted) {
          updateConfig({ notificationEnabled: false });
        }
      });
    }
  }, [config.notificationEnabled, updateConfig]);

  return null;
}

export function useNotification() {
  const notify = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
      new Notification(title, { body });
    }
    console.log(`📬 Notification: ${title}`, body);
  };

  return { notify };
}
