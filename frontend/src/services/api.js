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
export const submitPaper = (formData) => API.post('/papers/submit', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getMySubmissions = () => API.get('/papers/my-submissions');
export const resubmitPaper = (formData) => API.post('/papers/resubmit', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getAllSubmissions = () => API.get('/papers/all');
export const getPaperById = (id) => API.get(`/papers/${id}`);
export const getPaperReviews = (paperId) => API.get(`/papers/${paperId}/reviews`);

// Reviews
export const getAssignedPapers = () => API.get('/reviews/assigned');
export const submitReview = (data) => API.post('/reviews/submit', data);
export const getReviewsForPaper = (paperId) => API.get(`/reviews/paper/${paperId}`);

// Admin
export const getAllUsers = () => API.get('/admin/users');
export const getReviewers = () => API.get('/admin/reviewers');
export const assignReviewer = (data) => API.post('/admin/assign-reviewer', data);
export const makeDecision = (data) => API.post('/admin/decision', data);
export const getAcceptedPapers = () => API.get('/admin/accepted-papers');
export const sendNotification = (data) => API.post('/admin/notify', data);
export const generateCertificate = (data) => API.post('/admin/generate-certificate', data);
export const getDashboardStats = () => API.get('/admin/stats');

// Coordinator
export const getPresentationSchedule = () => API.get('/coordinator/schedule');
export const scorePresentation = (data) => API.post('/coordinator/score', data);

// User
export const getMyNotifications = () => API.get('/user/notifications');
export const markNotificationsRead = () => API.put('/user/notifications/read');
export const getMyCertificates = () => API.get('/user/certificates');

export default API;
