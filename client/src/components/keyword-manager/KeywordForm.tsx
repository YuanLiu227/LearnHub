import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus } from 'lucide-react';
import { useAppStore } from '@/stores/appStore';

export function KeywordForm() {
  const [term, setTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const addKeyword = useAppStore(state => state.addKeyword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!term.trim()) return;

    setIsAdding(true);
    try {
      await addKeyword(term.trim());
      setTerm('');
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <Input
        placeholder="输入关键词，如：AI Agent"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        className="flex-1"
      />
      <Button
        type="submit"
        disabled={!term.trim() || isAdding}
        className="gap-2"
      >
        {isAdding ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        添加关键词
      </Button>
    </form>
  );
}
