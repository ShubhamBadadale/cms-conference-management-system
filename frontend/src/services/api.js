import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const readErrorMessage = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const data = await response.json().catch(() => null);
    return data?.message || 'Request failed';
  }

  const text = await response.text().catch(() => '');
  return text || 'Request failed';
};

const fetchProtectedBlob = async (url) => {
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.blob();
};

// Auth
export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const getMe = () => API.get('/auth/me');

// Conferences
export const getConferences = () => API.get('/conferences');
export const getConferenceById = (id) => API.get(`/conferences/${id}`);
export const getAllConferencesAdmin = () => API.get('/conferences/admin/all');
export const createConference = (data) => API.post('/conferences', data);
export const publishConference = (id) => API.put(`/conferences/${id}/publish`);
export const updateConference = (id, data) => API.put(`/conferences/${id}`, data);

// Papers
export const submitPaper = (formData) => API.post('/papers/submit', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getMySubmissions = () => API.get('/papers/my-submissions');
export const resubmitPaper = (formData) => API.post('/papers/resubmit', formData, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getAllSubmissions = () => API.get('/papers/all');
export const getPaperById = (id) => API.get(`/papers/${id}`);
export const getPaperReviews = (paperId) => API.get(`/papers/${paperId}/reviews`);
export const getPaperVersions = (paperId) => API.get(`/papers/${paperId}/versions`);

// Reviews
export const getAssignedPapers = () => API.get('/reviews/assigned');
export const getReviewerWorkload = () => API.get('/reviews/workload');
export const submitReview = (data) => API.post('/reviews/submit', data);
export const getReviewsForPaper = (paperId) => API.get(`/reviews/paper/${paperId}`);
export const getReviewerExpertise = () => API.get('/reviews/expertise');
export const updateReviewerExpertise = (expertise) => API.put('/reviews/expertise', { expertise });

// Admin
export const getAllUsers = () => API.get('/admin/users');
export const updateUserRole = (userId, role) => API.patch(`/admin/users/${userId}/role`, { role });
export const updateUserActiveState = (userId, isActive) => API.patch(`/admin/users/${userId}/active`, { is_active: isActive });
export const getReviewers = () => API.get('/admin/reviewers');
export const assignReviewer = (data) => API.post('/admin/assign-reviewer', data);
export const getReviewerSuggestions = (paperId) => API.get(`/admin/papers/${paperId}/reviewer-suggestions`);
export const updatePaperActiveState = (paperId, isActive) => API.patch(`/admin/papers/${paperId}/active`, { is_active: isActive });
export const makeDecision = (data) => API.post('/admin/decision', data);
export const revokeDecision = (paperId) => API.post(`/admin/papers/${paperId}/revoke-decision`);
export const getAcceptedPapers = () => API.get('/admin/accepted-papers');
export const sendNotification = (data) => API.post('/admin/notify', data);
export const generateCertificate = (data) => API.post('/admin/generate-certificate', data);
export const getDashboardStats = () => API.get('/admin/stats');
export const getEmailQueueOverview = () => API.get('/admin/email-queue');
export const updateConferenceActiveState = (conferenceId, isActive) => API.patch(`/admin/conferences/${conferenceId}/active`, { is_active: isActive });
export const downloadConferenceProceedings = (conferenceId) => API.get(`/admin/conferences/${conferenceId}/proceedings/download`, { responseType: 'blob' });
export const getNoSqlAnalytics = () => API.get('/nosql/analytics');

// Coordinator
export const getPresentationSchedule = () => API.get('/coordinator/schedule');
export const scorePresentation = (data) => API.post('/coordinator/score', data);

// User
export const getMyNotifications = () => API.get('/user/notifications');
export const markNotificationsRead = () => API.put('/user/notifications/read');
export const getMyCertificates = () => API.get('/user/certificates');
export const getPaperDocumentBlob = (paperId, versionNumber) => fetchProtectedBlob(
  `/api/papers/${paperId}/download${versionNumber ? `?version=${versionNumber}` : ''}`
);
export const getCertificateDocumentBlob = (paperId) => fetchProtectedBlob(
  `/api/user/certificates/${paperId}/download`
);

export default API;
