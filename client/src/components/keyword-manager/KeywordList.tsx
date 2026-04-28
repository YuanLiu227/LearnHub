import { Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/stores/appStore';
import { formatTime } from '@/lib/utils';

export function KeywordList() {
  const keywords = useAppStore(state => state.keywords);
  const deleteKeyword = useAppStore(state => state.deleteKeyword);
  const toggleKeyword = useAppStore(state => state.toggleKeyword);

  if (keywords.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-light/60">暂无监控关键词，添加一个开始吧</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {keywords.map((keyword) => (
        <Card key={keyword.id} className="p-4 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-light truncate">{keyword.term}</span>
              {keyword.enabled ? (
                <Badge variant="success">监控中</Badge>
              ) : (
                <Badge variant="default">已暂停</Badge>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1 text-sm text-light/50">
              <span className="text-primary">{keyword.hotspotCount ?? 0} 条热点</span>
              {keyword.lastMatchedAt && (
                <>
                  <span>·</span>
                  <span>上次匹配: {formatTime(keyword.lastMatchedAt)}</span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleKeyword(keyword.id, !keyword.enabled)}
              className="p-1.5"
            >
              {keyword.enabled ? (
                <ToggleRight className="w-5 h-5 text-green-400" />
              ) : (
                <ToggleLeft className="w-5 h-5 text-light/40" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => deleteKeyword(keyword.id)}
              className="p-1.5 hover:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}
