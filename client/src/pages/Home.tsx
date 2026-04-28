import { useEffect, useState, useRef } from 'react';
import {
  Flame,
  Search,
  Settings,
  Bell,
  Loader2,
  LayoutDashboard,
  AlertTriangle,
  Plus,
  Zap,
  ChevronDown,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { KeywordForm } from '@/components/keyword-manager/KeywordForm';
import { KeywordList } from '@/components/keyword-manager/KeywordList';
import { useAppStore, type TabType } from '@/stores/appStore';
import { requestNotificationPermission } from '@/hooks/useNotification';

function StatsCard({ title, value, icon: Icon, variant = 'default' }: {
  title: string;
  value: number;
  icon: any;
  variant?: 'default' | 'warning' | 'success';
}) {
  const colors = {
    default: 'from-primary/20 to-primary/5 border-primary/30',
    warning: 'from-red-500/20 to-red-500/5 border-red-500/30',
    success: 'from-green-500/20 to-green-500/5 border-green-500/30',
  };

  return (
    <Card className={`p-4 bg-gradient-to-br ${colors[variant]} border`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-light/60 text-sm">{title}</p>
          <p className="text-3xl font-bold text-light mt-1">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
          <Icon className="w-6 h-6 text-light/80" />
        </div>
      </div>
    </Card>
  );
}

function DashboardView() {
  const { stats, hotspots, hotspotsTotal, fetchStats, fetchHotspots, isMonitoring, monitorProgress } = useAppStore();

  useEffect(() => {
    fetchStats();
    fetchHotspots();
  }, []);

  return (
    <div className="space-y-6">
      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title="总热点" value={stats.totalHotspots} icon={Flame} />
        <StatsCard title="今日新增" value={stats.todayNew} icon={Plus} variant="success" />
        <StatsCard title="紧急热点" value={stats.urgentHot} icon={AlertTriangle} variant="warning" />
        <StatsCard title="监控关键词" value={stats.monitoredKeywords} icon={Bell} />
      </div>

      {/* 监控进度 */}
      {isMonitoring && monitorProgress && (
        <Card className="p-4 bg-primary/10 border-primary/30">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <p className="text-sm text-primary">{monitorProgress.message}</p>
          </div>
        </Card>
      )}

      {/* 热点列表 */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-light">热点列表</h2>
          <Badge variant="default">{hotspotsTotal} 条</Badge>
        </div>

        {hotspots.length === 0 ? (
          <p className="text-light/60 text-center py-8">暂无热点，点击"立即检查"开始监控</p>
        ) : (
          <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
            {hotspots.map(item => (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {item.isUrgent && (
                        <Badge variant="warning" className="text-xs">紧急</Badge>
                      )}
                      <Badge variant="info" className="text-xs">{item.sourceName}</Badge>
                      <Badge variant="default" className="text-xs">
                        等级: {item.heat ? (item.heat > 66 ? 'High' : item.heat > 33 ? 'Medium' : 'Low') : 'Medium'}
                      </Badge>
                      <Badge variant="default" className="text-xs text-light/70">
                        关键词: {item.keywordTerm}
                      </Badge>
                    </div>
                    <h3 className="text-light font-medium line-clamp-2 group-hover:text-primary">
                      {item.title}
                    </h3>
                    {item.summary && (
                      <p className="text-light/60 text-sm mt-1 line-clamp-2">{item.summary}</p>
                    )}
                    <p className="text-light/40 text-xs mt-2">
                      {new Date(item.matchedAt).toLocaleString()} · <ExternalLink className="w-3 h-3 inline" />
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function KeywordsView() {
  const { keywords, fetchKeywords } = useAppStore();

  useEffect(() => {
    fetchKeywords();
  }, []);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-light">关键词管理</h2>
        <Badge variant={keywords.filter(k => k.enabled).length > 0 ? 'success' : 'default'}>
          {keywords.filter(k => k.enabled).length} 个监控中
        </Badge>
      </div>

      <div className="mb-4">
        <KeywordForm />
      </div>

      <KeywordList />
    </Card>
  );
}

function SearchView() {
  const { searchQuery, setSearchQuery, searchResults, searchTotal, searchHotspots } = useAppStore();
  const [inputValue, setInputValue] = useState(searchQuery);

  const handleSearch = () => {
    setSearchQuery(inputValue);
    searchHotspots(inputValue);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-light">搜索热点</h2>
        <Badge variant="default">{searchTotal} 条结果</Badge>
      </div>

      <div className="flex gap-3 mb-4">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="输入搜索关键词..."
          className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-light placeholder:text-light/40 focus:outline-none focus:border-primary"
        />
        <Button onClick={handleSearch} disabled={!inputValue.trim()}>
          <Search className="w-4 h-4 mr-2" />
          搜索
        </Button>
      </div>

      {searchResults.length === 0 && searchQuery && (
        <p className="text-light/60 text-center py-8">未找到匹配的热点</p>
      )}

      <div className="space-y-3 max-h-[calc(100vh-400px)] overflow-y-auto">
        {searchResults.map(item => (
          <a
            key={item.id}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors group"
          >
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {item.isUrgent && (
                <Badge variant="warning" className="text-xs">紧急</Badge>
              )}
              <Badge variant="info" className="text-xs">{item.sourceName}</Badge>
              <Badge variant="default" className="text-xs">
                等级: {item.heat ? (item.heat > 66 ? 'High' : item.heat > 33 ? 'Medium' : 'Low') : 'Medium'}
              </Badge>
              <Badge variant="default" className="text-xs text-light/70">
                关键词: {item.keywordTerm}
              </Badge>
            </div>
            <h3 className="text-light font-medium line-clamp-2 group-hover:text-primary">
              {item.title}
            </h3>
            {item.summary && (
              <p className="text-light/60 text-sm mt-1 line-clamp-2">{item.summary}</p>
            )}
            <p className="text-light/40 text-xs mt-2">
              {new Date(item.matchedAt).toLocaleString()} · <ExternalLink className="w-3 h-3 inline" />
            </p>
          </a>
        ))}
      </div>
    </Card>
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

  const [showSettings, setShowSettings] = useState(false);
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
    <div className="min-h-screen bg-dark">
      {/* 背景渐变 */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-dark via-darker to-dark" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      {/* 头部 */}
      <header className="border-b border-white/10 sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Flame className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-light">Hot Monitor</h1>
              <p className="text-xs text-light/50">AI 资讯监控系统</p>
            </div>
          </div>

          <div className="flex items-center gap-2 relative" ref={panelRef}>
            {/* 常驻通知按钮 */}
            <button
              onClick={() => setShowNotificationPanel(!showNotificationPanel)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                newHotspotItems.length > 0
                  ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30'
                  : 'bg-white/5 border-white/10 text-light/60 hover:bg-white/10'
              }`}
            >
              <Bell className="w-4 h-4" />
              {newHotspotItems.length > 0 ? `${newHotspotItems.length} 条新热点` : '暂无更新'}
              <ChevronDown className={`w-4 h-4 transition-transform ${showNotificationPanel ? 'rotate-180' : ''}`} />
            </button>

            {/* 通知展开面板 */}
            {showNotificationPanel && (
              <div className="absolute right-0 top-full mt-2 w-96 bg-darker border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="text-light font-semibold">最新热点</h3>
                  <button onClick={() => setShowNotificationPanel(false)} className="text-light/40 hover:text-light">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {newHotspotItems.length === 0 ? (
                  <div className="p-8 text-center text-light/40 text-sm">暂无新热点</div>
                ) : (
                  <>
                    <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                      {newHotspotItems.map(item => (
                        <a
                          key={item.id}
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-3 hover:bg-white/5 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            {item.isUrgent && (
                              <Badge variant="warning" className="text-xs">紧急</Badge>
                            )}
                            <Badge variant="info" className="text-xs">{item.sourceName}</Badge>
                            <span className="text-xs text-light/40">
                              等级 {item.heat ? (item.heat > 66 ? 'High' : item.heat > 33 ? 'Medium' : 'Low') : 'Medium'}
                            </span>
                          </div>
                          <p className="text-sm text-light line-clamp-2">{item.title}</p>
                          <p className="text-xs text-light/40 mt-1">
                            {new Date(item.matchedAt).toLocaleString()}
                          </p>
                        </a>
                      ))}
                    </div>
                    <div className="p-3 border-t border-white/10 bg-white/5">
                      <button
                        onClick={() => {
                          clearNewHotspotItems();
                          setShowNotificationPanel(false);
                        }}
                        className="w-full text-center text-sm text-light/50 hover:text-light"
                      >
                        清空通知
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* 立即检查按钮 */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => triggerMonitor()}
              disabled={isMonitoring}
              className="gap-1 bg-red-500 hover:bg-red-600"
            >
              {isMonitoring ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              立即检查
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="max-w-7xl mx-auto px-4 pb-2">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-white/10 text-light border-t border-x border-white/20'
                    : 'text-light/60 hover:text-light hover:bg-white/5'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 错误提示 */}
      {error && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <Card className="p-4 bg-red-500/10 border-red-500/30">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="text-xs text-red-400/60 hover:text-red-400 mt-1"
            >
              关闭
            </button>
          </Card>
        </div>
      )}

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'keywords' && <KeywordsView />}
        {activeTab === 'search' && <SearchView />}
      </main>

      {/* 页脚 */}
      <footer className="border-t border-white/10 py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-light/40">
          <p>Hot Monitor - AI 资讯监控系统</p>
        </div>
      </footer>
    </div>
  );
}
