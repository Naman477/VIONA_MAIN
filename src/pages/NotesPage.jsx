import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { StickyNote, Plus, Trash2, X, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';

export default function NotesPage() {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newNote, setNewNote] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user) loadNotes();
    }, [user]);

    async function loadNotes() {
        const { data } = await supabase
            .from('smart_notes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        setNotes(data || []);
        setLoading(false);
    }

    async function addNote() {
        if (!newNote.trim()) return;

        const { data, error } = await supabase
            .from('smart_notes')
            .insert({ user_id: user.id, content: newNote.trim(), source: 'manual' })
            .select()
            .single();

        if (!error && data) {
            setNotes((prev) => [data, ...prev]);
            setNewNote('');
            setShowModal(false);
        }
    }

    async function deleteNote(id) {
        await supabase.from('smart_notes').delete().eq('id', id);
        setNotes((prev) => prev.filter((n) => n.id !== id));
    }

    return (
        <div className="app-layout">
            <div className="page-content">
                <div className="page-header">
                    <div>
                        <h1>Smart Notes 📝</h1>
                        <p className="page-header-subtitle">{notes.length} notes saved</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
                        <Plus size={16} /> Add
                    </button>
                </div>

                {notes.length === 0 && !loading ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">
                            <StickyNote size={28} />
                        </div>
                        <h3>No notes yet</h3>
                        <p>Say "remember this" in chat or tap Add to save a note</p>
                    </div>
                ) : (
                    <div className="card-grid">
                        {notes.map((note) => (
                            <div key={note.id} className="glass-card card-item">
                                <div className="card-item-body">{note.content}</div>
                                <div className="card-item-footer">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span className="card-item-date">
                                            {format(new Date(note.created_at), 'MMM d, yyyy')}
                                        </span>
                                        {note.source === 'chat' && (
                                            <span className="category-badge" style={{ fontSize: '10px' }}>
                                                <MessageSquare size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                                                from chat
                                            </span>
                                        )}
                                    </div>
                                    <button className="card-action-btn delete" onClick={() => deleteNote(note.id)}>
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Add Note Modal */}
                {showModal && (
                    <div className="modal-overlay" onClick={() => setShowModal(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>New Note</h3>
                                <button className="card-action-btn" onClick={() => setShowModal(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <textarea
                                    className="input-field"
                                    placeholder="What do you want to remember?"
                                    value={newNote}
                                    onChange={(e) => setNewNote(e.target.value)}
                                    rows={4}
                                    autoFocus
                                />
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={addNote} disabled={!newNote.trim()}>
                                    Save Note
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
