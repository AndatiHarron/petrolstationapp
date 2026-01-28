import axios, { AxiosRequestConfig } from 'axios';
import * as SecureStore from 'expo-secure-store';

export const BASE_URL = process.env.EXPO_PUBLIC_BASE_URL;

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Except': ''
  },
});

// 1. Interceptor: Auto-attach Token
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 👇 ADD THIS BLOCK TO SEE THE URL
  console.log('------------------------------------------------');
  console.log('🚀 API Request:', config.method?.toUpperCase(), config.baseURL, config.url);
  console.log('------------------------------------------------');

  return config;
});

// 2. Custom Mutator for Orval (Required for the next step)
// This tells the generator how to actually execute the requests
export const customInstance = <T>(
  url: string,
  options?: AxiosRequestConfig,
): Promise<T> => {
  const source = axios.CancelToken.source();
  const data = options?.data ?? options?.body;
  console.log("data", data);
  console.log("options", options);
  const promise = api({
    url,
    ...options,
    data,
    cancelToken: source.token,
  }).then(({ data }) => data);

  // @ts-ignore
  promise.cancel = () => {
    source.cancel('Query was cancelled');
  };

  return promise;
};