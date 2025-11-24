import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/variables.css'
import App from './App.jsx'
import { BrowserRouter } from "react-router";
import { Provider } from 'react-redux';
import { store } from './store/store';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './queryClient';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </Provider>
    </QueryClientProvider>
  </StrictMode>,
)

