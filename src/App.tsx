import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import CosmosAngre from './modules/cosmos-angre'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/cosmos-angre/*" element={<CosmosAngre />} />
          <Route path="*" element={<Navigate to="/cosmos-angre" replace />} />
        </Routes>
        <Toaster
          position="bottom-right"
          toastOptions={{
            className: 'bg-gray-800 text-white text-sm',
            duration: 3000,
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
