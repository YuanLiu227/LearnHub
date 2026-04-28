import { useState, useEffect } from 'react';
import { Book, RefreshCw, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TechDoc {
  tech: string;
  content: string;
}

const DEFAULT_TECHS = ['React 19', 'Vite 6', 'Tailwind CSS 4', 'Express 5', 'TypeScript 5'];

export function TechDocs() {
  const [docs, setDocs] = useState<TechDoc[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchDocs = async () => {
    setIsLoading(true);
    try {
      const techs = DEFAULT_TECHS.join(',');
      const response = await fetch(`/api/docs/tech?tech=${encodeURIComponent(techs)}`);
      const data = await response.json();

      if (data.docs) {
        const docsArray = Object.entries(data.docs).map(([tech, content]) => ({
          tech,
          content: content as string,
        }));
        setDocs(docsArray);
        setLastUpdated(new Date().toLocaleTimeString('zh-CN'));
      }
    } catch (error) {
      console.error('Failed to fetch tech docs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
    // 每小时刷新一次
    const interval = setInterval(fetchDocs, 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-light flex items-center gap-2">
          <Book className="w-5 h-5 text-secondary" />
          最新技术动态
          <Badge variant="info">Context7</Badge>
        </h2>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-xs text-light/40">
              更新于 {lastUpdated}
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDocs}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {docs.length === 0 && !isLoading && (
          <p className="text-light/60 text-center py-4">
            点击刷新按钮获取最新技术文档
          </p>
        )}

        {docs.map((doc) => (
          <div
            key={doc.tech}
            className="p-4 bg-white/5 rounded-lg border border-white/5"
          >
            <h3 className="font-medium text-light mb-2">{doc.tech}</h3>
            <p className="text-sm text-light/70 line-clamp-3">
              {doc.content.length > 300
                ? doc.content.slice(0, 300) + '...'
                : doc.content}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}
