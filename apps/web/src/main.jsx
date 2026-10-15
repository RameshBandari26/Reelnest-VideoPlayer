import './boot.js'; // first import on purpose: defines window.lumo
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '../../desktop/src/App.jsx';
import Welcome from './Welcome.jsx';
import '../../desktop/src/styles.css';
import './web.css';

createRoot(document.getElementById('root')).render(<App extra={(p) => <Welcome {...p} />} />);
