import { ClerkProvider } from '@clerk/react';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const isLocalhost = Boolean(
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
);

// Clerk Production keys (pk_live_*) cannot run on localhost; use pk_test_* locally
const rawKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || '';
const devKey = import.meta.env.VITE_CLERK_DEV_PUBLISHABLE_KEY || 'pk_test_bW92aW5nLWN1Yi01MjY2LmNsZXJrLmFjY291bnRzLmRldiQ';
const PUBLISHABLE_KEY = isLocalhost && rawKey.startsWith('pk_live_') ? devKey : (rawKey || devKey);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>,
);