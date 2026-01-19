import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Send, 
  Paperclip, 
  Image, 
  MoreVertical,
  Phone,
  Video,
  Users,
  User,
  Building,
  School,
  File,
  Check,
  CheckCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Chat, ChatMessage, currentUserId } from '@/data/mockChats';

interface ChatViewProps {
  chat: Chat;
  onBack: () => void;
  onSendMessage: (chatId: string, message: string) => void;
}

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

export function ChatView({ chat, onBack, onSendMessage }: ChatViewProps) {
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const ChatIcon = getChatIcon(chat.type, chat.isGroup);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat.messages]);

  const handleSend = () => {
    if (message.trim()) {
      onSendMessage(chat.id, message.trim());
      setMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { date: string; messages: ChatMessage[] }[] = [];
    let currentDate = '';

    messages.forEach(msg => {
      const msgDate = format(new Date(msg.timestamp), 'yyyy-MM-dd');
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        groups.push({ date: msgDate, messages: [msg] });
      } else {
        groups[groups.length - 1].messages.push(msg);
      }
    });

    return groups;
  };

  const formatDateHeader = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(date, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(date, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    }
    return format(date, 'MMMM d, yyyy');
  };

  const messageGroups = groupMessagesByDate(chat.messages);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex flex-col h-full bg-background"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
          chat.isGroup ? getChatTypeColor(chat.type) : "bg-gradient-to-br from-primary to-primary/60"
        )}>
          <ChatIcon className="w-5 h-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-sm truncate">{chat.name}</h2>
          <p className="text-xs text-muted-foreground truncate">
            {chat.isGroup ? `${chat.participants.join(', ')}` : 'Online'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Phone className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden sm:flex">
            <Video className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreVertical className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%239C92AC\' fill-opacity=\'0.05\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")'
        }}
      >
        {messageGroups.map((group) => (
          <div key={group.date}>
            {/* Date Header */}
            <div className="flex justify-center mb-4">
              <span className="bg-secondary/80 text-secondary-foreground text-xs px-3 py-1 rounded-full">
                {formatDateHeader(group.date)}
              </span>
            </div>

            {/* Messages */}
            <div className="space-y-2">
              {group.messages.map((msg) => {
                const isMe = msg.senderId === 'student-me';
                
                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={cn(
                      "flex",
                      isMe ? "justify-end" : "justify-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] sm:max-w-[70%] rounded-2xl px-4 py-2 shadow-sm",
                        isMe 
                          ? "bg-primary text-primary-foreground rounded-br-md" 
                          : "bg-card border border-border rounded-bl-md"
                      )}
                    >
                      {/* Sender name for group chats */}
                      {chat.isGroup && !isMe && (
                        <p className="text-xs font-medium text-primary mb-1">
                          {msg.senderName}
                        </p>
                      )}

                      {/* Message content */}
                      {msg.type === 'file' ? (
                        <div className="flex items-center gap-2">
                          <File className="w-4 h-4" />
                          <span className="text-sm underline cursor-pointer">
                            {msg.fileName}
                          </span>
                        </div>
                      ) : msg.type === 'image' ? (
                        <img 
                          src={msg.fileUrl} 
                          alt="Shared image" 
                          className="rounded-lg max-w-full"
                        />
                      ) : (
                        <p className="text-sm whitespace-pre-wrap break-words">
                          {msg.content}
                        </p>
                      )}

                      {/* Time and read status */}
                      <div className={cn(
                        "flex items-center gap-1 mt-1",
                        isMe ? "justify-end" : "justify-start"
                      )}>
                        <span className={cn(
                          "text-[10px]",
                          isMe ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          {format(new Date(msg.timestamp), 'h:mm a')}
                        </span>
                        {isMe && (
                          msg.isRead 
                            ? <CheckCheck className="w-3 h-3 text-primary-foreground/70" />
                            : <Check className="w-3 h-3 text-primary-foreground/70" />
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-border bg-card">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <Paperclip className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="flex-shrink-0 hidden sm:flex">
            <Image className="w-5 h-5" />
          </Button>
          <Input
            ref={inputRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            className="flex-1 bg-secondary/50 border-0"
          />
          <Button 
            size="icon" 
            onClick={handleSend}
            disabled={!message.trim()}
            className="flex-shrink-0 gradient-primary"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
