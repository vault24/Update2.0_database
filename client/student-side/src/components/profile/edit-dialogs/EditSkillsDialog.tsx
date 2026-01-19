import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

interface EditSkillsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: string[];
  onSave: (items: string[]) => void;
  title: string;
  placeholder: string;
}

export function EditSkillsDialog({ open, onOpenChange, items, onSave, title, placeholder }: EditSkillsDialogProps) {
  const [list, setList] = useState<string[]>(items);
  const [newItem, setNewItem] = useState('');

  useEffect(() => {
    if (open) {
      setList(items);
      setNewItem('');
    }
  }, [open, items]);

  const handleAdd = () => {
    if (newItem.trim() && !list.includes(newItem.trim())) {
      setList([...list, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index: number) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(list);
    onOpenChange(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <Input
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              placeholder={placeholder}
              onKeyDown={handleKeyDown}
            />
            <Button type="button" onClick={handleAdd} size="icon">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 min-h-[100px] p-3 border rounded-lg bg-secondary/30">
            {list.length === 0 ? (
              <p className="text-sm text-muted-foreground">No {title.toLowerCase()} added yet</p>
            ) : (
              list.map((item, index) => (
                <Badge key={index} variant="secondary" className="gap-1 pr-1">
                  {item}
                  <button
                    onClick={() => handleRemove(index)}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
