import React, { useState, useEffect, useRef } from 'react';
import { X, Send, User, MessageSquare } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const FemaleAvatar = ({ size = 20, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className={className}>
        {/* AI sparkle */}
        <path d="M19 2l.5 1.5 1.5.5-1.5.5L19 6l-.5-1.5L17 4l1.5-.5z" />
        {/* Face */}
        <circle cx="12" cy="10" r="4" />
        {/* Feminine hair — curved arc over head */}
        <path d="M8.5 8C9 5.2 10.4 4 12 4s3 1.2 3.5 4" />
        {/* Shoulders / body */}
        <path d="M6 21v-1a6 6 0 0 1 12 0v1" />
    </svg>
);

export default function EvaChatbot({ user, malls, units }) {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const endRef = useRef(null);

    // --- LOGIC ---
    useEffect(() => {
        // Initial Greeting
        if (malls.length > 0 && messages.length === 0) {
            setIsTyping(true);
            const timeout = setTimeout(() => {
                setMessages([
                    {
                        sender: 'eva',
                        text: `Hi ${user.username || 'User'}, I am Eva you AI assitant for EW property information. How can i assist you today, Which property you like to know.\n\nNote:This model trained to provide you the information of the EW property.`
                    }
                ]);
                setIsTyping(false);
            }, 1000);
            return () => clearTimeout(timeout);
        }
    }, [user.username, malls.length, messages.length]);

    const scrollToBottom = () => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen, isTyping]);

    const handleSend = async (e) => {
        e.preventDefault();
        const text = input.trim();
        if (!text) return;

        // Triggers to reset conversation
        const lowerText = text.toLowerCase();
        if (['thank you', 'restart', 'stop', 'thank you.', 'thanks'].includes(lowerText)) {
            setMessages([]);
            setInput('');
            setIsTyping(true);
            setTimeout(() => {
                setMessages([{
                    sender: 'eva',
                    text: "Conversation reset. How else can I assist you today?"
                }]);
                setIsTyping(false);
            }, 800);
            return;
        }

        // Capture current messages as history *before* adding the new user message to the UI
        const currentHistory = [...messages];

        // 1. Add User Message to UI
        const userMsg = { sender: 'user', text };
        setMessages(prev => [...prev, userMsg]); // Update UI immediately
        setInput('');
        setIsTyping(true);

        // 2. Send to Backend
        try {
            const token = localStorage.getItem('token');
            const API_URL = '/api'; // Relative path (Proxied)

            // Pass history (excluding just added message for clarity, or including it? Backend expects history + new msg seaprated or combined?)
            // Implementation in server.js expects 'history' as array of {sender, text} + 'message' as current text.
            // So we pass the *existing* messages before this one as history.

            const res = await fetch(`${API_URL}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    message: text,
                    history: currentHistory // Pass previous history
                })
            });

            if (!res.ok) throw new Error('Network response was not ok');

            const data = await res.json();

            // 3. Add Eva Response
            const reply = { sender: 'eva', text: data.response };
            setMessages(prev => [...prev, reply]);

            // 4. Handle Actions (Logout)
            if (data.action === 'logout') {
                setTimeout(() => {
                    localStorage.removeItem('token');
                    window.location.reload(); // Simple logout trigger
                }, 1500);
            }

        } catch (error) {
            console.error("Chat error:", error);
            setMessages(prev => [...prev, { sender: 'eva', text: "I'm having trouble connecting to the server. Please try again." }]);
        } finally {
            setIsTyping(false);
        }
    };

    // --- UI COMPONENTS ---

    const MessageBubble = ({ msg }) => {
        const isUser = msg.sender === 'user';
        return (
            <div className={`flex items-start mb-4 animate-in slide-in-from-bottom-2 fade-in duration-300 ${isUser ? 'justify-end' : 'justify-start'}`}>
                {/* Avatar - Assistant */}
                {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center mr-2 shrink-0 shadow-sm mt-1">
                        <FemaleAvatar size={16} className="text-slate-600" />
                    </div>
                )}

                {/* Bubble */}
                <div className={`
                    max-w-[85%] px-4 py-3 text-[14px] leading-relaxed shadow-sm relative overflow-hidden
                    ${isUser
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm'
                        : 'bg-white text-slate-800 border border-slate-200 rounded-2xl rounded-tl-sm'
                    }
                `}>
                    {isUser ? (
                        <div className="whitespace-pre-wrap">{msg.text}</div>
                    ) : (
                        <div className="markdown-body">
                            <ReactMarkdown
                                components={{
                                    ul: ({ node, ...props }) => <ul className="list-disc leading-relaxed pl-5 my-2 space-y-1 block marker:text-slate-400" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal leading-relaxed pl-5 my-2 space-y-1 block marker:text-slate-500" {...props} />,
                                    li: ({ node, ...props }) => <li className="mb-1 pl-1" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-indigo-600 hover:text-indigo-800 underline font-semibold decoration-indigo-300 hover:decoration-indigo-800 break-all transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed block" {...props} />,
                                    table: ({ node, ...props }) => <div className="overflow-x-auto my-2 rounded-lg border border-slate-200"><table className="w-full border-collapse text-xs table-auto bg-slate-50/50" {...props} /></div>,
                                    th: ({ node, ...props }) => <th className="border-b border-r border-slate-200 p-2 bg-slate-100 font-bold text-left text-slate-700 last:border-r-0" {...props} />,
                                    td: ({ node, ...props }) => <td className="border-b border-r border-slate-200 p-2 text-slate-600 last:border-r-0 last:border-b-0" {...props} />,
                                    code: ({ node, inline, ...props }) => inline
                                        ? <code className="bg-slate-100 px-1.5 py-0.5 rounded text-xs font-mono text-pink-600 border border-slate-200 font-medium" {...props} />
                                        : <pre className="block bg-slate-800 text-slate-100 p-3 rounded-lg text-xs font-mono my-3 overflow-x-auto shadow-inner border border-slate-700"><code {...props} /></pre>,
                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-indigo-300 pl-4 py-1 my-2 italic text-slate-600 bg-slate-50 rounded-r" {...props} />,
                                }}
                            >
                                {msg.text}
                            </ReactMarkdown>
                        </div>
                    )}
                </div>

                {/* Avatar - User */}
                {isUser && (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center ml-2 shrink-0 shadow-sm mt-1">
                        <User size={16} className="text-indigo-600" />
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="fixed bottom-6 right-6 z-40 pointer-events-none w-full md:w-auto flex flex-col items-end filter drop-shadow-xl">

            {/* Chat Window */}
            {isOpen && (
                <div className="pointer-events-auto w-[calc(100vw-3rem)] md:w-[400px] bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/40 mb-4 font-sans animate-in slide-in-from-bottom-10 zoom-in-95 duration-400 ease-out h-[600px] max-h-[75vh]">

                    {/* Header */}
                    <div className="bg-white/60 backdrop-blur-md border-b border-white/20 p-4 flex justify-between items-center shadow-sm z-10 shrink-0">
                        <div className="flex items-center">
                            <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                                <FemaleAvatar size={20} className="text-white" />
                            </div>
                            <div className="ml-3">
                                <h3 className="font-bold text-slate-800 text-sm">Eva AI Assistant</h3>
                                <div className="flex items-center">
                                    <span className="w-2 h-2 rounded-full bg-green-500 mr-1.5 animate-pulse"></span>
                                    <span className="text-xs text-slate-500 font-medium">Online</span>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
                            aria-label="Close chat"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto p-4 scroll-smooth">
                        {messages.map((m, i) => (
                            <MessageBubble key={i} msg={m} />
                        ))}

                        {/* Typing Indicator */}
                        {isTyping && (
                            <div className="flex items-end mb-4 animate-in fade-in duration-300">
                                <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center mr-2 shrink-0">
                                    <FemaleAvatar size={16} className="text-slate-600" />
                                </div>
                                <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex items-center space-x-1">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Input Area (Sticky Footer) */}
                    <div className="bg-white border-t border-slate-100 p-4 z-10">
                        <form
                            onSubmit={handleSend}
                            className="relative flex items-end bg-slate-50 border border-slate-200 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-100 focus-within:border-indigo-400 transition-all shadow-inner"
                        >
                            <textarea
                                className="w-full bg-transparent border-0 px-4 py-3 text-[14px] text-slate-700 placeholder:text-slate-400 focus:ring-0 resize-none max-h-32 min-h-[48px]"
                                placeholder="Type your message..."
                                rows={1}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend(e);
                                    }
                                }}
                                aria-label="Chat message"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim()}
                                className="p-2 mb-1.5 mr-1.5 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                                aria-label="Send message"
                            >
                                <Send size={18} />
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Floating Action Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="pointer-events-auto bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white p-4 rounded-full shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1 hover:scale-105 transition-all duration-300 flex items-center justify-center group opacity-80 hover:opacity-100 hover:ring-4 ring-indigo-500/20"
                    aria-label="Open chat"
                >
                    <MessageSquare size={24} className="fill-current" />
                    <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap ml-0 group-hover:ml-3 font-semibold tracking-wide">
                        Ask Eva
                    </span>
                </button>
            )}
        </div>
    );
}
