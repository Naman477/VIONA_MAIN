import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Lightbulb, Plus, Trash2, Edit3, X, Save } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORIES = ['general', 'business', 'tech', 'creative', 'personal'];

export default function IdeasPage() {
    const { user } = useAuth();
    const [ideas, setIdeas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({ title: '', content: '', category: 'general' });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadIdeas();
    }, [user]);

    async function loadIdeas() {
        const { data } = await supabase
            .from('idea_vault')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setIdeas(data || []);
        setLoading(false);
    }

    function openModal(idea = null) {
        if (idea) {
            setEditingId(idea.id);
            setForm({ title: idea.title, content: idea.content || '', category: idea.category || 'general' });
        } else {
            setEditingId(null);
            setForm({ title: '', content: '', category: 'general' });
        }
        setShowModal(true);
    }

    async function saveIdea() {
        if (!form.title.trim()) return;

        if (editingId) {
            const { data, error } = await supabase
                .from('idea_vault')
                .update({ ...form, updated_at: new Date().toISOString() })
                .eq('id', editingId)
                .select()
                .single();

            if (!error && data) {
                setIdeas((prev) => prev.map((i) => (i.id === editingId ? data : i)));
            }
        } else {
            const { data, error } = await supabase
                .from('idea_vault')
                .insert({ user_id: user.id, ...form })
                .select()
                .single();

            if (!error && data) {
                setIdeas((prev) => [data, ...prev]);
            }
        }

        setShowModal(false);
        setForm({ title: '', content: '', category: 'general' });
        setEditingId(null);
    }

    async function deleteIdea(id) {
        await supabase.from('idea_vault').delete().eq('id', id);
        setIdeas((prev) => prev.filter((i) => i.id !== id));
    }

    return (
        <div className="app-layout">
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1>Idea Vault 💡</h1>
                        <p className="page-header-subtitle">{ideas.length} ideas stored</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => openModal()}>
                        <Plus size={16} /> Add
                    </button>
                </div>

                {ideas.length === 0 && !loading ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <Lightbulb size={28} />
                        </div>
                        <h3>No ideas yet</h3>
                        <p>Your brilliant ideas deserve a home. Start saving them here!</p>
                    </div>
                ) : (
                    <div className="card-grid">
                        {ideas.map((idea) => (
                            <div key={idea.id} className="glass-card card-item">
                                <div className="card-item-header">
                                    <div className="card-item-title">{idea.title}</div>
                                    <span className="category-badge">{idea.category}</span>
                                </div>
                                {idea.content && (
                                    <div className="card-item-body">{idea.content}</div>
                                )}
                                <div className="card-item-footer">
                                    <span className="card-item-date">
                                        {format(new Date(idea.created_at), 'MMM d, yyyy')}
                                    </span>
                                    <div className="card-item-actions">
                                        <button className="card-action-btn" onClick={() => openModal(idea)}>
                                            <Edit3 size={14} />
                                        </button>
                                        <button className="card-action-btn delete" onClick={() => deleteIdea(idea.id)}>
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Idea Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{editingId ? 'Edit Idea' : 'New Idea'}</h3>
                                <button className="card-action-btn" onClick={() => setShowModal(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label className="input-label">Title</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        placeholder="Give your idea a name"
                                        value={form.title}
                                        onChange={(e) => setForm({ ...form, title: e.target.value })}
                                        autoFocus
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Details</label>
                                    <textarea
                                        className="input-field"
                                        placeholder="Describe your idea..."
                                        value={form.content}
                                        onChange={(e) => setForm({ ...form, content: e.target.value })}
                                        rows={4}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Category</label>
                                    <select
                                        className="input-field"
                                        value={form.category}
                                        onChange={(e) => setForm({ ...form, category: e.target.value })}
                                    >
                                        {CATEGORIES.map((cat) => (
                                            <option key={cat} value={cat}>
                                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={saveIdea} disabled={!form.title.trim()}>
                                    <Save size={14} /> {editingId ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
