import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import VolumesNav from './VolumesNav'

const Vol2Module = React.lazy(() => import('./vol2-securitaire'))
const Vol3Module = React.lazy(() => import('./vol3-parcours'))

export default function CosmosAngre() {
  return (
    <React.Suspense fallback={
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-gray-600 border-t-purple-500 rounded-full animate-spin" />
          Chargement du module...
        </div>
      </div>
    }>
      <Routes>
        <Route index element={<VolumesNav />} />
        <Route path="vol2/*" element={<Vol2Module />} />
        <Route path="vol3/*" element={<Vol3Module />} />
        <Route path="*" element={<Navigate to="/cosmos-angre" replace />} />
      </Routes>
    </React.Suspense>
  )
}
