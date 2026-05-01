import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, Key, Globe, Loader2, Save, Trash2, Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';

type SourceLabel = 'user' | 'env' | 'none' | 'default';

const SOURCE_LABELS: Record<SourceLabel, { text: string; className: string }> = {
  user: { text: '使用个人配置', className: 'text-green-400' },
  env: { text: '使用服务器默认值', className: 'text-blue-400' },
  none: { text: '未配置', className: 'text-text-tertiary' },
  default: { text: '默认开启', className: 'text-text-tertiary' },
};

function SourceIndicator({ source }: { source: string }) {
  const info = SOURCE_LABELS[source as SourceLabel] || SOURCE_LABELS.none;
  return <span className={`text-[11px] ${info.className}`}>{info.text}</span>;
}

function ApiKeyField({ label, keyName, placeholder, isPassword = false }: {
  label: string;
  keyName: string;
  placeholder: string;
  isPassword?: boolean;
}) {
  const { userConfig, updateUserConfig } = useAppStore();
  const [value, setValue] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const config = userConfig[keyName];
  const source = config?.source || 'none';

  useEffect(() => {
    if (config?.value) {
      setValue(config.value);
    }
  }, [config?.value]);

  const handleSave = async () => {
    if (!value.trim()) return;
    setSaving(true);
    await updateUserConfig(keyName, value.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleClear = async () => {
    setValue('');
    setSaving(true);
    await updateUserConfig(keyName, null);
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-text">{label}</label>
        <SourceIndicator source={source} />
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={isPassword && !showPassword ? 'password' : 'text'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full px-3.5 py-2 pr-10 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 text-sm"
          />
          {isPassword && value && (
            <button
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
        </div>
        <Button
          variant="primary"
          size="sm"
          onClick={handleSave}
          disabled={!value.trim() || saving}
        >
          {saving ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : saved ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <Save className="w-3.5 h-3.5" />
          )}
          保存
        </Button>
        {source === 'user' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={saving}
            className="text-text-tertiary hover:text-red-400"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

function DataSourceToggle({ label, description, keyName }: {
  label: string;
  description: string;
  keyName: string;
}) {
  const { userConfig, updateUserConfig } = useAppStore();
  const config = userConfig[keyName];
  const enabled = config?.value !== 'false';

  const handleToggle = async () => {
    await updateUserConfig(keyName, enabled ? 'false' : 'true');
  };

  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
      </div>
      <button
        onClick={handleToggle}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-accent' : 'bg-border'
        }`}
      >
        <motion.div
          initial={false}
          animate={{ x: enabled ? 22 : 2 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          className="absolute top-1 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
        />
      </button>
    </div>
  );
}

export function SettingsView() {
  const { fetchUserConfig } = useAppStore();

  useEffect(() => {
    fetchUserConfig();
  }, []);

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">用户设置</h2>
        <p className="text-xs text-text-tertiary mt-1">在此配置个人 API 密钥和数据源开关，未配置时将使用服务器默认值。</p>
      </div>

      {/* API 密钥区 */}
      <Card className="p-5 space-y-6">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Key className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium text-text">API 密钥</h3>
        </div>

        <ApiKeyField
          label="DeepSeek API Key"
          keyName="DEEPSEEK_API_KEY"
          placeholder="sk-..."
          isPassword
        />

        <ApiKeyField
          label="YouTube API Key"
          keyName="YOUTUBE_API_KEY"
          placeholder="AIzaSy..."
          isPassword
        />

        <ApiKeyField
          label="机场订阅链接"
          keyName="YOUTUBE_SUBSCRIPTION_URL"
          placeholder="https://example.com/api/v1/client/subscribe?token=..."
          isPassword
        />
        <p className="text-xs text-text-tertiary -mt-2">配置订阅链接后自动设置 YouTube 代理，可访问 YouTube 数据源</p>
      </Card>

      {/* 数据源开关区 */}
      <Card className="p-5 space-y-1">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Globe className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-medium text-text">数据源开关</h3>
        </div>

        <DataSourceToggle
          label="Bilibili"
          description="Bilibili 视频搜索（免费，无需密钥）"
          keyName="ENABLE_BILIBILI"
        />
        <div className="border-b border-border/50" />
        <DataSourceToggle
          label="YouTube"
          description="YouTube 视频搜索（需要配置 API 密钥）"
          keyName="ENABLE_YOUTUBE"
        />
        <div className="border-b border-border/50" />
        <DataSourceToggle
          label="编程导航"
          description="编程导航官方教程内容"
          keyName="ENABLE_CODENAV"
        />
        <div className="border-b border-border/50" />
        <DataSourceToggle
          label="鱼皮AI导航"
          description="鱼皮AI导航官方教程内容"
          keyName="ENABLE_AI_CODEFATHER"
        />
      </Card>
    </div>
  );
}
