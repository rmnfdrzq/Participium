import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  position: null, // [lat, lng]
  address: null,
  coordinates: null, // { lat, lng }
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: { //update location slice
    setLocation: (state, action) => {
      state.position = action.payload.position;
      state.address = action.payload.address;
      state.coordinates = action.payload.coordinates;
    },
    clearLocation: (state) => { //clear location slice
      state.position = null;
      state.address = null;
      state.coordinates = null;
    },
  },
});

export const { setLocation, clearLocation } = locationSlice.actions;
export default locationSlice.reducer;

