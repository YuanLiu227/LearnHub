import { ExternalLink, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { NewsItem } from '@/types';
import { formatTime } from '@/lib/utils';

interface NewsCardProps {
  item: NewsItem;
}

const sourceNames: Record<string, string> = {
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  twitter: 'Twitter',
  ainavigation: 'AI Navigation',
  googlenews: 'Google News',
};

export function NewsCard({ item }: NewsCardProps) {
  return (
    <Card className="p-4 group cursor-pointer hover:border-border-hover transition-colors" onClick={() => window.open(item.url, '_blank')}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {item.isReal ? (
            <CheckCircle className="w-4 h-4 text-green-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-yellow-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm text-text font-medium leading-relaxed line-clamp-2 group-hover:text-accent transition-colors">
            {item.title}
          </h4>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="info">{sourceNames[item.source] || item.sourceName}</Badge>
            <Badge variant={item.isReal ? 'success' : 'warning'}>
              置信度 {Math.round(item.confidence * 100)}%
            </Badge>
            <div className="flex items-center gap-1 text-text-tertiary">
              <Clock className="w-3 h-3" />
              <span className="text-xs">{formatTime(item.matchedAt)}</span>
            </div>
          </div>
          {item.summary && (
            <p className="mt-2 text-xs text-text-secondary leading-relaxed line-clamp-2">
              {item.summary}
            </p>
          )}
        </div>
        <ExternalLink className="w-3.5 h-3.5 text-text-tertiary group-hover:text-accent flex-shrink-0" />
      </div>
    </Card>
  );
}
