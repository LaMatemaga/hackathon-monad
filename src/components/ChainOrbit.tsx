import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import type { ChainId } from '../lib/types'
import { CHAINS } from '../lib/chains'
import { useBlockStore } from '../hooks/useBlockStore'

function orbitPos(angle: number, radius: number, inclination: number): [number, number, number] {
  const inc = (inclination * Math.PI) / 180
  return [
    radius * Math.cos(angle),
    radius * Math.sin(angle) * Math.cos(inc),
    radius * Math.sin(angle) * Math.sin(inc),
  ]
}

function generateRingParams(n: number) {
  return Array.from({ length: Math.max(n, 1) }, (_, i) => {
    const t = n <= 1 ? 0 : i / (n - 1)        // 0 → 1 across all threads
    const inclination = t * 165                 // 0° → 165° evenly distributed
    const radiusBand = i % 3                    // cycle 3 depth levels
    const radius = 2.4 + radiusBand * 0.8      // 2.4 | 3.2 | 4.0
    const speed = 2.0 - t * 1.0               // fast inner → slow outer
    return { radius, inclination, speed }
  })
}

const SEQUENTIAL_RING = { radius: 3.0, inclination: 0, speed: 0.6 }

const MAX_SPHERES = 120
const WINDOW_MS = 12_000
const PER_BLOCK_MAX = 16  // max spheres added per Monad block

interface SphereState {
  angle: number
  radius: number
  inclination: number
  speed: number
  opacity: number
  blockReceivedAt: number
}

interface ChainOrbitProps {
  chainId: ChainId
  position: [number, number, number]
}

export function ChainOrbit({ chainId, position }: ChainOrbitProps) {
  const config = CHAINS[chainId]
  const isMonad = chainId === 'monad'
  const color = config.color

  const blocks = useBlockStore((s) => s.blocks[chainId])
  const status = useBlockStore((s) => s.connectionStatus[chainId])
  const selectBlock = useBlockStore((s) => s.selectBlock)
  const setLineage = useBlockStore((s) => s.setLineage)

  const meshRef = useRef<THREE.InstancedMesh>(null)
  const coreRef = useRef<THREE.Mesh>(null)
  const sphereStates = useRef<SphereState[]>([])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorObj = useMemo(() => new THREE.Color(color), [color])
  const elapsedRef = useRef(0)
  const prevBlockHashRef = useRef<string | null>(null)

  useEffect(() => {
    const latest = blocks[0]
    if (!latest || latest.raw.hash === prevBlockHashRef.current) return
    prevBlockHashRef.current = latest.raw.hash

    if (isMonad) {
      // Add this block's spheres to the persistent pool
      const txs = latest.parallelGroups.flatMap((g) => g.transactions)
      const toAdd = txs.slice(0, Math.min(txs.length, PER_BLOCK_MAX))

      const rings = generateRingParams(latest.parallelGroups.length)
      const newSpheres: SphereState[] = toAdd.map((tx) => {
        const ring = rings[Math.min(tx.parallelGroupId, rings.length - 1)]
        return {
          angle: Math.random() * Math.PI * 2,
          radius: ring.radius + (Math.random() - 0.5) * 0.25,
          inclination: ring.inclination + (Math.random() - 0.5) * 5,
          speed: ring.speed * (0.8 + Math.random() * 0.4),
          opacity: 0,
          blockReceivedAt: latest.receivedAt,
        }
      })

      // Prune expired spheres, then prepend new ones, cap at MAX_SPHERES
      const now = Date.now()
      const alive = sphereStates.current.filter((s) => now - s.blockReceivedAt < WINDOW_MS)
      sphereStates.current = [...newSpheres, ...alive].slice(0, MAX_SPHERES)
    } else {
      // Sequential: replace all spheres on each new block
      const txs = latest.parallelGroups.flatMap((g) => g.transactions)
      const count = Math.min(txs.length, MAX_SPHERES)
      const now = Date.now()
      sphereStates.current = Array.from({ length: count }, (_, i) => ({
        angle: (i / count) * Math.PI * 2,
        radius: SEQUENTIAL_RING.radius + (Math.random() - 0.5) * 0.12,
        inclination: SEQUENTIAL_RING.inclination,
        speed: SEQUENTIAL_RING.speed * (0.85 + (i / count) * 0.3),
        opacity: 0,
        blockReceivedAt: now,
      }))
    }
  }, [blocks, isMonad])

  useFrame((_, delta) => {
    elapsedRef.current += delta

    const mesh = meshRef.current
    if (!mesh) return

    const states = sphereStates.current
    const count = Math.min(states.length, MAX_SPHERES)
    mesh.count = count

    const now = Date.now()

    for (let i = 0; i < count; i++) {
      const s = states[i]
      s.angle += s.speed * delta

      const age = now - s.blockReceivedAt
      let targetOpacity: number

      if (isMonad) {
        // Fade in over 400ms, hold, fade out over last 3s of window
        const fadeIn = Math.min(age / 400, 1)
        const fadeOutStart = WINDOW_MS * 0.75
        const fadeOut = age > fadeOutStart
          ? Math.max(0, 1 - (age - fadeOutStart) / (WINDOW_MS - fadeOutStart))
          : 1
        targetOpacity = 0.85 * fadeIn * fadeOut
      } else {
        // Fade in quickly, hold for block lifetime
        targetOpacity = Math.min(age / 500, 1) * 0.72
      }

      s.opacity += (targetOpacity - s.opacity) * Math.min(delta * 5, 1)

      const [x, y, z] = orbitPos(s.angle, s.radius, s.inclination)
      dummy.position.set(x, y, z)
      dummy.scale.setScalar(s.opacity > 0.02 ? 1 : 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, colorObj.clone().multiplyScalar(0.35 + s.opacity * 0.65))
    }

    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true

    if (coreRef.current) {
      const mat = coreRef.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = 0.6 + Math.sin(elapsedRef.current * 2) * 0.2
      coreRef.current.rotation.y += delta * 0.4
      coreRef.current.rotation.x += delta * 0.15
    }
  })

  const handleCoreClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    const latest = blocks[0]
    if (!latest) return
    selectBlock(latest)
    setLineage({ ancestors: [], focal: latest, child: null })
  }

  const isLive = status === 'live'
  const isConnecting = status === 'connecting'
  const latest = blocks[0]
  return (
    <group position={position}>
      <pointLight color={color} intensity={isLive ? 4 : 1} distance={9} decay={2} />

      <mesh ref={coreRef} onClick={handleCoreClick}>
        <icosahedronGeometry args={[1.1, 1]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.7}
          roughness={0.2}
          metalness={0.8}
          transparent
          opacity={isConnecting ? 0.4 : 1}
        />
      </mesh>

      <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_SPHERES]}>
        <sphereGeometry args={[0.07, 6, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          roughness={0.3}
        />
      </instancedMesh>

      <Html position={[0, 5.5, 0]} center distanceFactor={12}>
        <div style={{
          fontFamily: 'Roboto Mono, monospace',
          color,
          textAlign: 'center',
          userSelect: 'none',
          pointerEvents: 'none',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
            {config.name}
          </div>
          <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>
            {isConnecting
              ? 'connecting...'
              : isLive
                ? `${latest?.raw.transactions.length ?? 0} tx/block`
                : 'error'}
          </div>
        </div>
      </Html>
    </group>
  )
}
