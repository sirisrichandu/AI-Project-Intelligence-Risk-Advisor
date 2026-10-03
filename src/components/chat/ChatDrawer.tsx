import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../../types';
import { api } from '../../services/api';
import {
  Send,
  Bot,
  User,
  Sparkles,
  Trash2,
  Copy,
  Check,
  X,
  FileText,
  Loader2,
  Compass,
} from 'lucide-react';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
}

const SUGGESTED_QUESTIONS = [
  'What is the project deadline?',
  'What are the major risks and immediate mitigations?',
  'What blockers are currently identified?',
  'What tasks are pending and at risk?',
  'Summarize the project scope and deliverables.',
  'How healthy is the project and what is the breakdown?',
  'What should the team focus on next?',
];

export const ChatDrawer: React.FC<ChatDrawerProps> = ({ isOpen, onClose, initialQuery }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
      if (initialQuery) {
        handleSend(initialQuery);
      }
    }
  }, [isOpen]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const loadHistory = async () => {
    try {
      const data = await api.getChatHistory();
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
      } else {
        setMessages([
          {
            id: 'init-1',
            role: 'assistant',
            content: 'Hello! I am your **Project Intelligence & Risk Advisor**. I am grounded in your uploaded project documents. Ask me anything about project scope, risks, blockers, pending actions, deadlines, or health status.',
            timestamp: new Date().toISOString(),
            agentUsed: 'Routing Agent',
            sources: ['HealthPulse_SRS_v2.docx', 'Sprint_04_Meeting_Notes.txt'],
          },
        ]);
      }
    } catch (err) {
      console.warn('Could not load chat history:', err);
    }
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || inputValue).trim();
    if (!query || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsLoading(true);

    try {
      const res = await api.askAssistant(query);
      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        timestamp: new Date().toISOString(),
        agentUsed: res.agentUsed,
        sources: res.sources,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: 'Unable to connect to the project intelligence service. Please check your network or verify that the backend is running.',
        timestamp: new Date().toISOString(),
        agentUsed: 'System Error',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await api.clearChatHistory();
      setMessages([
        {
          id: 'fresh-1',
          role: 'assistant',
          content: 'Conversation cleared. How can I assist you with your project intelligence today?',
          timestamp: new Date().toISOString(),
          agentUsed: 'Routing Agent',
        },
      ]);
    } catch (err) {
      console.warn('Failed to clear chat:', err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col transition-all">
      {/* Drawer Header */}
      <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/50">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 tracking-tight">Project Intelligence Assistant</h2>
            <p className="text-xs text-slate-400">Grounded in uploaded project artifacts & RAG</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleClear}
            title="Clear Chat"
            className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="Close Assistant"
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Suggested Questions Pills */}
      <div className="px-5 py-2.5 bg-slate-900/40 border-b border-slate-800/80 overflow-x-auto scrollbar-none shrink-0">
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-teal-400" /> Prompts:
          </span>
          {SUGGESTED_QUESTIONS.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              disabled={isLoading}
              className="px-2.5 py-1 text-xs rounded-full bg-slate-800/70 border border-slate-700/80 text-slate-300 hover:text-teal-300 hover:border-teal-500/40 transition-colors disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Sender / Agent Badge */}
            <div className="flex items-center gap-2 mb-1 text-xs text-slate-400">
              {msg.role === 'user' ? (
                <span className="flex items-center gap-1 font-medium text-slate-300">
                  <User className="w-3 h-3" /> You
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-medium text-teal-400">
                    <Bot className="w-3.5 h-3.5" /> Advisor
                  </span>
                  {msg.agentUsed && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-teal-500/10 border border-teal-500/30 text-teal-300">
                      <Compass className="w-2.5 h-2.5" /> {msg.agentUsed}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`p-3.5 rounded-xl text-xs leading-relaxed max-w-[92%] relative group ${
                msg.role === 'user'
                  ? 'bg-teal-600/20 border border-teal-500/40 text-slate-100 rounded-tr-none'
                  : 'bg-slate-900/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans">{msg.content}</div>

              {/* Sources Citation */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-400 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-teal-400" /> Sources:
                  </span>
                  {msg.sources.map((src, i) => (
                    <span
                      key={i}
                      className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono border border-slate-700/60"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Copy action */}
              <button
                onClick={() => handleCopy(msg.id, msg.content)}
                title="Copy response"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-slate-800/80 text-slate-400 hover:text-slate-200"
              >
                {copiedId === msg.id ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-400 rounded-tl-none flex items-center gap-2">
              <span>Routing query to specialized agent & querying knowledge base...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/60 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about risks, scope, blockers, or deadlines..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60 transition-colors"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-4 py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shrink-0"
          >
            <span>Ask</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
        <p className="text-[10px] text-slate-400 text-center mt-2">
          Grounded directly in indexed documents · Sub-second routing
        </p>
      </div>
    </div>
  );
};
