import { NavLink, useLocation } from 'react-router-dom';
import {
    MessageCircle,
    StickyNote,
    Lightbulb,
    Bell,
    Settings,
} from 'lucide-react';

const NAV_ITEMS = [
    { path: '/', icon: MessageCircle, label: 'Chat' },
    { path: '/notes', icon: StickyNote, label: 'Notes' },
    { path: '/ideas', icon: Lightbulb, label: 'Ideas' },
    { path: '/reminders', icon: Bell, label: 'Reminders' },
    { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function BottomNav() {
    const location = useLocation();

    return (
        <nav className="bottom-nav">
            {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
                <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                        `nav-item ${isActive ? 'active' : ''}`
                    }
                >
                    <Icon size={22} className="nav-icon" />
                    <span>{label}</span>
                </NavLink>
            ))}
        </nav>
    );
}
