import { CSPProvider } from '@base-ui/react/csp-provider';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CompressPage, SearchProvider } from '@/pages/compress';

import './style.css';

const root = document.querySelector('#root');
if (!root) throw new Error('index.html has no #root');

createRoot(root).render(
  <StrictMode>
    {/* Base UI under `style-src 'self'`: no `<style>` element, its two rules are in the stylesheet (ADR-0003 D2) */}
    <CSPProvider disableStyleElements>
      <SearchProvider>
        <CompressPage />
      </SearchProvider>
    </CSPProvider>
  </StrictMode>,
);
