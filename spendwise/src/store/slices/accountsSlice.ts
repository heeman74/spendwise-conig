import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AccountsState {
  selectedId: string | null;
}

const initialState: AccountsState = {
  selectedId: null,
};

const accountsSlice = createSlice({
  name: 'accounts',
  initialState,
  reducers: {
    selectAccount: (state, action: PayloadAction<string | null>) => {
      state.selectedId = action.payload;
    },
    clearAccountSelection: (state) => {
      state.selectedId = null;
    },
  },
});

export const { selectAccount, clearAccountSelection } = accountsSlice.actions;
export default accountsSlice.reducer;
