import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { CompressPage, SearchProvider } from '@/pages/compress';
import './style.css';

const root = document.getElementById('root');
if (!root) throw new Error('index.html has no #root');

createRoot(root).render(
  <StrictMode>
    <SearchProvider>
      <CompressPage />
    </SearchProvider>
  </StrictMode>,
);
