import React, { useState, useEffect, useRef } from 'react';
import { Send, X, ShieldCheck, UserCheck, MessageSquare, Building2, Clock, CheckCheck } from 'lucide-react';
import { Conversation, ChatMessage, UserRole } from '../types';
import { fetchMessages, sendMessage } from '../services/api';
import { sendNotification } from '../services/notificationService';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

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

    // Reset unread message counter when conversation is opened
    try {
      updateDoc(doc(db, 'conversations', conversation.id), { unreadCount: 0 }).catch(() => {});
    } catch (e) {}

    setLoading(true);

    // Initial fallback fetch
    fetchMessages(conversation.id)
      .then(data => setMessages(data))
      .catch(console.warn)
      .finally(() => setLoading(false));

    // Real-time Firestore snapshot listener for messages
    const msgsRef = collection(db, 'conversations', conversation.id, 'messages');
    const qMsgs = query(msgsRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(qMsgs, (snap) => {
      const liveMsgs: ChatMessage[] = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      } as ChatMessage));
      if (liveMsgs.length > 0) {
        setMessages(liveMsgs);
      }
    }, (err) => {
      console.warn('Real-time messages listener error:', err);
    });

    return () => unsubscribe();
  }, [conversation?.id]);

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
    } catch (err) {
      console.error(err);
    }
  };

  if (!conversation) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white dark:bg-black shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col animate-in slide-in-from-right duration-200">
      
      {/* Drawer Header */}
      <div className="p-4 bg-black text-white flex items-center justify-between border-b border-neutral-800 shrink-0">
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
            <p className="text-[10px] text-neutral-400 font-medium flex items-center gap-1.5">
              {currentRole === 'student' ? conversation.agencyName : 'Verified Student Applicant'}
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Property Snippet Bar */}
      <div className="px-4 py-2.5 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-3 text-xs shrink-0">
        <img src={conversation.listingPhoto} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-neutral-200 dark:border-neutral-800" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-neutral-900 dark:text-white truncate">{conversation.listingTitle}</p>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">₦{(conversation.listingPrice || 300000).toLocaleString()}/yr</p>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-neutral-100/50 dark:bg-black">
        {loading ? (
          <div className="text-center py-8 text-xs text-neutral-400 dark:text-neutral-500 font-medium">
            Loading chat messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-xs text-neutral-400 dark:text-neutral-500 font-medium">
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
                      ? 'bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white border border-neutral-300 dark:border-neutral-700 text-center mx-auto'
                      : isMe
                      ? 'bg-black dark:bg-emerald-600 text-white dark:text-black rounded-br-xs font-semibold'
                      : 'bg-white dark:bg-neutral-900 text-black dark:text-white border border-neutral-200 dark:border-neutral-800 rounded-bl-xs shadow-xs'
                  }`}
                >
                  <p>{msg.text}</p>
                </div>
                <span className="text-[9px] text-neutral-400 dark:text-neutral-500 font-semibold mt-1 px-1 flex items-center gap-1">
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions Chips */}
      <div className="px-3 py-2 bg-neutral-50 dark:bg-black border-t border-neutral-200 dark:border-neutral-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px] shrink-0">
        {(currentRole === 'student' ? [
          "Is this lodge available?",
          "Can I inspect tomorrow?",
          "Are light & water included?",
          "What is the total package price?"
        ] : [
          "Hello! Yes, it's available.",
          "I can arrange an inspection for you today.",
          "Please book a tour slot using the calendar.",
          "Water & 24/7 power backup are included!"
        ]).map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => {
              setInputText(chip);
            }}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-black dark:hover:border-emerald-500 text-neutral-700 dark:text-neutral-200 hover:text-black dark:hover:text-white font-medium whitespace-nowrap transition-colors shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="p-3 bg-white dark:bg-black border-t border-neutral-100 dark:border-neutral-800 flex items-center gap-2 shrink-0">
        <input
          type="text"
          placeholder="Ask a question about availability, bills, or tours..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-black dark:text-white bg-neutral-50 dark:bg-neutral-900 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-black dark:focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-black font-bold rounded-xl transition-all disabled:opacity-40 cursor-pointer shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
};
