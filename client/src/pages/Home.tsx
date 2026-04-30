import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  BookOpen,
  Hash,
  Loader2,
  Library,
  Plus,
  Zap,
  ChevronDown,
  X,
  Bell,
  ChevronLeft,
  ChevronRight,
  Globe,
  Youtube,
  Video,
  FileText,
  Archive,
  RotateCcw,
  Trash2,
  UserCheck,
  Star,
  CheckCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeywordForm } from '@/components/keyword-manager/KeywordForm';
import { KeywordList } from '@/components/keyword-manager/KeywordList';
import { useAppStore, type TabType } from '@/stores/appStore';
import { requestNotificationPermission } from '@/hooks/useNotification';
import { CreatorView } from '@/components/creator-manager/CreatorView';

function StatsCard({ title, value, icon: Icon, delay = 0 }: {
  title: string;
  value: number;
  icon: any;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: 'easeOut' }}
    >
      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">{title}</span>
          <Icon className="w-4 h-4 text-text-tertiary" />
        </div>
        <p className="text-3xl font-semibold text-text tracking-tight">{value.toLocaleString()}</p>
      </Card>
    </motion.div>
  );
}

const SOURCE_ICONS: Record<string, any> = {
  youtube: Youtube,
  bilibili: Video,
  codefather: FileText,
  'ai-codefather': BookOpen,
};

function SourceBadge({ sourceName }: { sourceName: string }) {
  const Icon = SOURCE_ICONS[sourceName?.toLowerCase()] || Globe;
  return (
    <Badge variant="info" className="text-[11px] flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {sourceName}
    </Badge>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const label = score >= 70 ? '优秀' : score >= 50 ? '良好' : score >= 30 ? '一般' : '较低';
  const variant = score >= 70 ? 'success' as const : score >= 50 ? 'info' as const : score >= 30 ? 'default' as const : 'danger' as const;
  return (
    <Badge variant={variant} className="text-[11px]">
      {label} ({score})
    </Badge>
  );
}

function Pagination({ page, totalPages, total, onChange }: {
  page: number;
  totalPages: number;
  total: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4">
      <span className="text-xs text-text-tertiary">共 {total} 条</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          上一页
        </button>
        <span className="text-xs text-text-secondary/80">
          {page} / {totalPages}
        </span>
        <button
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center gap-1 text-xs text-text-secondary hover:text-text disabled:text-text-tertiary disabled:cursor-not-allowed transition-colors"
        >
          下一页
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function ResourceCard({ item, delay, onDelete, onToggleComplete, onToggleFavorite, selected, onToggleSelect }: {
  item: any; delay: number;
  onDelete?: (id: string) => void;
  onToggleComplete?: (id: string, completed: boolean) => void;
  onToggleFavorite?: (id: string, favorited: boolean) => void;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onDelete) return;
    onDelete(item.id);
    setConfirmingDelete(false);
  };

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleComplete?.(item.id, !item.completed);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(item.id, !item.favorited);
  };

  return (
    <motion.a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay, ease: 'easeOut' }}
      className="block group"
    >
      <Card className={`p-4 hover:border-border-hover transition-all ${
        item.completed
          ? 'border-l-2 border-l-green-500 bg-green-500/[0.02]'
          : ''
      }`}>
        <div className="flex items-start gap-3">
          {onToggleSelect && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect(item.id); }}
              className={`mt-0.5 w-4.5 h-4.5 rounded border-2 shrink-0 flex items-center justify-center transition-all ${
                selected
                  ? 'bg-accent border-accent'
                  : 'border-border hover:border-text-tertiary'
              }`}
            >
              {selected && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <SourceBadge sourceName={item.sourceName} />
              <ScoreBadge score={item.heat} />
              {item.keywordTerm && (
                <Badge variant="default" className="text-[11px] text-text-tertiary">
                  {item.keywordTerm}
                </Badge>
              )}
              {item.creatorName && !item.keywordTerm && (
                <Badge variant="default" className="text-[11px] text-text-tertiary">
                  👤 {item.creatorName}
                </Badge>
              )}
            </div>
            <h3 className={`text-sm font-medium leading-relaxed group-hover:text-accent transition-colors line-clamp-2 ${
              item.completed ? 'text-text-secondary line-through decoration-1' : 'text-text'
            }`}>
              {item.title}
            </h3>
            {item.summary && (
              <p className={`text-xs mt-1.5 line-clamp-2 leading-relaxed ${
                item.completed ? 'text-text-tertiary' : 'text-text-secondary'
              }`}>{item.summary}</p>
            )}
            <div className="flex items-center gap-3 mt-2">
              <span className="text-[11px] text-text-tertiary">
                {new Date(item.matchedAt).toLocaleString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0 self-start">
            {onToggleComplete && (
              <motion.button
                whileTap={{ scale: 0.7 }}
                onClick={handleToggleComplete}
                className={`p-1.5 rounded-md transition-colors ${
                  item.completed
                    ? 'text-green-400 hover:bg-green-500/10'
                    : 'text-text-tertiary hover:text-green-400 hover:bg-green-500/10'
                }`}
                title={item.completed ? '标记未完成' : '标记已完成'}
              >
                <CheckCheck className={`w-4 h-4 ${item.completed ? 'fill-green-400/20' : ''}`} />
              </motion.button>
            )}
            {onToggleFavorite && (
              <motion.button
                whileTap={{ scale: 0.7 }}
                onClick={handleToggleFavorite}
                className={`p-1.5 rounded-md transition-colors ${
                  item.favorited
                    ? 'text-amber-400 hover:bg-amber-500/10 drop-shadow-[0_0_6px_rgba(251,191,36,0.3)]'
                    : 'text-text-tertiary hover:text-amber-400 hover:bg-amber-500/10'
                }`}
                title={item.favorited ? '取消收藏' : '收藏'}
              >
                <Star className={`w-4 h-4 ${item.favorited ? 'fill-amber-400' : ''}`} />
              </motion.button>
            )}
            {onDelete && !confirmingDelete && (
              <motion.button
                whileTap={{ scale: 0.7 }}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingDelete(true); }}
                className="shrink-0 p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 text-text-tertiary transition-colors"
                title="删除"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            )}
            {onDelete && confirmingDelete && (
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={handleDelete}
                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                  确认删除
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmingDelete(false); }}
                  className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.a>
  );
}

