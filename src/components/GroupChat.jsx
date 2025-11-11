import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext'; // 1. Import
import { Send } from 'lucide-react';

export default function GroupChat({ layoutId }) {
  const { user, token } = useAuth();
  const { t } = useLanguage(); // 2. Initialize
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const chatEndRef = useRef(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`/api/chat/history/${layoutId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(res.data.messages);
        setConversationId(res.data.conversationId);
      } catch (error) {
        console.error("Failed to load chat history", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();

    // --- WebSocket Integration Point (Future) ---
    // socket.on('newMessage', (incomingMessage) => { ... });
    
  }, [layoutId, token]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      content: newMessage,
      author: { username: user.username },
      isOptimistic: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');

    try {
      await axios.post('/api/chat/post', {
        messageContent: newMessage,
        conversationId: conversationId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // A real-time app would remove the optimistic message
      // when the real one arrives via WebSocket.
      // For now, we'll just refetch or let the WS handle it.
    } catch (error) {
      console.error('Failed to send message', error);
      // Remove the optimistic message on failure
      setMessages(prev => prev.filter(msg => msg.id !== optimisticId));
    }
  };

  if (isLoading) return <p className="text-text-muted animate-pulse">{t('loading_chat')}</p>; {/* THEMED */}

  if (!conversationId) {
      return (
        <div className="text-center text-text-muted p-8 bg-primary-bg rounded-lg"> {/* THEMED */}
            <p>{t('chat_create_desc')}</p> {/* Translated */}
        </div>
      );
  }

  return (
    <div className="flex flex-col h-96 bg-primary-bg rounded-lg p-4"> {/* THEMED */}
      <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar"> {/* Applied custom scrollbar */}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.author.username === user.username ? 'flex-row-reverse' : ''}`}>
            <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${msg.author.username === user.username ? 'bg-accent' : 'bg-ui-bg'} ${msg.isOptimistic ? 'opacity-60' : ''}`}> {/* THEMED */}
              <p className="text-text-on-ui text-sm">{msg.content}</p> {/* THEMED */}
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="mt-4 flex gap-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={t('type_a_message')} /* Translated */
          className="flex-1 p-2 rounded-lg border border-primary-bg bg-ui-bg text-text-on-ui" /* THEMED */
        />
        <button type="submit" className="p-2 bg-accent hover:opacity-90 text-text-on-ui rounded-lg"> {/* THEMED */}
          <Send size={20} />
        </button>
      </form>
    </div>
  );
}