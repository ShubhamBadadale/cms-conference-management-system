import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navConfig = {
  author: [
    { to: '/author',          label: '🏠 Dashboard',        end: true },
    { to: '/conferences',     label: '🎓 Conferences' },
    { to: '/submit',          label: '📄 Submit Paper' },
    { to: '/my-submissions',  label: '📋 My Submissions' },
    { to: '/certificates',    label: '🏆 Certificates' },
    // Divider label
    { label: '─ Advanced', type: 'section' },
    { to: '/conflicts/mine',  label: '⚠ My COI Declarations' },
  ],
  reviewer: [
    { to: '/reviewer',        label: '🏠 Dashboard',        end: true },
    { to: '/assigned-papers', label: '📑 Assigned Papers' },
    // Advanced Features
    { label: '─ Advanced', type: 'section' },
    { to: '/bidding',         label: '🏷 Bid on Papers' },
    { to: '/conflicts/mine',  label: '⚠ Conflict of Interest' },
  ],
  admin: [
    { to: '/admin',              label: '🏠 Dashboard',      end: true },
    { to: '/admin/conferences',  label: '🎓 Conferences' },
    { to: '/admin/submissions',  label: '📋 All Submissions' },
    { to: '/admin/users',        label: '👥 Users' },
    { to: '/admin/accepted',     label: '✅ Accepted Papers' },
    { to: '/admin/notify',       label: '🔔 Notifications' },
    // Advanced Features
    { label: '─ Advanced', type: 'section' },
    { to: '/admin/analytics',    label: '📊 Analytics' },
    { to: '/admin/conflicts',    label: '⚠ COI Management' },
  ],
  coordinator: [
    { to: '/coordinator',          label: '🏠 Dashboard',         end: true },
    { to: '/coordinator/schedule', label: '📅 Presentation Score' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = navConfig[user?.role] || [];

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <h2>📚 ConferMS</h2>
        <span>Management System</span>
      </div>
      <nav className="sidebar-nav">
        <div className="section-label">Navigation</div>
        {links.map((link, i) =>
          link.type === 'section'
            ? <div className="section-label" key={i} style={{ marginTop: 8, opacity: 0.6 }}>{link.label}</div>
            : (
              <NavLink key={link.to} to={link.to} end={link.end}
                className={({ isActive }) => isActive ? 'active' : ''}>
                {link.label}
              </NavLink>
            )
        )}
        <div className="section-label" style={{ marginTop: 12 }}>Account</div>
        <NavLink to="/notifications" className={({ isActive }) => isActive ? 'active' : ''}>🔔 Notifications</NavLink>
        <button onClick={handleLogout}>🚪 Logout</button>
      </nav>
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <strong>{user?.name}</strong>
          <span className={`badge badge-${user?.role}`} style={{ marginTop: 4 }}>{user?.role}</span>
        </div>
      </div>
    </aside>
  );
}
