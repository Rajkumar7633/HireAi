"use client";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Hero3DPure({ brandColor, offsetX = -0.6, modelUrl, modelScale = 1.2, modelRotationY = 0, modelY = 0, useCoder = false, useStudents = false }: { brandColor?: string; offsetX?: number; modelUrl?: string; modelScale?: number; modelRotationY?: number; modelY?: number; useCoder?: boolean; useStudents?: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth;
    const height = mount.clientHeight;
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(offsetX * 0.8, 0, 4.5);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1.0);
    dir.position.set(5, 5, 5);
    scene.add(dir);
    const point = new THREE.PointLight(0x88ccff, 0.6);
    point.position.set(-6, -3, -2);
    scene.add(point);

    // Geometry: torus knot (default fallback if no GLTF and not using coder)
    const geo = new THREE.TorusKnotGeometry(1.1, 0.36, 220, 28);
    // Convert hex to number
    const hex = (brandColor || "#6d28d9").replace('#','');
    const colNum = parseInt(hex.length === 3 ? hex.split('').map(c=>c+c).join('') : hex, 16) || 0x6d28d9;
    const mat = new THREE.MeshStandardMaterial({ color: colNum, metalness: 0.6, roughness: 0.25 });
    const mesh = new THREE.Mesh(geo, mat);
    // Simulated bloom: slightly scaled additive copy
    const rim = new THREE.Mesh(
      geo.clone(),
      new THREE.MeshBasicMaterial({ color: colNum, transparent: true, opacity: isMobile ? 0.10 : 0.18, blending: THREE.AdditiveBlending })
    );
    rim.scale.setScalar(1.06);

    const group = new THREE.Group();
    group.position.x = offsetX;
    group.add(mesh);
    group.add(rim);
    scene.add(group);

    // Stylized coder with laptop (primitive illustrator)
    const coderGroup = new THREE.Group();
    coderGroup.position.x = offsetX;
    const skin = new THREE.MeshStandardMaterial({ color: 0xffd1b5, roughness: 0.6, metalness: 0.1 });
    const cloth = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.9 });
    const accent = new THREE.Color(colNum);
    const accentMat = new THREE.MeshStandardMaterial({ color: accent, metalness: 0.5, roughness: 0.4 });
    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 24, 24), skin);
    head.position.set(0, 0.6 + modelY, 0);
    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.6, 0.3), cloth);
    torso.position.set(0, 0.2 + modelY, 0);
    // Legs (seated)
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 16), cloth);
    const legR = legL.clone();
    legL.rotation.x = Math.PI / 2.6; legR.rotation.x = Math.PI / 2.6;
    legL.position.set(-0.14, -0.15 + modelY, 0.15); legR.position.set(0.14, -0.15 + modelY, 0.15);
    // Arms
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.38, 16), cloth);
    const armR = armL.clone();
    armL.position.set(-0.3, 0.35 + modelY, 0.1);
    armR.position.set(0.3, 0.35 + modelY, 0.1);
    armL.rotation.z = 0.6; armR.rotation.z = -0.6;
    // Hands
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 16), skin);
    const handR = handL.clone();
    handL.position.set(-0.42, 0.25 + modelY, 0.22);
    handR.position.set(0.42, 0.25 + modelY, 0.22);
    // Laptop
    const laptopBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.5), accentMat);
    laptopBase.position.set(0, 0 + modelY, 0.35);
    const laptopScreenMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: accent, emissiveIntensity: 0.6, metalness: 0.1, roughness: 0.4, transparent: true, opacity: 0.9 });
    const laptopScreen = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.5, 0.04), laptopScreenMat);
    laptopScreen.position.set(0, 0.28 + modelY, 0.12);
    laptopScreen.rotation.x = -0.9;
    // Chair base
    const chair = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 24), new THREE.MeshStandardMaterial({ color: 0x374151, roughness: 0.9 }));
    chair.position.set(0, -0.18 + modelY, 0);

    coderGroup.add(head, torso, legL, legR, armL, armR, handL, handR, laptopBase, laptopScreen, chair);
    coderGroup.rotation.y = modelRotationY;
    scene.add(coderGroup);
    // visibility: by default coder group hidden; will be toggled based on props/model
    coderGroup.visible = !!useCoder && !modelUrl;
    // If coder is visible, hide knot group
    if (coderGroup.visible) group.visible = false;

    // Two standing students (primitive avatars)
    const studentsGroup = new THREE.Group();
    studentsGroup.position.x = offsetX;
    const makeStudent = (hueShift: number) => {
      const g = new THREE.Group();
      const skinM = new THREE.MeshStandardMaterial({ color: 0xffe0c2, roughness: 0.6 });
      const clothHue = new THREE.Color().setHSL(((hueShift) / 360), 0.55, 0.45);
      const clothM = new THREE.MeshStandardMaterial({ color: clothHue, roughness: 0.8 });
      const hairM = new THREE.MeshStandardMaterial({ color: 0x2d2a26, roughness: 0.5 });
      // head + hair cap
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 24), skinM);
      head.position.set(0, 0.84 + modelY, 0);
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 20, 20, 0, Math.PI * 2, 0, Math.PI/1.8), hairM);
      hair.position.copy(head.position);
      hair.rotation.x = Math.PI;
      // body
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 24), clothM);
      body.position.set(0, 0.46 + modelY, 0);
      // arms
      const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.36, 16), clothM);
      const armR = armL.clone();
      armL.position.set(-0.26, 0.58 + modelY, 0); armR.position.set(0.26, 0.58 + modelY, 0);
      armL.rotation.z = 0.2; armR.rotation.z = -0.2;
      const handL = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 16), skinM);
      const handR = handL.clone();
      handL.position.set(-0.38, 0.4 + modelY, 0.02); handR.position.set(0.38, 0.4 + modelY, 0.02);
      // legs
      const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.42, 16), clothM);
      const legR = legL.clone();
      legL.position.set(-0.11, 0.15 + modelY, 0.02); legR.position.set(0.11, 0.15 + modelY, 0.02);
      const shoeM = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.7 });
      const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.24), shoeM);
      const shoeR = shoeL.clone();
      shoeL.position.set(-0.11, -0.06 + modelY, 0.08); shoeR.position.set(0.11, -0.06 + modelY, 0.08);
      g.add(head, hair, body, armL, armR, handL, handR, legL, legR, shoeL, shoeR);
      return { g, armL, armR, head };
    };
    const s1 = makeStudent(220);
    const s2 = makeStudent(340);
    s1.g.position.x = -0.6; s2.g.position.x = 0.6;
    studentsGroup.add(s1.g, s2.g);
    studentsGroup.visible = !!useStudents && !modelUrl;
    if (studentsGroup.visible) { group.visible = false; coderGroup.visible = false; }
    scene.add(studentsGroup);

    // Floating icosahedrons
    const shapes: THREE.Mesh[] = [];
    const icoGeo = new THREE.IcosahedronGeometry(0.18, 0);
    for (let i = 0; i < 6; i++) {
      const hueShift = (i * 40) % 360;
      const colorVar = new THREE.Color().setHSL(((hueShift) / 360), 0.6, 0.6);
      const m = new THREE.MeshStandardMaterial({ color: colorVar, roughness: 0.4, metalness: 0.3 });
      const ico = new THREE.Mesh(icoGeo, m);
      ico.position.set((Math.random() - 0.5) * 3.2, (Math.random() - 0.5) * 2.0, (Math.random() - 0.5) * 1.6);
      ico.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
      scene.add(ico);
      shapes.push(ico);
    }

    // Orbiting emissive ring (small spheres)
    const ringGroup = new THREE.Group();
    const ringCount = isMobile ? 7 : 10;
    const ringRadius = 2.6;
    for (let i = 0; i < ringCount; i++) {
      const geoS = new THREE.SphereGeometry(0.08, 16, 16);
      const emis = new THREE.Color(colNum);
      const matS = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: emis, emissiveIntensity: isMobile ? 0.22 : 0.35, roughness: 0.4, metalness: 0.2 });
      const s = new THREE.Mesh(geoS, matS);
      const a = (i / ringCount) * Math.PI * 2;
      s.position.set(Math.cos(a) * ringRadius, Math.sin(a) * 0.6, Math.sin(a) * ringRadius);
      ringGroup.add(s);
    }
    scene.add(ringGroup);

    // Second counter-rotating ring for "galaxy" look
    const ringGroup2 = new THREE.Group();
    const ring2Count = isMobile ? 6 : 9;
    const ring2Radius = 3.2;
    for (let i = 0; i < ring2Count; i++) {
      const geoS = new THREE.SphereGeometry(0.06, 14, 14);
      const emis = new THREE.Color(colNum);
      const matS = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: emis, emissiveIntensity: isMobile ? 0.18 : 0.28, roughness: 0.5, metalness: 0.15 });
      const s = new THREE.Mesh(geoS, matS);
      const a = (i / ring2Count) * Math.PI * 2 + Math.PI / 6;
      s.position.set(Math.cos(a) * ring2Radius, Math.sin(a) * 0.4 - 0.2, Math.sin(a) * ring2Radius);
      ringGroup2.add(s);
    }
    scene.add(ringGroup2);

    // Optional GLTF model replacement
    let gltfRoot: THREE.Object3D | null = null;
    if (modelUrl) {
      import('three/examples/jsm/loaders/GLTFLoader').then(({ GLTFLoader }) => {
        try {
          const loader = new GLTFLoader();
          loader.load(modelUrl!, (gltf) => {
            gltfRoot = gltf.scene;
            gltfRoot.scale.setScalar(modelScale);
            gltfRoot.position.set(offsetX, modelY, 0);
            gltfRoot.rotation.y = modelRotationY;
            scene.add(gltfRoot as THREE.Object3D);
            // Hide default groups if model provided
            group.visible = false;
            coderGroup.visible = false;
            studentsGroup.visible = false;
          });
        } catch {}
      }).catch(() => {});
    }

    // Subtle camera drift
    let t = 0;
    let raf = 0;
    const animate = () => {
      raf = requestAnimationFrame(animate);
      t += 0.01;
      group.rotation.x += 0.005;
      group.rotation.y += 0.0035;
      // Color pulse on main rim
      (rim.material as THREE.MeshBasicMaterial).opacity = (isMobile ? 0.08 : 0.14) + Math.sin(t * 0.8) * (isMobile ? 0.04 : 0.06);
      // Rotate ring
      ringGroup.rotation.y = t * 0.3;
      ringGroup.rotation.x = Math.sin(t * 0.2) * 0.1;
      ringGroup2.rotation.y = -t * 0.22;
      ringGroup2.rotation.x = -Math.sin(t * 0.18) * 0.08;
      // Dramatic orbit amplitude modulation
      const amp = 0.2 + Math.sin(t * 0.15) * 0.1; // 0.1..0.3
      camera.position.x = offsetX * 0.8 + Math.sin(t * 0.3) * amp;
      camera.position.y = Math.cos(t * 0.2) * (amp * 0.5);
      camera.lookAt(0, 0, 0);

      // Gentle idle spin for GLTF model
      if (gltfRoot) {
        gltfRoot.rotation.y += 0.003;
      }

      // Subtle typing animation and screen breathing
      if (coderGroup.visible) {
        const k = Math.sin(t * 8) * 0.015;
        handL.position.y = 0.25 + modelY + k;
        handR.position.y = 0.25 + modelY - k;
        (laptopScreen.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.5 + Math.sin(t * 1.5) * 0.2;
      }

      // Students idle animation: slight sway and wave
      if (studentsGroup.visible) {
        const sway = Math.sin(t * 1.2) * 0.03;
        s1.g.rotation.y = 0.1 + sway * 0.4;
        s2.g.rotation.y = -0.1 - sway * 0.4;
        s1.armR.rotation.z = -0.2 + Math.sin(t * 2.2) * 0.15;
        s2.armL.rotation.z = 0.2 - Math.sin(t * 2.0) * 0.15;
        s1.head.rotation.y = Math.sin(t * 0.7) * 0.15;
        s2.head.rotation.y = -Math.sin(t * 0.7) * 0.15;
      }

      // Float shapes
      for (let i = 0; i < shapes.length; i++) {
        const s = shapes[i];
        s.rotation.x += 0.004 + i * 0.0003;
        s.rotation.y += 0.003 + i * 0.0002;
        s.position.y += Math.sin(t * 0.8 + i) * 0.0009;
      }
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      rim.geometry.dispose();
      (rim.material as THREE.Material).dispose();
      icoGeo.dispose();
      shapes.forEach(s => (s.material as THREE.Material).dispose());
      ringGroup.traverse((obj) => {
        const m = (obj as THREE.Mesh).material as THREE.Material | undefined;
        if (m && 'dispose' in m) (m as THREE.Material).dispose();
        const g = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        if (g && 'dispose' in g) g.dispose();
      });
      ringGroup2.traverse((obj) => {
        const m = (obj as THREE.Mesh).material as THREE.Material | undefined;
        if (m && 'dispose' in m) (m as THREE.Material).dispose();
        const g = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        if (g && 'dispose' in g) g.dispose();
      });
      // Dispose coder
      coderGroup.traverse((obj) => {
        const m = (obj as THREE.Mesh).material as THREE.Material | undefined;
        if (m && 'dispose' in m) (m as THREE.Material).dispose();
        const g = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        if (g && 'dispose' in g) g.dispose();
      });
      // Dispose students
      studentsGroup.traverse((obj) => {
        const m = (obj as THREE.Mesh).material as THREE.Material | undefined;
        if (m && 'dispose' in m) (m as THREE.Material).dispose();
        const g = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
        if (g && 'dispose' in g) g.dispose();
      });
      mount.removeChild(renderer.domElement);
    };
  }, [brandColor, offsetX, modelUrl, modelScale, modelRotationY, modelY, useCoder, useStudents]);

  return <div ref={mountRef} className="w-full h-full" />;
}
