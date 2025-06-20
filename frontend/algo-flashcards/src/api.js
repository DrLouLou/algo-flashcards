const API = import.meta.env.VITE_API_BASE_URL

export default async function fetchWithAuth(url, options = {}) {
  let access = localStorage.getItem('accessToken');
  const refresh = localStorage.getItem('refreshToken');

  // If no access token, force logout (or redirect to login)
  if (!access) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return Promise.reject('No access token');
  }

  let res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${access}`,
    },
  });

  // If token expired or unauthorized, try refreshing
  if (res.status === 401 && refresh) {
    const refreshRes = await fetch(`${API}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!refreshRes.ok) {
      // refresh failed: force logout
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject('Session expired');
    }
    const { access: newAccess } = await refreshRes.json();
    if (!newAccess) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/login';
      return Promise.reject('Session expired');
    }
    localStorage.setItem('accessToken', newAccess);
    access = newAccess;
    // retry original request
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${access}`,
      },
    });
  }

  // If still unauthorized, force logout
  if (res.status === 401) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
    return Promise.reject('Session expired');
  }

  return res;
}

export function generateCard(inputText) {
  return fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/generate_card/`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: inputText }),
  });
}
