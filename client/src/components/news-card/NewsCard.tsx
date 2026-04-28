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
    <Card hover className="p-4 group cursor-pointer" onClick={() => window.open(item.url, '_blank')}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {item.isReal ? (
            <CheckCircle className="w-5 h-5 text-green-400" />
          ) : (
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-light font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
            {item.title}
          </h4>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Badge variant="info">{sourceNames[item.source] || item.sourceName}</Badge>
            <Badge variant={item.isReal ? 'success' : 'warning'}>
              置信度 {Math.round(item.confidence * 100)}%
            </Badge>
            <div className="flex items-center gap-1 text-light/40">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-sm">{formatTime(item.matchedAt)}</span>
            </div>
          </div>
          {item.summary && (
            <p className="mt-2 text-sm text-light/80 leading-relaxed line-clamp-2">
              {item.summary}
            </p>
          )}
        </div>
        <ExternalLink className="w-4 h-4 text-light/40 group-hover:text-primary flex-shrink-0" />
      </div>
    </Card>
  );
}
