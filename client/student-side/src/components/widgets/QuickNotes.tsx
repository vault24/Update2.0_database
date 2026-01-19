import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  StickyNote, 
  Plus, 
  Trash2, 
  X,
  Sparkles,
  Pin
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Note = {
  id: string;
  content: string;
  color: string;
  pinned: boolean;
  createdAt: number;
};

const NOTE_COLORS = [
  { bg: 'bg-yellow-100 dark:bg-yellow-900/30', border: 'border-yellow-300 dark:border-yellow-700' },
  { bg: 'bg-pink-100 dark:bg-pink-900/30', border: 'border-pink-300 dark:border-pink-700' },
  { bg: 'bg-blue-100 dark:bg-blue-900/30', border: 'border-blue-300 dark:border-blue-700' },
  { bg: 'bg-green-100 dark:bg-green-900/30', border: 'border-green-300 dark:border-green-700' },
  { bg: 'bg-purple-100 dark:bg-purple-900/30', border: 'border-purple-300 dark:border-purple-700' },
];

const STORAGE_KEY = 'spi_quick_notes';

export function QuickNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load notes from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setNotes(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load notes:', e);
      }
    }
  }, []);

  // Save notes to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  const addNote = () => {
    if (!newNote.trim()) return;
    
    const note: Note = {
      id: Date.now().toString(),
      content: newNote.trim(),
      color: selectedColor.toString(),
      pinned: false,
      createdAt: Date.now(),
    };
    
    setNotes((prev) => [note, ...prev]);
    setNewNote('');
    setIsAdding(false);
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const togglePin = (id: string) => {
    setNotes((prev) => 
      prev.map((n) => n.id === id ? { ...n, pinned: !n.pinned } : n)
        .sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0))
    );
  };

  const sortedNotes = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const displayNotes = isExpanded ? sortedNotes : sortedNotes.slice(0, 3);

  return (
    <motion.div
      layout
      className="bg-card rounded-2xl border border-border shadow-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div 
          className="flex items-center gap-2 cursor-pointer flex-1"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center">
            <StickyNote className="w-4 h-4 text-warning" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">Quick Notes</h3>
            <p className="text-[10px] text-muted-foreground">{notes.length} notes</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsAdding(true)}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Add Note Form */}
      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border overflow-hidden"
          >
            <div className="p-3 space-y-3">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                placeholder="Write a quick note..."
                className="w-full p-2 text-sm bg-muted/50 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                rows={3}
                autoFocus
              />
              
              {/* Color Picker */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Color:</span>
                {NOTE_COLORS.map((color, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedColor(i)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition-all",
                      color.bg,
                      selectedColor === i ? "ring-2 ring-primary ring-offset-2" : ""
                    )}
                  />
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={addNote}
                  className="flex-1"
                  disabled={!newNote.trim()}
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Add Note
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setIsAdding(false); setNewNote(''); }}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notes List */}
      <div className="p-3 space-y-2 max-h-[300px] overflow-y-auto">
        {notes.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No notes yet</p>
            <p className="text-[10px] opacity-70">Tap + to add a note</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {displayNotes.map((note) => {
              const colorIndex = parseInt(note.color) || 0;
              const colors = NOTE_COLORS[colorIndex] || NOTE_COLORS[0];
              
              return (
                <motion.div
                  key={note.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9, x: -20 }}
                  className={cn(
                    "relative p-3 rounded-lg border group",
                    colors.bg,
                    colors.border
                  )}
                >
                  {note.pinned && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
                      <Pin className="w-3 h-3" />
                    </div>
                  )}
                  
                  <p className="text-sm pr-6 whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                  
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => togglePin(note.id)}
                        className={cn(
                          "p-1 rounded hover:bg-black/10",
                          note.pinned && "text-primary"
                        )}
                      >
                        <Pin className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="p-1 rounded hover:bg-black/10 text-destructive"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {notes.length > 3 && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="w-full py-2 text-xs text-primary hover:underline"
          >
            Show {notes.length - 3} more notes
          </button>
        )}
      </div>
    </motion.div>
  );
}
