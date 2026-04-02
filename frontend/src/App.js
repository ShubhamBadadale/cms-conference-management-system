import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Core pages
import Login from './pages/Login';
import Register from './pages/Register';
import AuthorDashboard from './pages/AuthorDashboard';
import ReviewerDashboard from './pages/ReviewerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminSubmissions from './pages/AdminSubmissions';
import AdminConferences from './pages/AdminConferences';
import AdminUsers from './pages/AdminUsers';
import { AcceptedPapers, AdminNotify } from './pages/AdminMisc';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import ConferenceList from './pages/ConferenceList';
import ConferenceDetail from './pages/ConferenceDetail';
import SubmitPaper from './pages/SubmitPaper';
import MySubmissions from './pages/MySubmissions';
import { Notifications, Certificates } from './pages/NotificationsAndCerts';

// Advanced Feature pages
import ReviewerBidding from './pages/ReviewerBidding';
import { ReviewerConflicts, AdminConflicts } from './pages/ConflictManagement';
import PaperVersionHistory from './pages/PaperVersionHistory';
import ReviewDiscussion from './pages/ReviewDiscussion';
import AdminAnalytics from './pages/AdminAnalytics';

import './index.css';

function RoleHome() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  const routes = { author: '/author', reviewer: '/reviewer', admin: '/admin', coordinator: '/coordinator' };
  return <Navigate to={routes[user.role] || '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login"    element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/"         element={<RoleHome />} />
          <Route path="/unauthorized" element={<div style={{ padding: 40, textAlign: 'center' }}><h2>403 — Access Denied</h2><a href="/login">Go to Login</a></div>} />

          {/* Author */}
          <Route path="/author"          element={<ProtectedRoute roles={['author']}><AuthorDashboard /></ProtectedRoute>} />
          <Route path="/conferences"     element={<ProtectedRoute><ConferenceList /></ProtectedRoute>} />
          <Route path="/conferences/:id" element={<ProtectedRoute><ConferenceDetail /></ProtectedRoute>} />
          <Route path="/submit"          element={<ProtectedRoute roles={['author']}><SubmitPaper /></ProtectedRoute>} />
          <Route path="/my-submissions"  element={<ProtectedRoute roles={['author']}><MySubmissions /></ProtectedRoute>} />
          <Route path="/certificates"    element={<ProtectedRoute roles={['author']}><Certificates /></ProtectedRoute>} />

          {/* Author — Advanced Feature 4 */}
          <Route path="/paper/:paper_id/versions" element={<ProtectedRoute roles={['author', 'admin', 'reviewer']}><PaperVersionHistory /></ProtectedRoute>} />

          {/* Reviewer */}
          <Route path="/reviewer"        element={<ProtectedRoute roles={['reviewer']}><ReviewerDashboard /></ProtectedRoute>} />
          <Route path="/assigned-papers" element={<ProtectedRoute roles={['reviewer']}><ReviewerDashboard /></ProtectedRoute>} />

          {/* Reviewer — Advanced Features 2, 1, 5 */}
          <Route path="/bidding"         element={<ProtectedRoute roles={['reviewer']}><ReviewerBidding /></ProtectedRoute>} />
          <Route path="/conflicts/mine"  element={<ProtectedRoute roles={['reviewer', 'author']}><ReviewerConflicts /></ProtectedRoute>} />
          <Route path="/discussion/:paper_id" element={<ProtectedRoute roles={['reviewer', 'admin']}><ReviewDiscussion /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="/admin"              element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/submissions"  element={<ProtectedRoute roles={['admin']}><AdminSubmissions /></ProtectedRoute>} />
          <Route path="/admin/conferences"  element={<ProtectedRoute roles={['admin']}><AdminConferences /></ProtectedRoute>} />
          <Route path="/admin/users"        element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/accepted"     element={<ProtectedRoute roles={['admin']}><AcceptedPapers /></ProtectedRoute>} />
          <Route path="/admin/notify"       element={<ProtectedRoute roles={['admin']}><AdminNotify /></ProtectedRoute>} />

          {/* Admin — Advanced Features 8, 7, 6, 1 */}
          <Route path="/admin/analytics"   element={<ProtectedRoute roles={['admin']}><AdminAnalytics /></ProtectedRoute>} />
          <Route path="/admin/conflicts"   element={<ProtectedRoute roles={['admin']}><AdminConflicts /></ProtectedRoute>} />

          {/* Coordinator */}
          <Route path="/coordinator"          element={<ProtectedRoute roles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />
          <Route path="/coordinator/schedule" element={<ProtectedRoute roles={['coordinator']}><CoordinatorDashboard /></ProtectedRoute>} />

          {/* Shared */}
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
