import { Archive, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { formatTime } from '@/lib/utils';

export function KeywordList() {
  const keywords = useAppStore(state => state.keywords);
  const archiveKeyword = useAppStore(state => state.archiveKeyword);
  const toggleKeyword = useAppStore(state => state.toggleKeyword);

  if (keywords.length === 0) {
    return (
      <div className="py-8 text-center">
        <p className="text-xs text-text-tertiary">暂无监控关键词，添加一个开始吧</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
      {keywords.map((keyword) => (
        <Card key={keyword.id} className="p-4 flex items-start justify-between gap-3 hover:border-border-hover transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text truncate">{keyword.term}</span>
              {keyword.enabled ? (
                <Badge variant="success">监控中</Badge>
              ) : (
                <Badge variant="default">已暂停</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs text-text-secondary">
              <span className="text-accent">{keyword.hotspotCount ?? 0} 条资源</span>
              {keyword.lastMatchedAt && (
                <>
                  <span className="text-text-tertiary">·</span>
                  <span className="text-text-tertiary">上次匹配: {formatTime(keyword.lastMatchedAt)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleKeyword(keyword.id, !keyword.enabled)}
              className="p-1.5"
            >
              {keyword.enabled ? (
                <ToggleRight className="w-4 h-4 text-accent" />
              ) : (
                <ToggleLeft className="w-4 h-4 text-text-tertiary" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => archiveKeyword(keyword.id)}
              className="p-1.5 hover:text-yellow-400"
              title="归档关键词（保留学习资源）"
            >
              <Archive className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
