import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Bell, Plus, Trash2, X, Clock, Check } from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';

export default function RemindersPage() {
    const { user } = useAuth();
    const [reminders, setReminders] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({ content: '', remind_at: '' });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // active | done | all

    useEffect(() => {
        if (user) loadReminders();
    }, [user]);

    async function loadReminders() {
        const { data } = await supabase
            .from('reminders')
            .select('*')
            .eq('user_id', user.id)
            .order('remind_at', { ascending: true });

        setReminders(data || []);
        setLoading(false);
    }

    async function addReminder() {
        if (!form.content.trim() || !form.remind_at) return;

        const { data, error } = await supabase
            .from('reminders')
            .insert({
                user_id: user.id,
                content: form.content.trim(),
                remind_at: new Date(form.remind_at).toISOString(),
            })
            .select()
            .single();

        if (!error && data) {
            setReminders((prev) => [...prev, data].sort((a, b) =>
                new Date(a.remind_at) - new Date(b.remind_at)
            ));
            setForm({ content: '', remind_at: '' });
            setShowModal(false);
        }
    }

    async function toggleDone(id, currentDone) {
        const { data, error } = await supabase
            .from('reminders')
            .update({ is_done: !currentDone })
            .eq('id', id)
            .select()
            .single();

        if (!error && data) {
            setReminders((prev) => prev.map((r) => (r.id === id ? data : r)));
        }
    }

    async function deleteReminder(id) {
        await supabase.from('reminders').delete().eq('id', id);
        setReminders((prev) => prev.filter((r) => r.id !== id));
    }

    const filtered = reminders.filter((r) => {
        if (filter === 'active') return !r.is_done;
        if (filter === 'done') return r.is_done;
        return true;
    });

    // Get current datetime in local format for input min
    const now = new Date();
    const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

    return (
        <div className="app-layout">
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1>Reminders 🔔</h1>
                        <p className="page-header-subtitle">{reminders.filter(r => !r.is_done).length} active</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Add
                    </button>
                </div>

                {/* Filters */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: 'var(--space-md)' }}>
                    {['active', 'done', 'all'].map((f) => (
                        <button
                            key={f}
                            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => setFilter(f)}
                            style={{ padding: '6px 14px', fontSize: 'var(--font-sm)' }}
                        >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                        </button>
                    ))}
                </div>

                {filtered.length === 0 && !loading ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Bell size={28} />
                        </div>
                        <h3>No {filter !== 'all' ? filter : ''} reminders</h3>
                        <p>{filter === 'active' ? 'You\'re all caught up! Add a new reminder.' : 'Nothing here yet.'}</p>
                    </div>
                ) : (
                    <div className="card-grid">
                        {filtered.map((reminder) => {
                            const isOverdue = !reminder.is_done && isPast(parseISO(reminder.remind_at));

                            return (
                                <div
                                    key={reminder.id}
                                    className={`glass-card card-item ${reminder.is_done ? 'reminder-done' : ''}`}
                                >
                                    <div className="card-item-header">
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
                                            <button
                                                className={`checkbox ${reminder.is_done ? 'checked' : ''}`}
                                                onClick={() => toggleDone(reminder.id, reminder.is_done)}
                                            >
                                                {reminder.is_done && <Check size={14} color="white" />}
                                            </button>
                                            <div style={{ flex: 1 }}>
                                                <div className="card-item-body" style={{ fontSize: 'var(--font-md)', fontWeight: 500 }}>
                                                    {reminder.content}
                                                </div>
                                                <div className={`reminder-time ${isOverdue ? 'reminder-overdue' : ''}`} style={{ marginTop: '6px' }}>
                                                    <Clock size={14} />
                                                    {format(parseISO(reminder.remind_at), 'MMM d, yyyy · h:mm a')}
                                                    {isOverdue && <span style={{ fontWeight: 600, marginLeft: 4 }}>• Overdue</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <button className="card-action-btn delete" onClick={() => deleteReminder(reminder.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add Reminder Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>New Reminder</h3>
                                <button className="card-action-btn" onClick={() => setShowModal(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label className="input-label">What to remind?</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="e.g., Call investor at 3 PM"
                                        value={form.content}
                                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">When?</label>
                                    <input
                                        type="datetime-local"
                                        className="input-field"
                                        value={form.remind_at}
                                        onChange={(e) => setForm({ ...form, remind_at: e.target.value })}
                                        min={localNow}
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={addReminder}
                                    disabled={!form.content.trim() || !form.remind_at}
                                >
                                    Set Reminder
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
