/**
 * api.js — Centralised API wrapper
 * All HTTP calls go through this module.
 * Base URL auto-detects dev vs prod.
 */

const API_BASE = window.location.hostname === 'localhost'
  ? 'http://localhost:5000/api'
  : '/api';

const API = {
  /** Return auth headers */
  _headers(isFormData = false) {
    const token = localStorage.getItem('token');
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!isFormData) headers['Content-Type'] = 'application/json';
    return headers;
  },

  /** Handle response: parse JSON, throw on non-2xx */
  async _handle(res) {
    const data = await res.json().catch(() => ({ success: false, message: 'Invalid server response' }));
    if (res.status === 401) {
      // Token expired — redirect to login
      localStorage.clear();
      window.location.href = 'login.html';
    }
    return data;
  },

  async get(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: this._headers(),
    });
    return this._handle(res);
  },

  async post(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handle(res);
  },

  async put(path, body) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(body),
    });
    return this._handle(res);
  },

  async putFormData(path, formData) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: this._headers(true),
      body: formData,
    });
    return this._handle(res);
  },

  async delete(path) {
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'DELETE',
      headers: this._headers(),
    });
    return this._handle(res);
  },
};

window.API = API;
window.API_BASE = API_BASE;
