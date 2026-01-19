import { motion } from 'framer-motion';
import { format, isToday, isYesterday } from 'date-fns';
import { Users, User, Building, School, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Chat } from '@/data/mockChats';

interface ChatListProps {
  chats: Chat[];
  selectedChatId: string | null;
  onSelectChat: (chat: Chat) => void;
  searchQuery: string;
}

const formatMessageTime = (dateString: string) => {
  const date = new Date(dateString);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  } else if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'dd/MM/yy');
};

const getChatIcon = (type: Chat['type'], isGroup: boolean) => {
  if (type === 'institute') return Building;
  if (type === 'department') return School;
  if (isGroup) return Users;
  return User;
};

const getChatTypeColor = (type: Chat['type']) => {
  switch (type) {
    case 'institute':
      return 'bg-destructive/10 text-destructive';
    case 'department':
      return 'bg-primary/10 text-primary';
    case 'class':
      return 'bg-success/10 text-success';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function ChatList({ chats, selectedChatId, onSelectChat, searchQuery }: ChatListProps) {
  const filteredChats = chats.filter(chat =>
    chat.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto">
      {filteredChats.map((chat, index) => {
        const ChatIcon = getChatIcon(chat.type, chat.isGroup);
        const isSelected = chat.id === selectedChatId;
        
        return (
          <motion.div
            key={chat.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onSelectChat(chat)}
            className={cn(
              "flex items-center gap-3 p-3 cursor-pointer transition-colors border-b border-border/50",
              isSelected 
                ? "bg-primary/10" 
                : "hover:bg-secondary/50"
            )}
          >
            {/* Avatar */}
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0",
              chat.isGroup ? getChatTypeColor(chat.type) : "bg-gradient-to-br from-primary to-primary/60"
            )}>
              {chat.avatar ? (
                <img src={chat.avatar} alt={chat.name} className="w-full h-full rounded-full object-cover" />
              ) : (
                <ChatIcon className="w-5 h-5" />
              )}
            </div>

            {/* Chat Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-sm truncate">{chat.name}</h3>
                <span className={cn(
                  "text-xs flex-shrink-0",
                  chat.unreadCount > 0 ? "text-primary font-medium" : "text-muted-foreground"
                )}>
                  {formatMessageTime(chat.lastMessageTime)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 mt-0.5">
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  <CheckCheck className="w-3 h-3 text-primary flex-shrink-0" />
                  {chat.lastMessage}
                </p>
                {chat.unreadCount > 0 && (
                  <span className="bg-primary text-primary-foreground text-xs font-medium px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {chat.unreadCount}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {filteredChats.length === 0 && (
        <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
          <Users className="w-8 h-8 mb-2 opacity-50" />
          <p className="text-sm">No chats found</p>
        </div>
      )}
    </div>
  );
}
