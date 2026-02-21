import { getAccessToken } from "./api";

export const getAuthHeader = () => {
  const token = getAccessToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};
