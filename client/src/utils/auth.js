// read / write token + decode user
import { jwtDecode } from 'jwt-decode';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token) {
  localStorage.setItem('token', token);
}

export function clearToken() {
  localStorage.removeItem('token');
}

export function getUser() {
  const token = getToken();
  if (!token) return null;
  try {
    const { sub:id, role, exp } = jwtDecode(token);
    if (Date.now()/1000 > exp) {
      clearToken();
      return null;
    }
    return { id, role, token };
  } catch {
    clearToken();
    return null;
  }
}
