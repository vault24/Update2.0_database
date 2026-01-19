import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Plus, MessageCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChatList } from '@/components/messages/ChatList';
import { ChatView } from '@/components/messages/ChatView';
import { mockChats, Chat, ChatMessage, currentUserId } from '@/data/mockChats';

export default function MessagesPage() {
  const [chats, setChats] = useState<Chat[]>(mockChats);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'groups' | 'personal'>('all');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredChats = chats.filter(chat => {
    if (activeTab === 'groups') return chat.isGroup;
    if (activeTab === 'personal') return !chat.isGroup;
    return true;
  });

  const totalUnread = chats.reduce((sum, chat) => sum + chat.unreadCount, 0);

  const handleSelectChat = (chat: Chat) => {
    // Mark messages as read
    setChats(prev => prev.map(c => 
      c.id === chat.id 
        ? { ...c, unreadCount: 0, messages: c.messages.map(m => ({ ...m, isRead: true })) }
        : c
    ));
    setSelectedChat({ ...chat, unreadCount: 0 });
  };

  const handleSendMessage = (chatId: string, content: string) => {
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      senderId: currentUserId,
      senderName: 'Me',
      content,
      timestamp: new Date().toISOString(),
      type: 'text',
      isRead: true
    };

    setChats(prev => prev.map(chat => 
      chat.id === chatId
        ? {
            ...chat,
            messages: [...chat.messages, newMessage],
            lastMessage: content,
            lastMessageTime: newMessage.timestamp
          }
        : chat
    ));

    if (selectedChat?.id === chatId) {
      setSelectedChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, newMessage],
        lastMessage: content,
        lastMessageTime: newMessage.timestamp
      } : null);
    }
  };

  const handleBack = () => {
    setSelectedChat(null);
  };

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col max-w-full overflow-x-hidden">
      {/* Main Content - Full Page */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex">
        {/* Chat List Panel */}
        <AnimatePresence mode="wait">
          {(!selectedChat || !isMobile) && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className={`flex flex-col w-full md:w-80 lg:w-96 border-r border-border ${selectedChat && isMobile ? 'hidden' : 'flex'}`}
            >
              {/* Search */}
              <div className="p-3 border-b border-border space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search chats..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-secondary/50 border-0"
                  />
                </div>

                {/* Tabs */}
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
                    <TabsTrigger value="groups" className="text-xs">Groups</TabsTrigger>
                    <TabsTrigger value="personal" className="text-xs">Personal</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {/* Chat List */}
              <ChatList
                chats={filteredChats}
                selectedChatId={selectedChat?.id || null}
                onSelectChat={handleSelectChat}
                searchQuery={searchQuery}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat View Panel */}
        <AnimatePresence mode="wait">
          {selectedChat ? (
            <div className={`flex-1 flex flex-col ${!selectedChat && isMobile ? 'hidden' : ''}`}>
              <ChatView
                chat={selectedChat}
                onBack={handleBack}
                onSendMessage={handleSendMessage}
              />
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="hidden md:flex flex-1 items-center justify-center bg-secondary/20"
            >
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-secondary/50 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-1">Select a chat</h3>
                <p className="text-sm text-muted-foreground">
                  Choose a conversation to start messaging
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
