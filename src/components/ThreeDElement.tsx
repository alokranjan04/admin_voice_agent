"use client";

import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, TorusKnot, MeshDistortMaterial, Environment, Float, Sparkles, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';

const AnimatedShape = () => {
    const meshRef = useRef<THREE.Mesh>(null);

    useFrame((state) => {
        if (meshRef.current) {
            meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.15;
            meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.2;
        }
    });

    return (
        <Float speed={2.5} rotationIntensity={2} floatIntensity={3}>
            <TorusKnot ref={meshRef} args={[1, 0.3, 256, 64]} scale={1.2}>
                <MeshDistortMaterial
                    color="#6366f1"
                    attach="material"
                    distort={0.3}
                    speed={2}
                    roughness={0.1}
                    metalness={0.9}
                    emissive="#4f46e5"
                    emissiveIntensity={0.4}
                    clearcoat={1}
                />
            </TorusKnot>
        </Float>
    );
};

export default function ThreeDElement() {
    return (
        <div className="w-full h-[400px] md:h-[500px] relative pointer-events-auto">
            <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
                <ambientLight intensity={0.4} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} color="#c084fc" />
                <pointLight position={[-10, -10, -5]} intensity={1} color="#60a5fa" />

                <Environment preset="night" />

                <AnimatedShape />

                {/* Floating glowing particles */}
                <Sparkles count={150} scale={6} size={4} speed={0.4} opacity={0.6} color="#c084fc" />

                {/* Ground soft shadow */}
                <ContactShadows position={[0, -2, 0]} opacity={0.7} scale={10} blur={2.5} far={4} color="#0f172a" />

                <OrbitControls enableZoom={false} autoRotate autoRotateSpeed={0.8} />
            </Canvas>
        </div>
    );
}
