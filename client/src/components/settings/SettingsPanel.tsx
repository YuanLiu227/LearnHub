import { useEffect, useState } from 'react';
import { X, Settings as SettingsIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
    >
      <Card
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: '480px',
          backgroundColor: '#1a1a2e',
          borderRadius: '16px',
          border: '2px solid #ff6b35',
          padding: '24px',
          color: '#e8e8e8',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#e8e8e8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {/* 标题 */}
        <div className="flex items-center gap-3 mb-6">
          <SettingsIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-light">设置</h2>
        </div>

        {/* 设置项 */}
        <div className="space-y-6">
          {/* 热点刷新间隔 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-light/80">
              热点定时刷新
            </label>
            <select
              value={localConfig.hotRefreshInterval}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                hotRefreshInterval: Number(e.target.value)
              })}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e8e8e8',
                cursor: 'pointer',
              }}
            >
              {HOT_REFRESH_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-light/40">
              当前: {formatInterval(localConfig.hotRefreshInterval)}
            </p>
          </div>

          {/* 自动监控间隔 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-light/80">
              自动监控
            </label>
            <select
              value={localConfig.monitorInterval}
              onChange={(e) => setLocalConfig({
                ...localConfig,
                monitorInterval: Number(e.target.value)
              })}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                color: '#e8e8e8',
                cursor: 'pointer',
              }}
            >
              {MONITOR_INTERVAL_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-light/40">
              当前: {formatInterval(localConfig.monitorInterval)}
            </p>
          </div>

          {/* 通知设置 */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-light/80">
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
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <span className="text-sm text-light">浏览器通知</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.emailEnabled}
                onChange={(e) => setLocalConfig({
                  ...localConfig,
                  emailEnabled: e.target.checked
                })}
                className="w-5 h-5 rounded border-white/20 bg-white/5 text-primary focus:ring-primary"
              />
              <span className="text-sm text-light">邮件通知</span>
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
      </Card>
    </div>
  );
}