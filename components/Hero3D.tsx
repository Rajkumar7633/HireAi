"use client";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import React, { useMemo, useRef } from "react";

function Knot({ color = "#6d28d9" }: { color?: string }) {
  const ref = useRef<any>();
  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.getElapsedTime();
    ref.current.rotation.x = t * 0.2;
    ref.current.rotation.y = t * 0.15;
  });
  const materialProps = useMemo(
    () => ({ color, roughness: 0.25, metalness: 0.6 }),
    [color]
  );
  return (
    <Float speed={1} rotationIntensity={0.3} floatIntensity={0.8}>
      <mesh ref={ref} position={[0, 0, 0]}>
        <torusKnotGeometry args={[1.1, 0.36, 220, 28]} />
        <meshStandardMaterial {...materialProps} />
      </mesh>
    </Float>
  );
}

export default function Hero3D({ brandColor }: { brandColor?: string }) {
  const color = brandColor || "#6d28d9";
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.5], fov: 45 }}>
      <color attach="background" args={["#000000"]} />
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1.1} />
      <pointLight position={[-6, -3, -2]} intensity={0.6} />
      <Knot color={color} />
    </Canvas>
  );
}
