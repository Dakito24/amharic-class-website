import { writable, get } from 'svelte/store';
import { activeProfileId, profiles } from './profile.js';

const BASE = '/api';

function createAuthStore() {
    const stored = typeof window !== 'undefined'
        ? localStorage.getItem('auth_token')
        : null;

    const store = writable(stored || null);

    store.subscribe(value => {
        if (typeof window !== 'undefined') {
            if (value) {
                localStorage.setItem('auth_token', value);
            } else {
                localStorage.removeItem('auth_token');
            }
        }
    });

    return store;
}

export const authToken = createAuthStore();
export const currentUser = writable(null);

function setAuthState(token, user) {
    authToken.set(token);
    currentUser.set(user);
    activeProfileId.set(user.id);
    profiles.set([user]);
}

export async function login(username, password) {
    const res = await fetch(`${BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');

    setAuthState(data.token, data.user);
    return data.user;
}

export async function signup(username, password, confirmPassword, name, avatarColor) {
    const res = await fetch(`${BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username,
            password,
            confirmPassword,
            name,
            avatar_color: avatarColor
        })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Signup failed');

    setAuthState(data.token, data.user);
    return data.user;
}

export async function initAuth() {
    const token = get(authToken);
    if (!token) return null;

    try {
        const res = await fetch(`${BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            logout();
            return null;
        }

        const user = await res.json();
        currentUser.set(user);
        activeProfileId.set(user.id);
        profiles.set([user]);
        return user;
    } catch {
        logout();
        return null;
    }
}

export async function changePassword(currentPassword, newPassword, confirmNewPassword) {
    const token = get(authToken);
    const res = await fetch(`${BASE}/auth/change-password`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword, confirmNewPassword })
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to change password');
    return data;
}

export function logout() {
    authToken.set(null);
    currentUser.set(null);
    if (typeof window !== 'undefined') {
        localStorage.removeItem('activeProfileId');
    }
    activeProfileId.set(null);
    profiles.set([]);
}
