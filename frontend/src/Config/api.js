export const API_URL = 'https://172.24.0.67:3000';
//export const API_URL = 'http://10.247.219.111:3000';
export default API_URL;
export async function getPosts() {
  const res = await fetch(`${process.env.REACT_APP_API_URL}/api/posts`);
  return await res.json();
}
