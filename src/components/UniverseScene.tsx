import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { ChainOrbit } from './ChainOrbit'

export function UniverseScene() {
  return (
    <Canvas
      camera={{ position: [0, 2, 18], fov: 58 }}
      style={{ background: '#0E091C', width: '100vw', height: '100vh' }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.08} />
      <Stars radius={200} depth={60} count={4000} factor={4} saturation={0} fade speed={0.3} />

      <ChainOrbit chainId="monad"    position={[-7.5, 0, 0]} />
      <ChainOrbit chainId="ethereum" position={[0,    0, 0]} />
      <ChainOrbit chainId="bnb"      position={[7.5,  0, 0]} />
    </Canvas>
  )
}
