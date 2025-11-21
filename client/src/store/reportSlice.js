import { createSlice } from "@reduxjs/toolkit";

const reportSlice = createSlice({
  name: "report",
  initialState: {
    selected: null,
  },
  reducers: {   
    setSelectedReport: (state, action) => {
      state.selected = action.payload;
    },
    clearSelectedReport: (state) => {
      state.selected = null;
    },
  },
}); 

export const { setSelectedReport, clearSelectedReport } = reportSlice.actions;
export default reportSlice.reducer;