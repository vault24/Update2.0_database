import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, ChevronRight, AlertTriangle, Info, Megaphone } from 'lucide-react';
import { useState } from 'react';

const notices = [
  {
    id: 1,
    type: 'urgent',
    title: 'Semester Exam Schedule Released',
    date: '2024-12-05',
    description: 'The final semester examination schedule has been published. Check your routine.',
  },
  {
    id: 2,
    type: 'info',
    title: 'Library Hours Extended',
    date: '2024-12-04',
    description: 'Library will remain open till 9 PM during exam period.',
  },
  {
    id: 3,
    type: 'announcement',
    title: 'Annual Sports Week',
    date: '2024-12-03',
    description: 'Registration open for annual sports week starting December 15.',
  },
  {
    id: 4,
    type: 'info',
    title: 'Fee Payment Deadline',
    date: '2024-12-02',
    description: 'Last date for semester fee payment is December 10.',
  },
];

const typeConfig = {
  urgent: { icon: AlertTriangle, color: 'text-destructive', bg: 'bg-destructive/10' },
  info: { icon: Info, color: 'text-accent', bg: 'bg-accent/10' },
  announcement: { icon: Megaphone, color: 'text-warning', bg: 'bg-warning/10' },
};

export function NoticeBoard() {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-card rounded-2xl border border-border p-6 shadow-card"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold">Notices & Updates</h3>
        </div>
        <button className="text-sm text-primary hover:underline flex items-center gap-1">
          View All
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {notices.map((notice, index) => {
            const config = typeConfig[notice.type as keyof typeof typeConfig];
            const TypeIcon = config.icon;
            const isExpanded = expandedId === notice.id;

            return (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * index }}
                className="group"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : notice.id)}
                  className="w-full text-left p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-all duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                      <TypeIcon className={`w-4 h-4 ${config.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{notice.title}</h4>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <Calendar className="w-3 h-3" />
                          {new Date(notice.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric' 
                          })}
                        </div>
                      </div>
                      <motion.div
                        initial={false}
                        animate={{ height: isExpanded ? 'auto' : 0 }}
                        className="overflow-hidden"
                      >
                        <p className="text-sm text-muted-foreground mt-2">
                          {notice.description}
                        </p>
                      </motion.div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
