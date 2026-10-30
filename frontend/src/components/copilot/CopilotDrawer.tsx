import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  ArrowRight,
  HelpCircle,
  ShieldAlert,
  Loader2,
  ChevronRight,
  FileText,
} from "lucide-react";
import { apiClient } from "../../api/client";
import { CopilotActionItem } from "../../types/api";

interface Message {
  id: string;
  sender: "user" | "copilot";
  text: string;
  actions?: CopilotActionItem[];
  timestamp: Date;
}

export const CopilotDrawer: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "copilot",
      text: "👋 **Hello Operator!** I am **FleetCopilot**, your GenAI & RAG Assistant connected to live fleet telematics and Standard Operating Procedures (SOPs).\n\nAsk me about maintenance risk, driver compliance, Scope 1 emissions, or anomalous fuel consumption.",
      timestamp: new Date(),
    },
  ]);

  const quickPrompts = [
    { label: "🛠️ Maintenance Risk", query: "Which vehicles are in maintenance right now and what is the risk?" },
    { label: "📚 SOP-101 Protocol", query: "Brake wear index on vehicle FL-104-SEMI is 0.89. What SOP applies?" },
    { label: "👨‍✈️ Driver Compliance", query: "Can you check driver license compliance and available operators?" },
    { label: "⚡ Isolation Forest", query: "What fuel anomalies has Isolation Forest detected?" },
    { label: "🌱 Decarbonization", query: "How can we reduce our carbon footprint this quarter?" },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input.trim();
    if (!textToSend || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: textToSend,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await apiClient.queryCopilot(textToSend);
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        text: res.response,
        actions: res.actions,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "copilot",
        text: "⚠️ **Copilot Connection Error:** Unable to reach the GenAI service. Please verify server connectivity.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = (targetUrl: string) => {
    setIsOpen(false);
    navigate(targetUrl);
  };

  // Simple Markdown-to-HTML parser for formatted responses
  const renderFormattedText = (text: string) => {
    return (
      <div className="space-y-2 text-xs leading-relaxed">
        {text.split("\n").map((line, idx) => {
          if (line.startsWith("### ")) {
            return (
              <h4 key={idx} className="font-bold text-sm text-slate-900 dark:text-white pt-1">
                {line.replace("### ", "")}
              </h4>
            );
          }
          if (line.startsWith("> ")) {
            return (
              <blockquote key={idx} className="border-l-2 border-teal-500 pl-2 text-slate-600 dark:text-slate-300 italic my-1">
                {line.replace("> ", "")}
              </blockquote>
            );
          }
          if (line.startsWith("- ")) {
            return (
              <li key={idx} className="ml-3 list-disc text-slate-700 dark:text-slate-200">
                {line.replace("- ", "")}
              </li>
            );
          }
          if (line.startsWith("|") && line.endsWith("|")) {
            if (line.includes("---")) return null;
            const cells = line.split("|").filter((c) => c.trim().length > 0);
            return (
              <div key={idx} className="flex gap-2 py-0.5 text-[11px] font-mono border-b border-slate-100 dark:border-slate-800">
                {cells.map((c, cIdx) => (
                  <span key={cIdx} className="flex-1 truncate">
                    {c.trim()}
                  </span>
                ))}
              </div>
            );
          }
          if (!line.trim()) return <div key={idx} className="h-1" />;
          return (
            <p key={idx} className="text-slate-700 dark:text-slate-200">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-full shadow-lg shadow-teal-500/25 hover:shadow-xl hover:shadow-teal-500/35 hover:scale-105 transition-all duration-200 border border-teal-400/30 group"
      >
        <span className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-200 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
        </span>
        <Sparkles className="w-4 h-4 text-amber-200 group-hover:rotate-12 transition-transform" />
        <span className="text-xs font-semibold tracking-wide">FleetCopilot AI</span>
      </button>

      {/* Drawer Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-over Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col border-l border-slate-200 dark:border-slate-800 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-gradient-to-r from-slate-900 to-[#0F172A] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold tracking-tight">FleetCopilot</h3>
                <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 border border-teal-400/30">
                  RAG & Bedrock
                </span>
              </div>
              <p className="text-[11px] text-slate-400">AWS Bedrock & Grounded Fleet SOPs</p>
            </div>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Prompts Bar */}
        <div className="p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex gap-2 overflow-x-auto no-scrollbar">
          {quickPrompts.map((qp, i) => (
            <button
              key={i}
              onClick={() => handleSend(qp.query)}
              disabled={loading}
              className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-medium bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:text-teal-600 dark:hover:text-teal-400 transition-colors shadow-2xs"
            >
              {qp.label}
            </button>
          ))}
        </div>

        {/* Chat Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.sender === "copilot" && (
                <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl p-3.5 shadow-2xs ${
                  msg.sender === "user"
                    ? "bg-teal-600 text-white rounded-br-none"
                    : "bg-slate-100 dark:bg-slate-800/90 text-slate-800 dark:text-slate-100 rounded-bl-none border border-slate-200/60 dark:border-slate-700/60"
                }`}
              >
                {msg.sender === "copilot" ? (
                  <>
                    {renderFormattedText(msg.text)}

                    {/* Interactive Action Buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-700/80 space-y-1.5">
                        <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          Suggested Actions:
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.actions.map((act, aIdx) => (
                            <button
                              key={aIdx}
                              onClick={() => handleActionClick(act.target_url)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-50 dark:bg-teal-900/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 hover:bg-teal-100 transition-colors"
                            >
                              <span>{act.label}</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs leading-relaxed">{msg.text}</p>
                )}
                <span className="block text-[9px] text-right mt-1 opacity-60">
                  {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {msg.sender === "user" && (
                <div className="w-7 h-7 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-2.5 items-center text-xs text-slate-500 dark:text-slate-400">
              <div className="w-7 h-7 rounded-lg bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <span className="animate-pulse">Reasoning with Fleet SOPs & live database...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Copilot (e.g. 'Check SOP for brake wear')..."
              disabled={loading}
              className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-teal-500 transition-colors"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition-colors shrink-0 shadow-2xs"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};
