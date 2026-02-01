import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '@/types';
import { set } from 'zod/v4';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isDemo: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isDemo: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      state.error = null;
    },
    setIsDemo: (state, action: PayloadAction<boolean>) => {
      state.isDemo = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearAuth: (state) => {
      state.user = null;
      state.error = null;
      state.isLoading = false;
    },
  },
});

export const { setUser, setLoading, setError, clearAuth, setIsDemo } = authSlice.actions;
export default authSlice.reducer;
