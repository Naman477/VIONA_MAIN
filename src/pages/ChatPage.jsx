import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { sendMessage, detectSmartCommand, detectTone } from '../lib/gemini';
import VoiceInput from '../components/VoiceInput';
import {
    Send,
    Menu,
    Plus,
    X,
    MessageSquare,
    Trash2,
    Sparkles,
} from 'lucide-react';
import { format } from 'date-fns';

export default function ChatPage() {
    const { user, profile } = useAuth();
    const [sessions, setSessions] = useState([]);
    const [activeSessionId, setActiveSessionId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showDrawer, setShowDrawer] = useState(false);
    const [toast, setToast] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Load sessions
    useEffect(() => {
        if (!user) return;
        loadSessions();
    }, [user]);

    // Load messages when session changes
    useEffect(() => {
        if (!activeSessionId) return;
        loadMessages(activeSessionId);
    }, [activeSessionId]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isTyping]);

    async function loadSessions() {
        const { data } = await supabase
            .from('chat_sessions')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false });

        setSessions(data || []);

        // Auto-select latest session or create one
        if (data && data.length > 0) {
            setActiveSessionId(data[0].id);
        }
    }

    async function loadMessages(sessionId) {
        const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

        setMessages(data || []);
    }

    async function createNewSession() {
        const { data, error } = await supabase
            .from('chat_sessions')
            .insert({ user_id: user.id, title: 'New Chat' })
            .select()
            .single();

        if (!error && data) {
            setSessions((prev) => [data, ...prev]);
            setActiveSessionId(data.id);
            setMessages([]);
            setShowDrawer(false);
        }
    }

    async function deleteSession(sessionId) {
        await supabase.from('messages').delete().eq('session_id', sessionId);
        await supabase.from('chat_sessions').delete().eq('id', sessionId);

        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
            setActiveSessionId(null);
            setMessages([]);
        }
    }

    function showToast(message, type = 'success') {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }

    async function handleSmartCommand(command, userMessageContent) {
        if (command.type === 'note') {
            const { error } = await supabase.from('smart_notes').insert({
                user_id: user.id,
                content: command.content,
                source: 'chat',
            });
            if (!error) showToast('📝 Saved to Smart Notes!');
        } else if (command.type === 'idea') {
            const { error } = await supabase.from('idea_vault').insert({
                user_id: user.id,
                title: command.content.slice(0, 50),
                content: command.content,
            });
            if (!error) showToast('💡 Saved to Idea Vault!');
        }
    }

    async function handleSend() {
        const trimmed = input.trim();
        if (!trimmed || isTyping) return;

        let sessionId = activeSessionId;

        // Create session if none
        if (!sessionId) {
            const { data, error } = await supabase
                .from('chat_sessions')
                .insert({ user_id: user.id, title: trimmed.slice(0, 40) })
                .select()
                .single();

            if (error || !data) return;
            sessionId = data.id;
            setActiveSessionId(data.id);
            setSessions((prev) => [data, ...prev]);
        }

        // Detect tone & smart commands
        const tone = detectTone(trimmed);
        const smartCommand = detectSmartCommand(trimmed);

        // Save user message
        const userMessage = {
            id: crypto.randomUUID(),
            session_id: sessionId,
            user_id: user.id,
            role: 'user',
            content: trimmed,
            tone_detected: tone,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsTyping(true);

        // Save to DB
        await supabase.from('messages').insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'user',
            content: trimmed,
            tone_detected: tone,
        });

        // Handle smart commands
        if (smartCommand) {
            await handleSmartCommand(smartCommand, trimmed);
        }

        // Get AI response
        const allMessages = [...messages, userMessage];
        const aiResponse = await sendMessage(allMessages, profile);

        const assistantMessage = {
            id: crypto.randomUUID(),
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: aiResponse.content,
            tone_detected: aiResponse.tone,
            created_at: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);

        // Save AI message to DB
        await supabase.from('messages').insert({
            session_id: sessionId,
            user_id: user.id,
            role: 'assistant',
            content: aiResponse.content,
            tone_detected: aiResponse.tone,
        });

        // Update session title if it's the first message
        if (messages.length === 0) {
            await supabase
                .from('chat_sessions')
                .update({ title: trimmed.slice(0, 40), updated_at: new Date().toISOString() })
                .eq('id', sessionId);

            setSessions((prev) =>
                prev.map((s) =>
                    s.id === sessionId ? { ...s, title: trimmed.slice(0, 40) } : s
                )
            );
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleVoiceTranscript(transcript) {
        setInput((prev) => (prev ? prev + ' ' + transcript : transcript));
        inputRef.current?.focus();
    }

    const activeSession = sessions.find((s) => s.id === activeSessionId);

    return (
        <div className="chat-page">
            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type}`}>{toast.message}</div>
            )}

            {/* Header */}
            <div className="chat-header">
                <div className="chat-header-title">
                    <button
                        className="chat-btn chat-mic-btn"
                        onClick={() => setShowDrawer(true)}
                        style={{ width: 36, height: 36 }}
                    >
                        <Menu size={18} />
                    </button>
                    <div>
                        <h2>{activeSession?.title || 'VIONA'}</h2>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="chat-status-dot" />
                    <span style={{ fontSize: 'var(--font-sm)', color: 'var(--text-tertiary)' }}>Online</span>
                </div>
            </div>

            {/* Session Drawer */}
            {showDrawer && (
                <>
                    <div className="session-drawer-overlay" onClick={() => setShowDrawer(false)} />
                    <div className="session-drawer">
                        <div className="session-drawer-header">
                            <h3>Chat Sessions</h3>
                            <button className="chat-btn chat-mic-btn" onClick={() => setShowDrawer(false)} style={{ width: 32, height: 32 }}>
                                <X size={16} />
                            </button>
                        </div>
                        <div style={{ padding: 'var(--space-sm) var(--space-md)' }}>
                            <button className="btn btn-primary btn-block btn-sm" onClick={createNewSession}>
                                <Plus size={16} /> New Chat
                            </button>
                        </div>
                        <div className="session-list">
                            {sessions.map((session) => (
                                <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <button
                                        className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveSessionId(session.id);
                                            setShowDrawer(false);
                                        }}
                                    >
                                        <MessageSquare size={14} />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {session.title}
                                        </span>
                                    </button>
                                    <button
                                        className="card-action-btn delete"
                                        onClick={() => deleteSession(session.id)}
                                        style={{ flexShrink: 0 }}
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Messages */}
            <div className="chat-messages">
                {messages.length === 0 && !isTyping ? (
                    <div className="chat-welcome">
                        <Sparkles size={48} style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-md)' }} />
                        <h2>Hey{profile?.full_name ? `, ${profile.full_name}` : ''}! 👋</h2>
                        <p>I'm VIONA, your personal AI assistant. How can I help you today?</p>
                        <div className="chat-suggestions">
                            {[
                                'Help me brainstorm ideas 💡',
                                'Draft a message ✍️',
                                "What should I focus on today?",
                                'Analyze pros and cons ⚖️',
                            ].map((suggestion) => (
                                <button
                                    key={suggestion}
                                    className="suggestion-chip"
                                    onClick={() => {
                                        setInput(suggestion);
                                        inputRef.current?.focus();
                                    }}
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <div key={msg.id} className={`message-row ${msg.role}`}>
                            <div className={`message-avatar ${msg.role}`}>
                                {msg.role === 'user'
                                    ? (profile?.full_name?.[0] || 'U')
                                    : '✦'}
                            </div>
                            <div>
                                <div className={`message-bubble ${msg.role}`}>
                                    {msg.content}
                                </div>
                                <div className="message-meta" style={{
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                                }}>
                                    <span className="message-time">
                                        {format(new Date(msg.created_at), 'h:mm a')}
                                    </span>
                                    {msg.tone_detected && msg.tone_detected !== 'calm' && (
                                        <span className={`tone-badge ${msg.tone_detected}`}>
                                            {msg.tone_detected}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {isTyping && (
                    <div className="typing-indicator">
                        <div className={`message-avatar assistant`}>✦</div>
                        <div className="typing-dots">
                            <span /><span /><span />
                        </div>
                        <span className="typing-text">VIONA is thinking...</span>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="chat-input-area">
                <div className="chat-input-wrapper">
                    <textarea
                        ref={inputRef}
                        className="chat-input"
                        placeholder="Message VIONA..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        rows={1}
                        disabled={isTyping}
                    />
                    <VoiceInput onTranscript={handleVoiceTranscript} disabled={isTyping} />
                    <button
                        className="chat-btn chat-send-btn"
                        onClick={handleSend}
                        disabled={!input.trim() || isTyping}
                    >
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
}
