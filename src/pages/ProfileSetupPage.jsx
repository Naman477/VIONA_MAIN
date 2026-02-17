import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles, ArrowRight } from 'lucide-react';

const TONE_OPTIONS = [
    { value: 'supportive', emoji: '🤗', label: 'Supportive' },
    { value: 'professional', emoji: '💼', label: 'Professional' },
    { value: 'casual', emoji: '😎', label: 'Casual' },
    { value: 'motivational', emoji: '🔥', label: 'Motivational' },
];

export default function ProfileSetupPage() {
    const [name, setName] = useState('');
    const [goals, setGoals] = useState('');
    const [tone, setTone] = useState('supportive');
    const [loading, setLoading] = useState(false);
    const { updateProfile, user } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);

        await updateProfile({
            full_name: name,
            goals,
            tone_preference: tone,
        });

        navigate('/');
    }

    return (
        <div className="profile-setup">
            <div className="profile-setup-card">
                <div className="profile-setup-header">
                    <Sparkles size={40} style={{ color: 'var(--accent-primary)', marginBottom: 'var(--space-md)' }} />
                    <h1>Welcome to VIONA</h1>
                    <p>Let's personalize your AI assistant experience</p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label className="input-label">What should I call you?</label>
                        <input
                            type="text"
                            className="input-field"
                            placeholder="Your name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">What are your current goals?</label>
                        <textarea
                            className="input-field"
                            placeholder="e.g., Launch my startup, learn new skills, stay organized..."
                            value={goals}
                            onChange={(e) => setGoals(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-label">How should I talk to you?</label>
                        <div className="tone-options">
                            {TONE_OPTIONS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={`tone-option ${tone === option.value ? 'selected' : ''}`}
                                    onClick={() => setTone(option.value)}
                                >
                                    <div className="tone-option-emoji">{option.emoji}</div>
                                    <div className="tone-option-label">{option.label}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-block"
                        disabled={loading}
                        style={{ marginTop: 'var(--space-md)' }}
                    >
                        {loading ? (
                            <span className="loading-spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                        ) : (
                            <>
                                Let's Go
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
