import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { api } from '../services/api';
import {
  Bot,
  User,
  Send,
  Sparkles,
  Trash2,
  Copy,
  Check,
  FileText,
  Compass,
  Loader2,
  ShieldAlert,
  Target,
  AlertOctagon,
  HeartPulse,
} from 'lucide-react';

const SUGGESTED_QUERIES = [
  { label: 'Project Deadline', query: 'What is the project deadline and key milestone schedule?' },
  { label: 'Critical Risks', query: 'What are the major risks and immediate mitigations required?' },
  { label: 'Active Blockers', query: 'What blockers are currently identified from meeting notes?' },
  { label: 'Pending Actions', query: 'What tasks are pending and who owns them?' },
  { label: 'Project Scope', query: 'Summarize the overall project scope and deliverables.' },
  { label: 'Health Breakdown', query: 'How healthy is the project and what is the dimensional breakdown?' },
  { label: 'Immediate Next Focus', query: 'What should the team focus on next?' },
];

export const AssistantPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadHistory();
  }, []);

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
            content: 'Welcome to the **Project Intelligence Assistant**. I am connected directly to your RAG knowledge base. Ask me about project scope, risks, blockers, pending actions, deadlines, or health status.',
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

  const handleSend = async (queryText?: string) => {
    const query = (queryText || inputValue).trim();
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
        content: 'Unable to connect to the project intelligence service. Please verify server connectivity.',
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
          content: 'Conversation reset. How can I assist you with your project intelligence today?',
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

  const getAgentIcon = (name?: string) => {
    if (!name) return <Compass className="w-3 h-3" />;
    const n = name.toLowerCase();
    if (n.includes('risk')) return <ShieldAlert className="w-3 h-3 text-rose-400" />;
    if (n.includes('scope')) return <Target className="w-3 h-3 text-teal-400" />;
    if (n.includes('blocker')) return <AlertOctagon className="w-3 h-3 text-amber-400" />;
    if (n.includes('health')) return <HeartPulse className="w-3 h-3 text-teal-400" />;
    return <Compass className="w-3 h-3 text-indigo-400" />;
  };

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col glass-panel border-slate-800 overflow-hidden">
      {/* Workspace Header */}
      <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <Bot className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-bold text-white tracking-tight">Project Intelligence Assistant</h2>
          </div>
          <p className="text-xs text-slate-400">Ask questions grounded in your uploaded project documents</p>
        </div>

        <button
          onClick={handleClear}
          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300 hover:text-rose-400 transition-colors flex items-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear Chat</span>
        </button>
      </div>

      {/* Suggested Questions Ribbon */}
      <div className="px-6 py-2.5 bg-slate-900/40 border-b border-slate-800/80 overflow-x-auto scrollbar-none shrink-0">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-teal-400" /> Suggested:
          </span>
          {SUGGESTED_QUERIES.map((item, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(item.query)}
              disabled={isLoading}
              className="px-3 py-1 text-xs rounded-full bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-teal-300 hover:border-teal-500/50 transition-colors disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Header info */}
            <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-400">
              {msg.role === 'user' ? (
                <span className="flex items-center gap-1 font-semibold text-slate-300">
                  <User className="w-3.5 h-3.5" /> You
                </span>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 font-semibold text-teal-400">
                    <Bot className="w-4 h-4" /> Project Advisor
                  </span>
                  {msg.agentUsed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-slate-800 border border-slate-700 text-slate-200">
                      {getAgentIcon(msg.agentUsed)}
                      <span>Agent Used: {msg.agentUsed}</span>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Bubble */}
            <div
              className={`p-4 rounded-xl text-xs leading-relaxed max-w-[85%] relative group shadow-lg ${
                msg.role === 'user'
                  ? 'bg-teal-600/20 border border-teal-500/40 text-slate-100 rounded-tr-none'
                  : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
              }`}
            >
              <div className="whitespace-pre-wrap font-sans space-y-2">{msg.content}</div>

              {/* Source References */}
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400 flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-slate-300 flex items-center gap-1">
                    <FileText className="w-3 h-3 text-teal-400" /> Sources:
                  </span>
                  {msg.sources.map((src, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-mono text-[10px] border border-slate-700"
                    >
                      {src}
                    </span>
                  ))}
                </div>
              )}

              {/* Copy button */}
              <button
                onClick={() => handleCopy(msg.id, msg.content)}
                title="Copy response"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded bg-slate-800 text-slate-400 hover:text-slate-200"
              >
                {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-400">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-400 rounded-tl-none flex items-center gap-2">
              <span>Routing intent and retrieving grounded document chunks...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/70 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 max-w-4xl mx-auto"
        >
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask anything about your project documents (e.g. 'What are our biggest risks?', 'What is our deadline?')..."
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-teal-500/60 transition-colors shadow-inner"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="px-5 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-colors flex items-center gap-2 shrink-0 shadow-sm shadow-teal-500/30"
          >
            <span>Send Question</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
