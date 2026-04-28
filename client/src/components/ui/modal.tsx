import { useEffect, useState } from 'react';
import { X, ExternalLink, Globe, TrendingUp, Clock, Tag } from 'lucide-react';

function formatTime(publishedAt: number): string {
  const now = Date.now();
  const diff = now - publishedAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  return `${days}天前`;
}

function formatHeat(heat: number): string {
  return heat.toFixed(0);
}

interface HotTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: {
    id: string;
    title: string;
    url: string;
    source: string;
    sourceName: string;
    heat: number;
    publishedAt: number;
    summary?: string;
    scope?: string;
  } | null;
}

const sourceNames: Record<string, string> = {
  hackernews: 'Hacker News',
  reddit: 'Reddit',
  twitter: 'Twitter',
  ainavigation: 'AI Navigation',
  googlenews: 'Google News',
  search: 'Firecrawl Search',
};

export function HotTopicModal({ isOpen, onClose, topic }: HotTopicModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Debug logging
  console.log('[Modal] Rendering:', { isOpen, hasTopic: !!topic, topic });

  if (!mounted) return null;
  if (!isOpen) return null;
  if (!topic) {
    console.log('[Modal] Topic is null');
    return null;
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const sourceLabel = sourceNames[topic.source] || topic.sourceName || '未知来源';

  return (
    <div
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
      }}
    >
      <div
        style={{
          position: 'relative',
          width: '90%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          backgroundColor: '#1a1a2e',
          borderRadius: '16px',
          border: '2px solid #ff6b35',
          padding: '24px',
          color: '#e8e8e8',
        }}
      >
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            border: 'none',
            background: 'rgba(255,255,255,0.1)',
            color: '#e8e8e8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={18} />
        </button>

        {/* 标题 */}
        <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '16px', paddingRight: '40px' }}>
          {topic.title || '无标题'}
        </h2>

        {/* 来源和热度 */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{ background: '#4ecdc4', padding: '4px 12px', borderRadius: '999px', fontSize: '12px' }}>
            {sourceLabel}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
            <TrendingUp size={16} /> {formatHeat(topic.heat)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(232,232,232,0.5)' }}>
            <Clock size={16} /> {formatTime(topic.publishedAt)}
          </span>
        </div>

        {/* 关键词 */}
        {topic.scope && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', color: 'rgba(232,232,232,0.6)' }}>
            <Tag size={16} />
            <span>{topic.scope}</span>
          </div>
        )}

        {/* 内容总结 */}
        {topic.summary ? (
          <div style={{
            background: 'rgba(255,255,255,0.05)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'rgba(232,232,232,0.9)' }}>
              {topic.summary}
            </p>
          </div>
        ) : (
          <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', marginBottom: '16px' }}>
            <p style={{ color: 'rgba(232,232,232,0.5)' }}>暂无内容总结</p>
          </div>
        )}

        {/* 网址和访问按钮 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <Globe size={20} style={{ color: '#ff6b35', flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: '13px', color: 'rgba(232,232,232,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {topic.url || '无网址'}
          </span>
          <a
            href={topic.url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: '#ff6b35',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              borderRadius: '8px',
              textDecoration: 'none',
              flexShrink: 0,
            }}
          >
            访问网站
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </div>
  );
}
