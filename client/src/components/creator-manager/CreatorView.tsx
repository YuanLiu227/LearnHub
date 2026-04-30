import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Youtube, Video, Archive, Plus, Loader2, UserCheck, ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import type { FollowedCreator } from '@/types';

function CreatorCard({ creator, onToggle, onArchive }: {
  creator: FollowedCreator;
  onToggle: (id: string, enabled: boolean) => void;
  onArchive: (id: string) => void;
}) {
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  const handleArchive = () => {
    onArchive(creator.id);
    setConfirmingArchive(false);
  };

  const Icon = creator.platform === 'youtube' ? Youtube : Video;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="p-4 hover:border-border-hover transition-colors">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              creator.platform === 'youtube'
                ? 'bg-red-500/10 text-red-400'
                : 'bg-blue-500/10 text-blue-400'
            }`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-text truncate">{creator.channelName}</span>
                <Badge variant={creator.platform === 'youtube' ? 'danger' : 'info'} className="text-[10px]">
                  {creator.platform === 'youtube' ? 'YouTube' : 'Bilibili'}
                </Badge>
              </div>
              {creator.lastFetchedAt && (
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  上次获取: {new Date(creator.lastFetchedAt).toLocaleString('zh-CN', {
                    month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={creator.platform === 'youtube'
                ? `https://www.youtube.com/channel/${creator.channelId}`
                : `https://space.bilibili.com/${creator.channelId}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-md hover:bg-accent/10 hover:text-accent text-text-tertiary transition-all"
              title="打开博主主页"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={() => onToggle(creator.id, !creator.enabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                creator.enabled ? 'bg-accent' : 'bg-border'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                creator.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'
              }`} />
            </button>
            {!confirmingArchive ? (
              <button
                onClick={() => setConfirmingArchive(true)}
                className="p-1.5 rounded-md hover:bg-amber-500/10 hover:text-amber-400 text-text-tertiary transition-all"
                title="归档博主（保留学习资源）"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
            ) : (
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleArchive}
                  className="px-2 py-1 text-xs bg-amber-500/20 text-amber-400 rounded hover:bg-amber-500/30 transition-colors"
                >
                  确认归档
                </button>
                <button
                  onClick={() => setConfirmingArchive(false)}
                  className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}

export function CreatorView() {
  const {
    followedCreators,
    fetchFollowedCreators,
    addFollowedCreator,
    toggleFollowedCreator,
    archiveCreator,
  } = useAppStore();

  const [platform, setPlatform] = useState<'youtube' | 'bilibili'>('bilibili');
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetchFollowedCreators();
  }, []);

  const handleAdd = async () => {
    if (!query.trim() || adding) return;
    setAdding(true);
    try {
      await addFollowedCreator(platform, query.trim());
      setQuery('');
    } finally {
      setAdding(false);
    }
  };

  const enabledCount = followedCreators.filter(c => c.enabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">关注的博主</h2>
        <span className="text-xs text-text-tertiary">
          {enabledCount}/{followedCreators.length} 个监控中
        </span>
      </div>

      {/* 添加表单 */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setPlatform('bilibili')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                platform === 'bilibili'
                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  : 'bg-surface text-text-tertiary border border-border hover:border-border-hover'
              }`}
            >
              <Video className="w-3.5 h-3.5 inline mr-1.5" />
              Bilibili
            </button>
            <button
              onClick={() => setPlatform('youtube')}
              className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                platform === 'youtube'
                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                  : 'bg-surface text-text-tertiary border border-border hover:border-border-hover'
              }`}
            >
              <Youtube className="w-3.5 h-3.5 inline mr-1.5" />
              YouTube
            </button>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder={platform === 'bilibili' ? '输入 Bilibili UP 主名称...' : '输入 YouTube 频道名称或 @handle...'}
            className="flex-1 px-3.5 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 text-sm"
          />
          <Button onClick={handleAdd} disabled={!query.trim() || adding}>
            {adding ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            关注
          </Button>
        </div>
        <p className="text-[11px] text-text-tertiary mt-3">
          添加后，系统会在搜索时自动获取该博主的最新内容
        </p>
      </Card>

      {/* 博主列表 */}
      {followedCreators.length === 0 ? (
        <Card className="p-12 flex items-center justify-center">
          <div className="text-center">
            <UserCheck className="w-8 h-8 text-text-tertiary mx-auto mb-3" />
            <p className="text-sm text-text-tertiary">还没有关注的博主</p>
            <p className="text-xs text-text-tertiary mt-1">在上方输入博主名称开始关注</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2">
          {followedCreators.map(creator => (
            <CreatorCard
              key={creator.id}
              creator={creator}
              onToggle={toggleFollowedCreator}
              onArchive={archiveCreator}
            />
          ))}
        </div>
      )}
    </div>
  );
}
