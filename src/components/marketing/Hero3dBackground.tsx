'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import styles from './Hero3dBackground.module.css'

export function Hero3dBackground() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return undefined

    // Responsive setup: disable Heavy WebGL on mobile devices
    const isMobile = window.innerWidth < 768 || navigator.maxTouchPoints > 1
    const particleCount = isMobile ? 350 : 1200

    // Three.js Core Setup
    const scene = new THREE.Scene()
    
    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      1,
      1000
    )
    camera.position.z = 400

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(container.clientWidth, container.clientHeight)

    // Particle Attributes Geometry
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(particleCount * 3)
    const initialPositions = new Float32Array(particleCount * 3)
    const phases = new Float32Array(particleCount)
    const sizes = new Float32Array(particleCount)

    for (let i = 0; i < particleCount; i++) {
      // Create a gorgeous double-helix spiral structure
      const u = i / particleCount
      const isFirstHelix = i % 2 === 0
      const angle = u * Math.PI * 24 + (isFirstHelix ? 0 : Math.PI)
      const radius = 90 + u * 190
      
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      const z = (Math.random() - 0.5) * 60 + Math.sin(u * Math.PI * 8) * 30

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      initialPositions[i * 3] = x
      initialPositions[i * 3 + 1] = y
      initialPositions[i * 3 + 2] = z

      phases[i] = Math.random() * Math.PI * 2
      sizes[i] = 1.2 + Math.random() * 2.8
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    // Particle Texture & Material
    // Create a circular glowing canvas-based texture inline to avoid external asset dependency
    const pCanvas = document.createElement('canvas')
    pCanvas.width = 16
    pCanvas.height = 16
    const ctx = pCanvas.getContext('2d')
    if (ctx) {
      const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8)
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)')
      grad.addColorStop(0.3, 'rgba(245, 200, 66, 0.8)')
      grad.addColorStop(1, 'rgba(245, 200, 66, 0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 16, 16)
    }
    const texture = new THREE.CanvasTexture(pCanvas)

    const material = new THREE.PointsMaterial({
      size: 4,
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: 0xFDF6EC,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)

    // Interaction mouse listeners
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 }
    
    const onMouseMove = (e: MouseEvent) => {
      // Map mouse coordinates between -1 and 1
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1
      mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1
    }

    if (!isMobile) {
      window.addEventListener('mousemove', onMouseMove)
    }

    // Render loop state
    let clock = new THREE.Clock()
    let reqId: number

    const tick = () => {
      const time = clock.getElapsedTime()
      const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute
      const posArray = posAttr.array as Float32Array

      // Smooth mouse interpolation
      mouse.x += (mouse.targetX - mouse.x) * 0.08
      mouse.y += (mouse.targetY - mouse.y) * 0.08

      // Rotate points layer dynamically
      points.rotation.y = time * 0.03
      points.rotation.z = time * 0.015

      // Breathe coefficient
      const breathe = 1.0 + Math.sin(time * 0.4) * 0.12

      // Displace each particle with sine waves + mouse gravity push
      for (let i = 0; i < particleCount; i++) {
        const idx = i * 3
        const initX = initialPositions[idx]
        const initY = initialPositions[idx + 1]
        const initZ = initialPositions[idx + 2]
        
        // Elegant mathematical sine waves
        const wave = Math.sin(time * 1.2 + phases[i]) * 12

        // Combine base position and wave offset
        let targetX = initX * breathe + (Math.cos(phases[i] + time) * wave * 0.5)
        let targetY = initY * breathe + (Math.sin(phases[i] + time) * wave * 0.5)
        let targetZ = initZ + Math.cos(time + phases[i]) * 20

        // Mouse displacement calculation
        if (!isMobile) {
          // Project mouse coordinates to particle plane coordinates
          const mouseWorldX = mouse.x * 400
          const mouseWorldY = mouse.y * 250
          
          const dx = posArray[idx] - mouseWorldX
          const dy = posArray[idx + 1] - mouseWorldY
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < 130) {
            // Push particles away with an organic fluid swell
            const force = (130 - dist) / 130
            const angle = Math.atan2(dy, dx)
            targetX += Math.cos(angle) * force * 50
            targetY += Math.sin(angle) * force * 40
            targetZ += (Math.random() - 0.5) * force * 30
          }
        }

        // Apply smooth positions update
        posArray[idx] += (targetX - posArray[idx]) * 0.05
        posArray[idx + 1] += (targetY - posArray[idx + 1]) * 0.05
        posArray[idx + 2] += (targetZ - posArray[idx + 2]) * 0.05
      }

      posAttr.needsUpdate = true

      renderer.render(scene, camera)
      reqId = requestAnimationFrame(tick)
    }

    tick()

    // Handle resizing
    const onResize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    }
    
    window.addEventListener('resize', onResize)

    // Clean up
    return () => {
      cancelAnimationFrame(reqId)
      window.removeEventListener('resize', onResize)
      if (!isMobile) {
        window.removeEventListener('mousemove', onMouseMove)
      }
      geometry.dispose()
      material.dispose()
      texture.dispose()
      renderer.dispose()
    }
  }, [])

  return (
    <div className={styles.container} ref={containerRef}>
      <canvas className={styles.canvas} ref={canvasRef} />
    </div>
  )
}