function DashboardView() {
  const PAGE_SIZE = 20;
  const {
    stats, resources, fetchStats, fetchResources,
    isSearching, searchProgress,
    isCollectingCreators, creatorCollectProgress,
    deleteResource,
    toggleComplete, toggleFavorite,
    batchDeleteResources, batchDeleteResourcesByIds,
  } = useAppStore();

  const [resourceTab, setResourceTab] = useState<'keywords' | 'creators'>('keywords');
  const [kwPage, setKwPage] = useState(1);
  const [crPage, setCrPage] = useState(1);
  const [selectedCreator, setSelectedCreator] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmBatchClear, setConfirmBatchClear] = useState(false);
  const [confirmBatchDeleteIds, setConfirmBatchDeleteIds] = useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setIsSelecting(false);
    setSelectedIds(new Set());
    setConfirmBatchDeleteIds(false);
  };

  const handleBatchDeleteByIds = () => {
    batchDeleteResourcesByIds([...selectedIds]);
    exitSelectMode();
  };

  useEffect(() => {
    fetchStats();
    fetchResources(1);
  }, []);

  // 按类型过滤
  const kwResources = resources.filter(r => r.keywordId);
  const crResources = resources.filter(r => r.creatorId && !r.keywordId)
    .sort((a, b) => (b.publishedAt || 0) - (a.publishedAt || 0));

  // 博主筛选
  const creatorNames = [...new Set(crResources.map(r => r.creatorName).filter(Boolean))] as string[];
  const crFiltered = selectedCreator
    ? crResources.filter(r => r.creatorName === selectedCreator)
    : crResources;
  const filteredResources = resourceTab === 'keywords' ? kwResources : crFiltered;
  const currentPage = resourceTab === 'keywords' ? kwPage : crPage;
  const totalFiltered = resourceTab === 'keywords' ? kwResources.length : crResources.length;
  const totalFilteredPages = Math.ceil(totalFiltered / PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    if (resourceTab === 'keywords') setKwPage(newPage);
    else setCrPage(newPage);
  };

  // 分页
  const pagedResources = filteredResources.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <div className="space-y-8">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="总资源" value={stats.totalResources} icon={Library} delay={0} />
        <StatsCard title="今日新增" value={stats.todayNew} icon={Plus} delay={0.1} />
        <StatsCard title="数据来源" value={stats.sourcesCount} icon={Globe} delay={0.2} />
        <StatsCard title="关键词" value={stats.monitoredKeywords} icon={Hash} delay={0.3} />
      </div>

      {/* 搜索进度 */}
      <AnimatePresence>
        {(isSearching && searchProgress) || (isCollectingCreators && creatorCollectProgress) ? (
          <div className="space-y-2">
            {isSearching && searchProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="p-4 border-accent/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    <p className="text-sm text-accent">{searchProgress.message}</p>
                  </div>
                </Card>
              </motion.div>
            )}
            {isCollectingCreators && creatorCollectProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="p-4 border-blue-500/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <p className="text-sm text-blue-400">{creatorCollectProgress.message}</p>
                  </div>
                </Card>
              </motion.div>
            )}
          </div>
        ) : null}
      </AnimatePresence>

      {/* 资源分类标签 */}
      <div>
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex gap-4">
            {[
              { id: 'keywords' as const, label: '关键词资源', count: kwResources.length },
              { id: 'creators' as const, label: '博主资源', count: crResources.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setResourceTab(tab.id);
                  if (tab.id === 'keywords') setKwPage(1);
                  else setCrPage(1);
                }}
                className={`flex items-center gap-1.5 text-xs font-medium transition-colors relative pb-3 -mb-3 ${
                  resourceTab === tab.id
                    ? 'text-text'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                {tab.label}
                <span className="text-[10px] opacity-60">({tab.count})</span>
                {resourceTab === tab.id && (
                  <motion.div
                    layoutId="resourceTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!confirmBatchClear ? (
              <button
                onClick={() => setConfirmBatchClear(true)}
                className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                清空
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    batchDeleteResources(resourceTab);
                    setConfirmBatchClear(false);
                  }}
                  className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                >
                  确认清空
                </button>
                <button
                  onClick={() => setConfirmBatchClear(false)}
                  className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  取消
                </button>
              </div>
            )}
            {!isSelecting ? (
              <button
                onClick={() => setIsSelecting(true)}
                className="flex items-center gap-1 text-[11px] text-text-tertiary hover:text-accent transition-colors"
              >
                选择
              </button>
            ) : (
              <button
                onClick={exitSelectMode}
                className="flex items-center gap-1 text-[11px] text-accent hover:text-text transition-colors"
              >
                取消选择
              </button>
            )}
          </div>
        </div>

        {/* 博主筛选 */}
        {resourceTab === 'creators' && creatorNames.length > 1 && (
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              onClick={() => setSelectedCreator(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                !selectedCreator
                  ? 'bg-accent/10 text-accent border border-accent/20'
                  : 'bg-surface text-text-tertiary border border-border hover:border-border-hover'
              }`}
            >
              全部
            </button>
            {creatorNames.map(name => (
              <button
                key={name}
                onClick={() => setSelectedCreator(name)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  selectedCreator === name
                    ? 'bg-accent/10 text-accent border border-accent/20'
                    : 'bg-surface text-text-tertiary border border-border hover:border-border-hover'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {pagedResources.length === 0 ? (
          <Card className="p-12 flex items-center justify-center">
            <p className="text-sm text-text-tertiary">
              {resourceTab === 'keywords' ? '暂无关键词资源，点击右上角「关键词搜索」开始查找' :
               '暂无博主资源，先关注博主后再点击「博主搜索」'}
            </p>
          </Card>
        ) : (
          <div className="space-y-2">
            {pagedResources.map((item, i) => (
              <ResourceCard
                key={item.id}
                item={item}
                delay={i * 0.03}
                onDelete={deleteResource}
                onToggleComplete={toggleComplete}
                onToggleFavorite={toggleFavorite}
                selected={isSelecting ? selectedIds.has(item.id) : undefined}
                onToggleSelect={isSelecting ? toggleSelect : undefined}
              />
            ))}
          </div>
        )}

        {/* 选择模式底部操作栏 */}
        {isSelecting && selectedIds.size > 0 && (
          <div className="sticky bottom-4 z-40 flex items-center justify-between bg-surface border border-border rounded-lg px-4 py-3 shadow-lg">
            <span className="text-xs text-text-secondary">
              已选择 {selectedIds.size} 条
            </span>
            {!confirmBatchDeleteIds ? (
              <button
                onClick={() => setConfirmBatchDeleteIds(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                批量删除
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBatchDeleteByIds}
                  className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  确认删除
                </button>
                <button
                  onClick={() => setConfirmBatchDeleteIds(false)}
                  className="px-3 py-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                >
                  取消
                </button>
              </div>
            )}
          </div>
        )}

        <Pagination
          page={currentPage}
          totalPages={totalFilteredPages}
          total={totalFiltered}
          onChange={handlePageChange}
        />
      </div>
    </div>
  );
}

function FavoritesView() {
  const PAGE_SIZE = 20;
  const {
    favoriteResources, favoriteResourcesTotal, fetchFavorites,
    toggleComplete, toggleFavorite, deleteResource,
  } = useAppStore();
  const [favPage, setFavPage] = useState(1);

  useEffect(() => {
    fetchFavorites(1);
  }, []);

  const totalPages = Math.ceil(favoriteResourcesTotal / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">收藏资源</h2>
        <span className="text-xs text-text-tertiary">共 {favoriteResourcesTotal} 条</span>
      </div>

      {favoriteResources.length === 0 ? (
        <Card className="p-12 flex items-center justify-center">
          <p className="text-sm text-text-tertiary">暂无收藏资源，点击资源的 ⭐ 图标收藏</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {favoriteResources.map((item, i) => (
            <ResourceCard
              key={item.id}
              item={item}
              delay={i * 0.03}
              onDelete={deleteResource}
              onToggleComplete={toggleComplete}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}

      <Pagination
        page={favPage}
        totalPages={totalPages}
        total={favoriteResourcesTotal}
        onChange={(p) => { setFavPage(p); fetchFavorites(p); }}
      />
    </div>
  );
}

function KeywordsView() {
  const { keywords, fetchKeywords, isSearching, searchProgress } = useAppStore();
  const [subTab, setSubTab] = useState<'keywords' | 'creators'>('keywords');

  useEffect(() => {
    fetchKeywords();
  }, []);

  const subTabs = [
    { id: 'keywords' as const, label: '关键词搜索', icon: Hash },
    { id: 'creators' as const, label: '关注的博主', icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      {/* 子标签页 */}
      <div className="flex gap-4 border-b border-border pb-3">
        {subTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setSubTab(tab.id)}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors relative pb-3 -mb-3 ${
              subTab === tab.id
                ? 'text-text'
                : 'text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
            {subTab === tab.id && (
              <motion.div
                layoutId="keywordSubTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {subTab === 'keywords' ? (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">关键词管理</h2>
            <span className="text-xs text-text-tertiary">
              {keywords.filter(k => k.enabled).length} 个监控中
            </span>
          </div>

          {/* 关键词搜索进度 */}
          <AnimatePresence>
            {isSearching && searchProgress && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <Card className="p-4 mb-4 border-accent/20">
                  <div className="flex items-center gap-3">
                    <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    <p className="text-sm text-accent">{searchProgress.message}</p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          <Card className="p-5">
            <div className="mb-5">
              <KeywordForm />
            </div>
            <KeywordList />
          </Card>
        </div>
      ) : (
        <CreatorView />
      )}
    </div>
  );
}

function OverviewView() {
  const { allKeywords, fetchAllKeywords, permanentDeleteKeyword,
          allCreators, fetchAllCreators, permanentDeleteCreator,
          restoreKeyword, restoreCreator } = useAppStore();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmCreatorDelete, setConfirmCreatorDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchAllKeywords();
    fetchAllCreators();
  }, []);

  const handlePermanentDelete = (id: string) => {
    permanentDeleteKeyword(id);
    setConfirmDelete(null);
  };

  const handlePermanentDeleteCreator = (id: string) => {
    permanentDeleteCreator(id);
    setConfirmCreatorDelete(null);
  };

  const archivedCreators = allCreators.filter(c => c.archived);

  return (
    <div className="space-y-6">
      {/* 关键词总览 */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">关键词总览</h2>
        <span className="text-xs text-text-tertiary">共 {allKeywords.length} 个关键词</span>
      </div>

      <Card className="p-5">
        <div className="text-xs text-text-secondary mb-4">
          此处显示所有已添加的关键词（含已归档）。归档的关键词不再参与搜索，学习资源保留。永久删除会同时删除该关键词关联的所有学习资源。
        </div>

        {allKeywords.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-text-tertiary">暂无关键词</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allKeywords.map((kw) => (
              <Card key={kw.id} className={`p-4 flex items-start justify-between gap-3 transition-colors ${kw.archived ? 'opacity-60' : 'hover:border-border-hover'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text truncate">{kw.term}</span>
                    {kw.archived ? (
                      <Badge variant="default">已归档</Badge>
                    ) : kw.enabled ? (
                      <Badge variant="success">监控中</Badge>
                    ) : (
                      <Badge variant="warning">已暂停</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-text-secondary">
                    <span className="text-accent">{kw.hotspotCount ?? 0} 条资源</span>
                    {kw.createdAt && (
                      <>
                        <span className="text-text-tertiary">·</span>
                        <span className="text-text-tertiary">
                          {new Date(kw.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {confirmDelete === kw.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handlePermanentDelete(kw.id)}
                      className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                    >
                      确认删除
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 shrink-0">
                    {kw.archived && (
                      <button
                        onClick={() => restoreKeyword(kw.id)}
                        className="p-1.5 rounded-md hover:bg-green-500/10 hover:text-green-400 text-text-tertiary transition-all"
                        title="恢复关键词"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmDelete(kw.id)}
                      className="shrink-0 p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 text-text-tertiary transition-all"
                      title="永久删除关键词及关联资源"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>

      {/* 博主归档 */}
      <div className="flex items-center justify-between mt-8">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">博主归档</h2>
        <span className="text-xs text-text-tertiary">共 {archivedCreators.length} 个归档博主</span>
      </div>

      <Card className="p-5">
        <div className="text-xs text-text-secondary mb-4">
          此处显示所有已归档的博主。归档后不再收集内容，学习资源保留。永久删除会同时删除该博主关联的所有学习资源。
        </div>

        {archivedCreators.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-xs text-text-tertiary">暂无归档博主</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {archivedCreators.map((cr) => (
              <Card key={cr.id} className="p-4 flex items-start justify-between gap-3 opacity-60 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-text truncate">{cr.channelName}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                      cr.platform === 'youtube'
                        ? 'bg-red-500/10 text-red-400'
                        : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {cr.platform === 'youtube' ? 'YouTube' : 'Bilibili'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs text-text-secondary">
                    {cr.createdAt && (
                      <span className="text-text-tertiary">
                        关注于 {new Date(cr.createdAt).toLocaleDateString('zh-CN')}
                      </span>
                    )}
                  </div>
                </div>

                {confirmCreatorDelete === cr.id ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handlePermanentDeleteCreator(cr.id)}
                      className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                    >
                      确认删除
                    </button>
                    <button
                      onClick={() => setConfirmCreatorDelete(null)}
                      className="px-2 py-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      onClick={() => restoreCreator(cr.id)}
                      className="p-1.5 rounded-md hover:bg-green-500/10 hover:text-green-400 text-text-tertiary transition-all"
                      title="恢复博主"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmCreatorDelete(cr.id)}
                      className="shrink-0 p-1.5 rounded-md hover:bg-red-500/10 hover:text-red-400 text-text-tertiary transition-all"
                      title="永久删除博主及关联资源"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function SearchView() {
  const [searchPage, setSearchPage] = useState(1);
  const SEARCH_PAGE_SIZE = 20;
  const { searchQuery, setSearchQuery, searchResults, searchTotal, searchResources, deleteResource, toggleComplete, toggleFavorite } = useAppStore();
  const [inputValue, setInputValue] = useState(searchQuery);

  const totalSearchPages = Math.ceil(searchTotal / SEARCH_PAGE_SIZE);

  const handleSearch = () => {
    setSearchQuery(inputValue);
    setSearchPage(1);
    searchResources(inputValue, 1);
  };

  const handleSearchPageChange = (newPage: number) => {
    setSearchPage(newPage);
    searchResources(inputValue, newPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">知识搜索</h2>
        {searchQuery && (
          <span className="text-xs text-text-tertiary">{searchTotal} 条结果</span>
        )}
      </div>

      <Card className="p-5">
        <div className="flex gap-3 mb-5">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入你想学习的知识点..."
            className="flex-1 px-3.5 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 text-sm"
          />
          <Button onClick={handleSearch} disabled={!inputValue.trim()}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>

        {searchResults.length === 0 && searchQuery ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-tertiary">未找到匹配的学习资源</p>
          </div>
        ) : (
          <div className="space-y-2">
            {searchResults.map((item, i) => (
              <ResourceCard key={item.id} item={item} delay={i * 0.03} onDelete={deleteResource} onToggleComplete={toggleComplete} onToggleFavorite={toggleFavorite} />
            ))}
          </div>
        )}

        <Pagination
          page={searchPage}
          totalPages={totalSearchPages}
          total={searchTotal}
          onChange={handleSearchPageChange}
        />
      </Card>
    </div>
  );
}

export function Home() {
  const {
    activeTab,
    setActiveTab,
    triggerSearch,
    isSearching,
    isCollectingCreators,
    triggerCreatorCollect,
    newResourceItems,
    clearNewResourceItems,
    error,
    clearError,
  } = useAppStore();

  const [showNotificationPanel, setShowNotificationPanel] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setShowNotificationPanel(false);
      }
    };
    if (showNotificationPanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotificationPanel]);

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'dashboard', label: '资源总览', icon: Library },
    { id: 'favorites', label: '收藏资源', icon: Star },
    { id: 'keywords', label: '关键词', icon: Hash },
    { id: 'overview', label: '关键词总览', icon: Archive },
    { id: 'search', label: '知识搜索', icon: Search },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-text">
      {/* 点阵背景 */}
      <div className="fixed inset-0 bg-dot-grid pointer-events-none" />

      {/* 头部 */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-5">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-accent" />
              </div>
              <span className="text-sm font-semibold text-text tracking-tight">LearnHub</span>
            </div>

            <div className="flex items-center gap-2" ref={panelRef}>
              {/* 通知按钮 */}
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-lg border text-xs transition-colors ${
                  newResourceItems.length > 0
                    ? 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/15'
                    : 'bg-transparent border-border text-text-tertiary hover:text-text hover:border-border-hover'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                {newResourceItems.length > 0 ? `${newResourceItems.length} 条新资源` : '暂无更新'}
                <ChevronDown className={`w-3 h-3 transition-transform ${showNotificationPanel ? 'rotate-180' : ''}`} />
              </button>

              {/* 通知展开面板 */}
              <AnimatePresence>
                {showNotificationPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute right-0 top-full mt-2 w-80 bg-surface border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-medium text-text">最新资源</h3>
                      <button onClick={() => setShowNotificationPanel(false)} className="text-text-tertiary hover:text-text transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {newResourceItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-text-tertiary">暂无新资源</div>
                    ) : (
                      <>
                        <div className="max-h-80 overflow-y-auto divide-y divide-border">
                          {newResourceItems.map(item => (
                            <a
                              key={item.id}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                <SourceBadge sourceName={item.sourceName} />
                                <span className="text-[10px] text-text-tertiary">
                                  <ScoreBadge score={item.heat ?? 50} />
                                </span>
                              </div>
                              <p className="text-xs text-text leading-relaxed line-clamp-2">{item.title}</p>
                              <p className="text-[10px] text-text-tertiary mt-1">
                                {new Date(item.matchedAt).toLocaleString('zh-CN', {
                                  month: 'numeric',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </a>
                          ))}
                        </div>
                        <div className="p-3 border-t border-border">
                          <button
                            onClick={() => {
                              clearNewResourceItems();
                              setShowNotificationPanel(false);
                            }}
                            className="w-full text-center text-xs text-text-tertiary hover:text-text transition-colors"
                          >
                            清空通知
                          </button>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* 全局搜索按钮 */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => triggerSearch()}
                disabled={isSearching}
                className="bg-accent hover:bg-accent/90 text-white border-0"
              >
                {isSearching ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                关键词搜索
              </Button>
              <Button
                size="sm"
                onClick={() => triggerCreatorCollect()}
                disabled={isCollectingCreators}
                className="bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20"
              >
                {isCollectingCreators ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5" />
                )}
                博主搜索
              </Button>
            </div>
          </div>

          {/* Tab 导航 */}
          <div className="flex gap-6 -mb-px">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 pb-3 text-xs font-medium transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-text'
                    : 'text-text-tertiary hover:text-text-secondary'
                }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent rounded-full"
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 错误提示 */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="max-w-5xl mx-auto px-5 pt-4"
          >
            <Card className="p-4 border-accent/20">
              <div className="flex items-center justify-between">
                <p className="text-xs text-red-400">{error}</p>
                <button onClick={clearError} className="text-xs text-red-400/50 hover:text-red-400 ml-4">
                  关闭
                </button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 主内容 */}
      <main className="max-w-5xl mx-auto px-5 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {activeTab === 'dashboard' && <DashboardView />}
            {activeTab === 'favorites' && <FavoritesView />}
            {activeTab === 'keywords' && <KeywordsView />}
            {activeTab === 'overview' && <OverviewView />}
            {activeTab === 'search' && <SearchView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <p className="text-xs text-text-tertiary">LearnHub — 学习中心</p>
        </div>
      </footer>
    </div>
  );
}
