export const API_URL = 'https://172.24.0.67:3000';
//export const API_URL = 'http://10.247.219.111:3000';
export default API_URL;
export async function login(email, password) {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  return data;
}
