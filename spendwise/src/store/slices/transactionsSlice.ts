import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { TransactionFilters } from '@/types';

interface TransactionsState {
  filters: TransactionFilters;
  pagination: {
    page: number;
    limit: number;
  };
}

const initialFilters: TransactionFilters = {
  search: '',
  category: null,
  type: null,
  accountId: null,
  startDate: null,
  endDate: null,
  minAmount: null,
  maxAmount: null,
};

const initialState: TransactionsState = {
  filters: initialFilters,
  pagination: {
    page: 1,
    limit: 20,
  },
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<Partial<TransactionFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
      state.pagination.page = 1;
    },
    clearFilters: (state) => {
      state.filters = initialFilters;
      state.pagination.page = 1;
    },
    setPage: (state, action: PayloadAction<number>) => {
      state.pagination.page = action.payload;
    },
    setLimit: (state, action: PayloadAction<number>) => {
      state.pagination.limit = action.payload;
      state.pagination.page = 1;
    },
  },
});

export const { setFilters, clearFilters, setPage, setLimit } = transactionsSlice.actions;
export default transactionsSlice.reducer;
