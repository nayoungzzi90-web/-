import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import App from './App';
import './styles.css';

// 일반 배포는 번들된 폰트를 쓴다. 공유용 단일 페이지 빌드(VITE_ARTIFACT)는 폰트를 외부 링크로 받고 주소 대신 메모리 라우터를 쓴다.
if (!import.meta.env.VITE_ARTIFACT) void import('./fonts');
const Router = import.meta.env.VITE_ARTIFACT ? MemoryRouter : BrowserRouter;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Router>
      <App />
    </Router>
  </React.StrictMode>,
);
