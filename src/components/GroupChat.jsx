import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { Send } from 'lucide-react';

export default function GroupChat({ layoutId }) {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const chatEndRef = useRef(null);

  // This function would be in your WebSocket service file
  // const socket = useSocket(); // Example custom hook

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

    // --- WebSocket Integration Point ---
    // Here you would listen for incoming messages
    // socket.on('newMessage', (incomingMessage) => {
    //   if (incomingMessage.conversationId === conversationId) {
    //     setMessages(prevMessages => [...prevMessages, incomingMessage]);
    //   }
    // });
    // return () => socket.off('newMessage');
  }, [layoutId, token]);
  
  // Scroll to the latest message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;

    const optimisticMessage = {
        id: Date.now().toString(),
        content: newMessage,
        createdAt: new Date().toISOString(),
        author: { username: user.username },
        isOptimistic: true,
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    
    try {
      // In a WebSocket setup, you would emit the message instead of using POST
      // socket.emit('sendMessage', { conversationId, content: newMessage });
      const res = await axios.post('/api/chat/post', 
        { conversationId, content: newMessage },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Replace the optimistic message with the real one from the server
      setMessages(prev => prev.map(msg => msg.id === optimisticMessage.id ? res.data : msg));

    } catch (error) {
      console.error("Failed to send message", error);
      // Revert optimistic update on failure
      setMessages(prev => prev.filter(msg => !msg.isOptimistic));
      alert("Failed to send message.");
    }
  };
  
  if (isLoading) return <p className="text-gray-400 animate-pulse">Loading Chat...</p>;

  if (!conversationId) {
      return (
        <div className="text-center text-gray-500 p-8 bg-gray-900/50 rounded-lg">
            <p>The group chat will be created once the first collaborator is accepted.</p>
        </div>
      );
  }

  return (
    <div className="flex flex-col h-96 bg-gray-900/50 rounded-lg p-4">
      <div className="flex-1 overflow-y-auto pr-2 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.author.username === user.username ? 'flex-row-reverse' : ''}`}>
            <div className={`p-3 rounded-lg max-w-xs lg:max-w-md ${msg.author.username === user.username ? 'bg-cyan-800' : 'bg-gray-700'} ${msg.isOptimistic ? 'opacity-60' : ''}`}>
              <p className="text-white text-sm">{msg.content}</p>
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
          placeholder="Type a message..."
          className="flex-1 p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200"
        />
        <button type="submit" className="p-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white"><Send size={20} /></button>
      </form>
    </div>
  );
}