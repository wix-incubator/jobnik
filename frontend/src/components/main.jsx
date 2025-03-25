import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import Index from '../pages/index'
import './index.css'
import { Toaster } from "@/components/ui/toaster"

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <Index />
      <Toaster />
    </Router>
  </React.StrictMode>,
)