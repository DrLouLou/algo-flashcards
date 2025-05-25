const API = import.meta.env.VITE_API_BASE_URL

export default async function fetchWithAuth(url, options = {}) {
  let access = localStorage.getItem('accessToken')
  const refresh = localStorage.getItem('refreshToken')

  let res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      Authorization: `Bearer ${access}`,
    },
  })

  // If token expired, try refreshing
  if (res.status === 401) {
    const refreshRes = await fetch(`${API}/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!refreshRes.ok) {
      // refresh failed: force logout
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      window.location.href = '/login'
      return Promise.reject('Session expired')
    }
    const { access: newAccess } = await refreshRes.json()
    localStorage.setItem('accessToken', newAccess)
    access = newAccess

    // retry original request
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
        Authorization: `Bearer ${access}`,
      },
    })
  }

  return res
}

export function generateCard(inputText) {
  return fetchWithAuth(`${import.meta.env.VITE_API_BASE_URL}/generate_card/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ input_text: inputText }),
  }).then(res => {
    if (!res.ok) throw new Error("Generation failed");
    return res.json();
  });
}
