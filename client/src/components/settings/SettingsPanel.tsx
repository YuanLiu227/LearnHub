import { useEffect, useState } from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { HOT_REFRESH_OPTIONS, MONITOR_INTERVAL_OPTIONS } from '@/types';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const config = useAppStore(state => state.config);
  const updateConfig = useAppStore(state => state.updateConfig);
  const [localConfig, setLocalConfig] = useState(config);

  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateConfig(localConfig);
    onClose();
  };

  const formatInterval = (ms: number) => {
    if (ms === 0) return '已关闭';
    const minutes = ms / 60000;
    return minutes >= 60 ? `${minutes / 60} 小时` : `${minutes} 分钟`;
  };

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
    >
      <div className="w-[90%] max-w-[480px] bg-surface border border-border rounded-xl p-6">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-8 h-8 rounded-lg bg-white/5 text-text-secondary hover:text-text flex items-center justify-center"
        >
          <X size={18} />
        </button>

        {/* 标题 */}
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-5 h-5 text-accent" />
          <h2 className="text-base font-medium text-text">设置</h2>
        </div>

        {/* 设置项 */}
        <div className="space-y-6">
          {/* 热点刷新间隔 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text/60">
              热点定时刷新
            </label>
            <select
              value={localConfig.hotRefreshInterval}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                hotRefreshInterval: Number(e.target.value)
              })}
              className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-text text-sm cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='rgba(255,255,255,0.3)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem',
              }}
            >
              {HOT_REFRESH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary">
              当前: {formatInterval(localConfig.hotRefreshInterval)}
            </p>
          </div>

          {/* 自动监控间隔 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-text/60">
              自动监控
            </label>
            <select
              value={localConfig.monitorInterval}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                monitorInterval: Number(e.target.value)
              })}
              className="w-full px-3.5 py-2 bg-surface border border-border rounded-lg text-text text-sm cursor-pointer focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='rgba(255,255,255,0.3)' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem',
              }}
            >
              {MONITOR_INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-text-tertiary">
              当前: {formatInterval(localConfig.monitorInterval)}
            </p>
          </div>

          {/* 通知设置 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-text/60">
              通知设置
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.notificationEnabled}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  notificationEnabled: e.target.checked
                })}
                className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent/30"
              />
              <span className="text-sm text-text">浏览器通知</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.emailEnabled}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  emailEnabled: e.target.checked
                })}
                className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent/30"
              />
              <span className="text-sm text-text">邮件通知</span>
            </label>
          </div>
        </div>

        {/* 保存按钮 */}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button variant="primary" onClick={handleSave}>
            保存设置
          </Button>
        </div>
      </div>
    </div>
  );
}
