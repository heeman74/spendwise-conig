import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type Period = 'WEEK' | 'MONTH' | 'YEAR';

interface AnalyticsState {
  period: Period;
}

const initialState: AnalyticsState = {
  period: 'MONTH',
};

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState,
  reducers: {
    setPeriod: (state, action: PayloadAction<Period>) => {
      state.period = action.payload;
    },
  },
});

export const { setPeriod } = analyticsSlice.actions;
export default analyticsSlice.reducer;
