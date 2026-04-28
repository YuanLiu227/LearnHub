import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame,
  Search,
  Bell,
  Loader2,
  LayoutDashboard,
  AlertTriangle,
  Plus,
  Zap,
  ChevronDown,
  X,
  ExternalLink,
  Hash,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeywordForm } from '@/components/keyword-manager/KeywordForm';
import { KeywordList } from '@/components/keyword-manager/KeywordList';
import { useAppStore, type TabType } from '@/stores/appStore';
import { requestNotificationPermission } from '@/hooks/useNotification';

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

function DashboardView() {
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const { stats, hotspots, hotspotsTotal, fetchStats, fetchHotspots, isMonitoring, monitorProgress } = useAppStore();

  useEffect(() => {
    fetchStats();
    fetchHotspots(1);
  }, []);

  const totalPages = Math.ceil(hotspotsTotal / PAGE_SIZE);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchHotspots(newPage);
  };

  return (
    <div className="space-y-8">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatsCard title="总热点" value={stats.totalHotspots} icon={Flame} delay={0} />
        <StatsCard title="今日新增" value={stats.todayNew} icon={Plus} delay={0.1} />
        <StatsCard title="紧急热点" value={stats.urgentHot} icon={AlertTriangle} delay={0.2} />
        <StatsCard title="监控关键词" value={stats.monitoredKeywords} icon={Hash} delay={0.3} />
      </div>

      {/* 监控进度 */}
      <AnimatePresence>
        {isMonitoring && monitorProgress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="p-4 border-accent/20">
              <div className="flex items-center gap-3">
                <Loader2 className="w-4 h-4 text-accent animate-spin" />
                <p className="text-sm text-accent">{monitorProgress.message}</p>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 热点列表 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">热点列表</h2>
          <span className="text-xs text-text-tertiary">{hotspotsTotal} 条</span>
        </div>

        {hotspots.length === 0 ? (
          <Card className="p-12 flex items-center justify-center">
            <p className="text-sm text-text-tertiary">暂无热点，点击右上角「立即检查」开始监控</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {hotspots.map((item, i) => (
              <motion.a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03, ease: 'easeOut' }}
                className="block group"
              >
                <Card className="p-4 hover:border-border-hover transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {item.isUrgent && (
                          <Badge variant="danger" className="text-[11px]">紧急</Badge>
                        )}
                        <Badge variant="info" className="text-[11px]">{item.sourceName}</Badge>
                        <Badge variant="default" className="text-[11px]">
                          {item.heat ? (item.heat > 66 ? 'High' : item.heat > 33 ? 'Medium' : 'Low') : 'Medium'}
                        </Badge>
                        <Badge variant="default" className="text-[11px] text-text-tertiary">
                          {item.keywordTerm}
                        </Badge>
                      </div>
                      <h3 className="text-sm text-text font-medium leading-relaxed group-hover:text-accent transition-colors line-clamp-2">
                        {item.title}
                      </h3>
                      {item.summary && (
                        <p className="text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">{item.summary}</p>
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
                        <ExternalLink className="w-3 h-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.a>
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={hotspotsTotal}
          onChange={handlePageChange}
        />
      </div>
    </div>
  );
}

function KeywordsView() {
  const { keywords, fetchKeywords } = useAppStore();

  useEffect(() => {
    fetchKeywords();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">关键词管理</h2>
        <span className="text-xs text-text-tertiary">
          {keywords.filter(k => k.enabled).length} 个监控中
        </span>
      </div>

      <Card className="p-5">
        <div className="mb-5">
          <KeywordForm />
        </div>
        <KeywordList />
      </Card>
    </div>
  );
}

function SearchView() {
  const [searchPage, setSearchPage] = useState(1);
  const SEARCH_PAGE_SIZE = 20;
  const { searchQuery, setSearchQuery, searchResults, searchTotal, searchHotspots } = useAppStore();
  const [inputValue, setInputValue] = useState(searchQuery);

  const totalSearchPages = Math.ceil(searchTotal / SEARCH_PAGE_SIZE);

  const handleSearch = () => {
    setSearchQuery(inputValue);
    setSearchPage(1);
    searchHotspots(inputValue, 1);
  };

  const handleSearchPageChange = (newPage: number) => {
    setSearchPage(newPage);
    searchHotspots(inputValue, newPage);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary uppercase tracking-wider">搜索热点</h2>
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
            placeholder="输入搜索关键词..."
            className="flex-1 px-3.5 py-2 bg-surface border border-border rounded-lg text-text placeholder:text-text-tertiary focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/30 transition-all duration-200 text-sm"
          />
          <Button onClick={handleSearch} disabled={!inputValue.trim()}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>

        {searchResults.length === 0 && searchQuery ? (
          <div className="py-8 text-center">
            <p className="text-sm text-text-tertiary">未找到匹配的热点</p>
          </div>
        ) : (
          <div className="space-y-2">
            {searchResults.map((item, i) => (
              <motion.a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: i * 0.03 }}
                className="block group"
              >
                <Card className="p-4 hover:border-border-hover transition-colors">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {item.isUrgent && (
                      <Badge variant="danger" className="text-[11px]">紧急</Badge>
                    )}
                    <Badge variant="info" className="text-[11px]">{item.sourceName}</Badge>
                    <Badge variant="default" className="text-[11px]">
                      {item.heat ? (item.heat > 66 ? 'High' : item.heat > 33 ? 'Medium' : 'Low') : 'Medium'}
                    </Badge>
                    <Badge variant="default" className="text-[11px] text-text-tertiary">
                      {item.keywordTerm}
                    </Badge>
                  </div>
                  <h3 className="text-sm text-text font-medium leading-relaxed group-hover:text-accent transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  {item.summary && (
                    <p className="text-xs text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">{item.summary}</p>
                  )}
                  <span className="text-[11px] text-text-tertiary mt-2 block">
                    {new Date(item.matchedAt).toLocaleString('zh-CN', {
                      month: 'numeric',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </Card>
              </motion.a>
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
    triggerMonitor,
    isMonitoring,
    newHotspotItems,
    clearNewHotspotItems,
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
    { id: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
    { id: 'keywords', label: '关键词', icon: Bell },
    { id: 'search', label: '搜索', icon: Search },
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
                <Flame className="w-4 h-4 text-accent" />
              </div>
              <span className="text-sm font-semibold text-text tracking-tight">Hot Monitor</span>
            </div>

            <div className="flex items-center gap-2" ref={panelRef}>
              {/* 通知按钮 */}
              <button
                onClick={() => setShowNotificationPanel(!showNotificationPanel)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-lg border text-xs transition-colors ${
                  newHotspotItems.length > 0
                    ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/15'
                    : 'bg-transparent border-border text-text-tertiary hover:text-text hover:border-border-hover'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                {newHotspotItems.length > 0 ? `${newHotspotItems.length} 条新热点` : '暂无更新'}
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
                      <h3 className="text-sm font-medium text-text">最新热点</h3>
                      <button onClick={() => setShowNotificationPanel(false)} className="text-text-tertiary hover:text-text transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {newHotspotItems.length === 0 ? (
                      <div className="p-8 text-center text-xs text-text-tertiary">暂无新热点</div>
                    ) : (
                      <>
                        <div className="max-h-80 overflow-y-auto divide-y divide-border">
                          {newHotspotItems.map(item => (
                            <a
                              key={item.id}
                              href={item.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 hover:bg-white/[0.02] transition-colors"
                            >
                              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                {item.isUrgent && (
                                  <Badge variant="danger" className="text-[10px]">紧急</Badge>
                                )}
                                <Badge variant="info" className="text-[10px]">{item.sourceName}</Badge>
                                <span className="text-[10px] text-text-tertiary">
                                  {item.heat ? (item.heat > 66 ? 'High' : item.heat > 33 ? 'Medium' : 'Low') : 'Medium'}
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
                              clearNewHotspotItems();
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

              {/* 立即检查按钮 */}
              <Button
                variant="primary"
                size="sm"
                onClick={() => triggerMonitor()}
                disabled={isMonitoring}
                className="bg-red-500 hover:bg-red-600 text-white border-0"
              >
                {isMonitoring ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                立即检查
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
            <Card className="p-4 border-red-500/20">
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
            {activeTab === 'keywords' && <KeywordsView />}
            {activeTab === 'search' && <SearchView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 页脚 */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-5xl mx-auto px-5 text-center">
          <p className="text-xs text-text-tertiary">Hot Monitor</p>
        </div>
      </footer>
    </div>
  );
}
