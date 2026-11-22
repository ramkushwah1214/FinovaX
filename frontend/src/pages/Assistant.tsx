import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bot,
  Send,
  User,
  Sparkles,
  ArrowRight,
  Loader2,
  Lightbulb
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { SAMPLE_PROMPTS } from '../data/mockData';
import { Button } from '../components/ui/Button';

export const Assistant: React.FC = () => {
  const { chatMessages, isAiThinking, sendChatMessage } = useFinance();
  const { isAuthenticated, setIsAuthModalOpen } = useAuth();
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiThinking]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isAiThinking) return;
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    sendChatMessage(inputText.trim());
    setInputText('');
  };

  const handleChipClick = (prompt: string) => {
    if (isAiThinking) return;
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    sendChatMessage(prompt);
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col space-y-4">
      {/* Top Advisory Banner */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-blue-500/10 border border-emerald-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              FinovaX Financial Intelligence Assistant
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Deterministic state-aware advisor evaluating live database records and budget ceilings.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          MongoDB State Engine
        </span>
      </div>

      {/* Chat Messages Log Area */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-4 glass-panel rounded-2xl p-4 sm:p-6">
        {chatMessages.map((msg) => {
          const isUser = msg.sender === 'user';

          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-tr from-emerald-600 to-teal-400 text-white shadow-md shadow-emerald-500/20'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs leading-relaxed ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-white dark:bg-[#101A2D] border border-slate-200/80 dark:border-slate-800/80 text-slate-800 dark:text-slate-200 rounded-tl-none shadow-sm'
                }`}
              >
                {/* Text Content */}
                <div className="whitespace-pre-line font-normal">{msg.text}</div>

                {/* Suggested Navigation Action */}
                {msg.suggestedAction && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
                    <Link
                      to={msg.suggestedAction.path}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-500 hover:text-emerald-400"
                    >
                      <span>{msg.suggestedAction.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}

                <div
                  className={`text-[9px] mt-1.5 font-mono ${
                    isUser ? 'text-blue-200 text-right' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {/* AI Typing Indicator */}
        {isAiThinking && (
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3 rounded-2xl bg-white dark:bg-[#101A2D] border border-slate-200/80 dark:border-slate-800/80 rounded-tl-none flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
              <span>Analyzing live database records & budget constraints...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="flex-shrink-0">
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-2 font-medium">
          <Lightbulb className="w-3 h-3 text-amber-400" />
          <span>Suggested Inquiries:</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={isAiThinking}
              onClick={() => handleChipClick(prompt)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors border border-slate-200/80 dark:border-slate-700/60 font-medium text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>

      {/* Input Form Bar */}
      <form onSubmit={handleSend} className="flex items-center gap-2 flex-shrink-0">
        <input
          type="text"
          placeholder="Ask a question about your finances..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isAiThinking}
          className="flex-1 px-4 py-2.5 rounded-xl text-xs bg-white dark:bg-[#101A2D] border border-slate-200/80 dark:border-slate-800/80 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!inputText.trim() || isAiThinking}
          leftIcon={<Send className="w-4 h-4" />}
        >
          Send
        </Button>
      </form>
    </div>
  );
};
