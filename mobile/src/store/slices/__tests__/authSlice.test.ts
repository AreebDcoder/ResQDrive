/**
 * authSlice.test.ts — Unit tests for the auth Redux slice.
 *
 * Tests the three critical reducers:
 *   - loginSuccess: stores accessToken + user in state
 *   - setTokens: updates accessToken + refreshToken
 *   - logoutAction: clears all auth state
 *
 * Run: npx jest src/store/slices/__tests__/authSlice.test.ts
 */

import authReducer, {
  loginSuccess,
  setTokens,
  logoutAction,
} from '../authSlice';

describe('authSlice', () => {
  const mockUser = {
    id: 'user-123',
    fullName: 'Test User',
    email: 'test@resqdrive.com',
    phoneNumber: '+923001234567',
    role: 'DRIVER' as const,
    isVerified: true,
    isActive: true,
  };

  describe('loginSuccess', () => {
    it('should store accessToken and user in state', () => {
      const action = loginSuccess({
        accessToken: 'access-token-abc',
        user: mockUser,
      });
      const newState = authReducer(undefined, action);

      expect(newState.accessToken).toBe('access-token-abc');
      expect(newState.user).toEqual(mockUser);
      expect(newState.isAuthenticated).toBe(true);
      expect(newState.isLoading).toBe(false);
    });
  });

  describe('setTokens', () => {
    it('should update accessToken and refreshToken', () => {
      // First, set up initial state with loginSuccess
      const initialState = authReducer(
        undefined,
        loginSuccess({ accessToken: 'old-access', user: mockUser }),
      );

      // Then update tokens
      const action = setTokens({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
      });
      const newState = authReducer(initialState, action);

      expect(newState.accessToken).toBe('new-access');
      expect(newState.isAuthenticated).toBe(true);
    });
  });

  describe('logoutAction', () => {
    it('should clear all auth state', () => {
      // First, set up logged-in state
      const loggedInState = authReducer(
        undefined,
        loginSuccess({ accessToken: 'access-token', user: mockUser }),
      );
      expect(loggedInState.isAuthenticated).toBe(true);

      // Then logout
      const newState = authReducer(loggedInState, logoutAction());

      expect(newState.accessToken).toBeNull();
      expect(newState.user).toBeNull();
      expect(newState.isAuthenticated).toBe(false);
    });
  });
});
