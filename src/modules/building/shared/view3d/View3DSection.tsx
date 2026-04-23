import { lazy, Suspense } from 'react'
import { useView3D } from './hooks/useView3D'
import View3DToolbar from './View3DToolbar'
import View3DSidebar from './View3DSidebar'
import type { View3DData } from './types/view3dTypes'

const IsometricRenderer   = lazy(() => import('./modes/IsometricRenderer'))
const PerspectiveRenderer = lazy(() => import('./modes/PerspectiveRenderer'))
const RealisticRenderer   = lazy(() => import('./modes/RealisticRenderer'))
const PhotoRenderer       = lazy(() => import('./modes/PhotoRenderer'))

interface Props {
  data: View3DData
}

export default function View3DSection({ data }: Props) {
  const {
    config, setMode, setContext, toggleLayer,
    setZoneHeight, setFloorVisible, setFloorOpacity,
    setIsolatedFloor, setExplodeLevel,
    setLighting, setViewAngle,
  } = useView3D(data)

  const rendererProps = { data, config }

  return (
    <div className="flex h-full bg-[#080c14] overflow-hidden">
      <View3DSidebar
        config={config}
        data={data}
        onToggleLayer={toggleLayer}
        onSetFloorVisible={setFloorVisible}
        onSetFloorOpacity={setFloorOpacity}
        onSetZoneHeight={setZoneHeight}
        onSetLighting={setLighting}
        onSetViewAngle={setViewAngle}
        onSetContext={setContext}
        onIsolateFloor={setIsolatedFloor}
        onSetExplodeLevel={setExplodeLevel}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <View3DToolbar
          config={config}
          data={data}
          onSetMode={setMode}
          onSetContext={setContext}
        />

        <div className="flex-1 relative overflow-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-full text-white/30 text-sm">
              Chargement du moteur 3D...
            </div>
          }>
            {config.mode === 'isometric'      && <IsometricRenderer   {...rendererProps} />}
            {config.mode === 'perspective'     && <PerspectiveRenderer {...rendererProps} />}
            {config.mode === 'realistic'       && <RealisticRenderer   {...rendererProps} />}
            {config.mode === 'photorealistic'  && <PhotoRenderer       {...rendererProps} />}
          </Suspense>
        </div>
      </div>
    </div>
  )
}
