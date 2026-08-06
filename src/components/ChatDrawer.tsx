import React, { useState, useEffect, useRef } from 'react';
import { Send, X, ShieldCheck, UserCheck, MessageSquare, Building2, Clock, CheckCheck } from 'lucide-react';
import { Conversation, ChatMessage, UserRole } from '../types';
import { fetchMessages, sendMessage } from '../services/api';
import { sendNotification } from '../services/notificationService';

interface ChatDrawerProps {
  conversation: Conversation | null;
  onClose: () => void;
  currentRole: UserRole;
  currentUserId: string;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  conversation,
  onClose,
  currentRole,
  currentUserId
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversation) return;
    loadMessages();
  }, [conversation?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadMessages = async () => {
    if (!conversation) return;
    setLoading(true);
    try {
      const data = await fetchMessages(conversation.id);
      setMessages(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !conversation) return;

    const textToSend = inputText;
    setInputText('');

    const recipientId = currentRole === 'student' ? conversation.agentId : conversation.studentId;
    const senderName = currentRole === 'student' ? conversation.studentName : conversation.agentName;

    try {
      const newMsg = await sendMessage(conversation.id, {
        senderId: currentUserId,
        senderName,
        senderRole: currentRole,
        recipientId,
        text: textToSend
      });

      setMessages(prev => [...prev, newMsg]);

      // Trigger real-time notification for recipient
      sendNotification({
        userId: recipientId,
        title: `💬 New message from ${senderName}`,
        body: textToSend,
        type: 'message',
        metadata: {
          conversationId: conversation.id,
          listingId: conversation.listingId,
          senderName
        }
      });

      // Auto agent response simulation if current user is student and message ends with ?
      if (currentRole === 'student' && textToSend.includes('?')) {
        setTimeout(async () => {
          const replyText = `Thanks for asking! Regarding your enquiry about ${conversation.listingTitle}, I have forwarded this to our property team. Would you like to schedule an inspection tour this week?`;
          const autoReply = await sendMessage(conversation.id, {
            senderId: conversation.agentId,
            senderName: conversation.agentName,
            senderRole: 'agent',
            recipientId: currentUserId,
            text: replyText
          });
          setMessages(prev => [...prev, autoReply]);

          // Trigger real-time notification for student receiving agent auto-reply
          sendNotification({
            userId: currentUserId,
            title: `💬 Reply from ${conversation.agentName}`,
            body: replyText,
            type: 'message',
            metadata: {
              conversationId: conversation.id,
              listingId: conversation.listingId,
              senderName: conversation.agentName
            }
          });
        }, 1200);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!conversation) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-200">
      
      {/* Drawer Header */}
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src={currentRole === 'student' ? conversation.agentAvatar : conversation.studentAvatar}
            alt=""
            className="w-10 h-10 rounded-full object-cover border border-emerald-400"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-sm text-white">
                {currentRole === 'student' ? conversation.agentName : conversation.studentName}
              </h3>
              <span title="Verified Agent"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /></span>
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              {currentRole === 'student' ? conversation.agencyName : 'Verified Student Applicant'}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Property Snippet Bar */}
      <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 flex items-center gap-3 text-xs">
        <img src={conversation.listingPhoto} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-neutral-900 truncate">{conversation.listingTitle}</p>
          <p className="text-[11px] text-emerald-700 font-bold">£{conversation.listingPrice}/wk</p>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-100/50">
        {loading ? (
          <div className="text-center py-8 text-xs text-neutral-400 font-medium">
            Loading chat messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-400 font-medium">
            No messages yet. Send a message to start conversing with the agent.
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs font-medium leading-relaxed ${
                    msg.isSystemNotice
                      ? 'bg-amber-100 text-amber-900 border border-amber-200 text-center mx-auto'
                      : isMe
                      ? 'bg-slate-900 text-white rounded-br-xs'
                      : 'bg-white text-neutral-900 border border-neutral-200 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] text-neutral-400 font-semibold mt-1 px-1 flex items-center gap-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="p-3 bg-white border-t border-neutral-200 flex items-center gap-2">
        <input
          type="text"
          placeholder="Ask a question about availability, bills, or tours..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-medium text-neutral-900 focus:outline-none focus:border-slate-900"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl transition-all disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
