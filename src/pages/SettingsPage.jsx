import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    User,
    Target,
    Palette,
    Phone,
    Trash2,
    LogOut,
    Shield,
    ChevronRight,
    AlertTriangle,
    Save,
    X,
} from 'lucide-react';

const TONE_OPTIONS = [
    { value: 'supportive', emoji: '🤗', label: 'Supportive' },
    { value: 'professional', emoji: '💼', label: 'Professional' },
    { value: 'casual', emoji: '😎', label: 'Casual' },
    { value: 'motivational', emoji: '🔥', label: 'Motivational' },
];

export default function SettingsPage() {
    const { user, profile, updateProfile, signOut, deleteAllUserData, deleteAccount } = useAuth();
    const [showEditProfile, setShowEditProfile] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(null); // 'data' | 'account' | null
    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        phone_number: profile?.phone_number || '',
        goals: profile?.goals || '',
        tone_preference: profile?.tone_preference || 'supportive',
    });
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);

    function showToast(message, type = 'success') {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }

    async function handleSaveProfile() {
        setSaving(true);
        const { error } = await updateProfile(form);
        setSaving(false);

        if (!error) {
            showToast('✅ Profile updated!');
            setShowEditProfile(false);
        } else {
            showToast('Failed to update profile', 'error');
        }
    }

    async function handleDeleteData() {
        await deleteAllUserData();
        setShowDeleteConfirm(null);
        showToast('🗑️ All data deleted');
    }

    async function handleDeleteAccount() {
        await deleteAccount();
    }

    return (
        <div className="app-layout">
            <div className="page-content">
                {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}

                <div className="page-header">
                    <h1>Settings ⚙️</h1>
                </div>

                {/* Profile Section */}
                <div className="settings-section">
                    <div className="settings-section-title">Profile</div>

                    <div className="settings-item" onClick={() => setShowEditProfile(true)}>
                        <div className="settings-item-info">
                            <div className="settings-item-icon"><User size={20} /></div>
                            <div className="settings-item-text">
                                <h4>{profile?.full_name || 'Set your name'}</h4>
                                <p>{user?.email}</p>
                            </div>
                        </div>
                        <ChevronRight size={18} color="var(--text-tertiary)" />
                    </div>

                    <div className="settings-item" onClick={() => setShowEditProfile(true)}>
                        <div className="settings-item-info">
                            <div className="settings-item-icon"><Target size={20} /></div>
                            <div className="settings-item-text">
                                <h4>Goals</h4>
                                <p>{profile?.goals || 'Not set'}</p>
                            </div>
                        </div>
                        <ChevronRight size={18} color="var(--text-tertiary)" />
                    </div>

                    <div className="settings-item" onClick={() => setShowEditProfile(true)}>
                        <div className="settings-item-info">
                            <div className="settings-item-icon"><Palette size={20} /></div>
                            <div className="settings-item-text">
                                <h4>Tone Preference</h4>
                                <p>{TONE_OPTIONS.find(t => t.value === profile?.tone_preference)?.label || 'Supportive'}</p>
                            </div>
                        </div>
                        <ChevronRight size={18} color="var(--text-tertiary)" />
                    </div>

                    {profile?.phone_number && (
                        <div className="settings-item">
                            <div className="settings-item-info">
                                <div className="settings-item-icon"><Phone size={20} /></div>
                                <div className="settings-item-text">
                                    <h4>Phone</h4>
                                    <p>{profile.phone_number}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Privacy Section */}
                <div className="settings-section">
                    <div className="settings-section-title">Privacy & Data</div>

                    <div className="settings-item">
                        <div className="settings-item-info">
                            <div className="settings-item-icon"><Shield size={20} /></div>
                            <div className="settings-item-text">
                                <h4>Data Privacy</h4>
                                <p>Your data is encrypted and stored securely</p>
                            </div>
                        </div>
                    </div>

                    <div
                        className="settings-item"
                        onClick={() => setShowDeleteConfirm('data')}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="settings-item-info">
                            <div className="settings-item-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                                <Trash2 size={20} />
                            </div>
                            <div className="settings-item-text">
                                <h4>Delete All Data</h4>
                                <p>Remove all chats, notes, ideas & reminders</p>
                            </div>
                        </div>
                        <ChevronRight size={18} color="var(--text-tertiary)" />
                    </div>

                    <div
                        className="settings-item"
                        onClick={() => setShowDeleteConfirm('account')}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className="settings-item-info">
                            <div className="settings-item-icon" style={{ background: 'var(--error-bg)', color: 'var(--error)' }}>
                                <AlertTriangle size={20} />
                            </div>
                            <div className="settings-item-text">
                                <h4 style={{ color: 'var(--error)' }}>Delete Account</h4>
                                <p>Permanently delete your account and all data</p>
                            </div>
                        </div>
                        <ChevronRight size={18} color="var(--text-tertiary)" />
                    </div>
                </div>

                {/* Logout */}
                <div className="settings-section">
                    <button
                        className="btn btn-secondary btn-block"
                        onClick={signOut}
                        style={{ justifyContent: 'center' }}
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>

                <div style={{ textAlign: 'center', padding: 'var(--space-lg)', color: 'var(--text-tertiary)', fontSize: 'var(--font-xs)' }}>
                    VIONA v1.0 MVP · Made in India 🇮🇳
                </div>

                {/* Edit Profile Modal */}
                {showEditProfile && (
                    <div className="modal-overlay" onClick={() => setShowEditProfile(false)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Edit Profile</h3>
                                <button className="card-action-btn" onClick={() => setShowEditProfile(false)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label className="input-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="input-field"
                                        value={form.full_name}
                                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Phone Number</label>
                                    <input
                                        type="tel"
                                        className="input-field"
                                        placeholder="+91 98765 43210"
                                        value={form.phone_number}
                                        onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Goals</label>
                                    <textarea
                                        className="input-field"
                                        value={form.goals}
                                        onChange={(e) => setForm({ ...form, goals: e.target.value })}
                                        rows={3}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Tone Preference</label>
                                    <div className="tone-options">
                                        {TONE_OPTIONS.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                className={`tone-option ${form.tone_preference === option.value ? 'selected' : ''}`}
                                                onClick={() => setForm({ ...form, tone_preference: option.value })}
                                            >
                                                <div className="tone-option-emoji">{option.emoji}</div>
                                                <div className="tone-option-label">{option.label}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowEditProfile(false)}>Cancel</button>
                                <button className="btn btn-primary btn-sm" onClick={handleSaveProfile} disabled={saving}>
                                    <Save size={14} /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Delete Confirmation Modal */}
                {showDeleteConfirm && (
                    <div className="modal-overlay" onClick={() => setShowDeleteConfirm(null)}>
                        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3 style={{ color: 'var(--error)' }}>
                                    {showDeleteConfirm === 'account' ? '⚠️ Delete Account' : '⚠️ Delete All Data'}
                                </h3>
                                <button className="card-action-btn" onClick={() => setShowDeleteConfirm(null)}>
                                    <X size={16} />
                                </button>
                            </div>
                            <div className="modal-body">
                                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                                    {showDeleteConfirm === 'account'
                                        ? 'This will permanently delete your account and all associated data. This action cannot be undone.'
                                        : 'This will permanently delete all your chats, notes, ideas, and reminders. Your account will remain active.'}
                                </p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteConfirm(null)}>
                                    Cancel
                                </button>
                                <button
                                    className="btn btn-danger btn-sm"
                                    onClick={showDeleteConfirm === 'account' ? handleDeleteAccount : handleDeleteData}
                                >
                                    <Trash2 size={14} />
                                    {showDeleteConfirm === 'account' ? 'Delete Account' : 'Delete All Data'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
