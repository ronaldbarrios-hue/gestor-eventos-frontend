import axios from 'axios';
import { supabase } from '../lib/supabase.js';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

/* Adjunta el JWT de Supabase Auth en cada request. */
client.interceptors.request.use(async (config) => {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.error || err.response?.data?.message || err.message || 'Error desconocido';
    if (err.response?.status === 401) {
      supabase.auth.signOut().finally(() => {
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      });
    }
    return Promise.reject(new Error(msg));
  }
);

export default client;
