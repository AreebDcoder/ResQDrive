import type { BaseQueryFn } from '@reduxjs/toolkit/query';
import type { AxiosRequestConfig } from 'axios';
import api from '../../api/axios';

/**
 * axiosBaseQuery — wraps the existing axios instance (with token refresh
 * interceptor) for use with RTK Query's createApi.
 *
 * This preserves the 401 refresh-token retry logic that's baked into the
 * axios interceptors, while gaining RTK Query's automatic caching,
 * invalidation, and background refetch.
 *
 * Usage in createApi:
 *   baseQuery: axiosBaseQuery(),
 *   endpoints: (builder) => ({
 *     getVehicles: builder.query({
 *       query: () => ({ url: '/vehicles', method: 'GET' }),
 *     }),
 *   })
 */
export interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig['method'];
  body?: any;
  params?: any;
  headers?: any;
}

export const axiosBaseQuery = (): BaseQueryFn<AxiosBaseQueryArgs, unknown, unknown> =>
  async ({ url, method = 'GET', body, params, headers }) => {
    try {
      const result = await api({
        url,
        method,
        data: body,
        params,
        headers: { ...headers },
      });
      return { data: result.data };
    } catch (axiosError: any) {
      return {
        error: {
          status: axiosError?.response?.status || 500,
          data: axiosError?.response?.data || axiosError?.message || 'Unknown error',
        },
      };
    }
  };
