import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Pause, Play, RotateCw, ZoomIn, ZoomOut } from 'lucide-react';
import { HERO_IMAGE } from '../lib/catalogData.ts';
import {
  buildFashionShowcase,
  type ColorwayId,
  type FashionRig,
  type OutfitStyle,
} from '../lib/fashionModelGeometry.ts';
import { createFashionTextureSet } from '../lib/fashionTextures.ts';
import { ResilientImage } from './ResilientImage.tsx';

const _desiredPos = new THREE.Vector3();
const _desiredTarget = new THREE.Vector3();

const OUTFITS: { id: OutfitStyle; label: string }[] = [
  { id: 'trench', label: 'Trench Set' },
  { id: 'midi', label: 'Midi Chic' },
  { id: 'street', label: 'Street Layer' },
];

const COLORWAYS: { id: ColorwayId; label: string; swatch: string }[] = [
  { id: 'espresso', label: 'Espresso', swatch: '#5C3622' },
  { id: 'cobalt', label: 'Slate Blue', swatch: '#1E3A5F' },
  { id: 'ivory', label: 'Camel Ivory', swatch: '#DFD3BE' },
];

export function FashionModel3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const rigRef = useRef<FashionRig | null>(null);

  const [outfit, setOutfit] = useState<OutfitStyle>('trench');
  const [colorway, setColorway] = useState<ColorwayId>('espresso');
  const [isWalking, setIsWalking] = useState(true);
  const [isSpinning, setIsSpinning] = useState(true);
  const [cameraMode, setCameraMode] = useState<'full' | 'detail'>('full');
  const [hudCollapsed, setHudCollapsed] = useState(false);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const stateRef = useRef({
    isWalking: true,
    isSpinning: true,
    cameraMode: 'full' as 'full' | 'detail',
    transitioningCamera: false,
  });

  useEffect(() => {
    stateRef.current.isWalking = isWalking;
  }, [isWalking]);

  useEffect(() => {
    stateRef.current.isSpinning = isSpinning;
  }, [isSpinning]);

  useEffect(() => {
    stateRef.current.cameraMode = cameraMode;
    stateRef.current.transitioningCamera = true;
  }, [cameraMode]);

  useEffect(() => {
    rigRef.current?.setStyle(outfit, colorway);
  }, [outfit, colorway]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglUnavailable(true);
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'pan-y';

    container.appendChild(renderer.domElement);

    const width = Math.max(container.clientWidth, 300);
    const height = Math.max(container.clientHeight, 320);
    renderer.setSize(width, height, false);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf3ebdd);
    scene.fog = new THREE.Fog(0xf3ebdd, 4.6, 10.5);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    scene.environment = envTarget.texture;
    roomEnv.dispose();
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 30);
    camera.position.set(0.32, 1.32, 3.05);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.98, 0);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.rotateSpeed = 0.72;
    controls.update();

    const handleControlStart = () => {
      stateRef.current.transitioningCamera = false;
    };
    controls.addEventListener('start', handleControlStart);

    // 3-Point Warm/Cool Editorial Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0xd9ecfa, 0x9b7e65, 0.85);
    hemiLight.position.set(0, 5, 0);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff4e2, 1.9);
    keyLight.position.set(2.4, 3.8, 2.8);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 10;
    keyLight.shadow.camera.left = -1.6;
    keyLight.shadow.camera.right = 1.6;
    keyLight.shadow.camera.top = 2.4;
    keyLight.shadow.camera.bottom = -0.5;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe1f0fa, 0.72);
    fillLight.position.set(-2.6, 2.0, 2.0);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xb8ddf5, 0.95);
    rimLight.position.set(-1.5, 2.8, -2.8);
    scene.add(rimLight);

    // Studio Cyclorama Floor under Plinth
    const floorGeo = new THREE.CircleGeometry(6, 48);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xefe5d6,
      roughness: 0.92,
      metalness: 0.0,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.122;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const textures = createFashionTextureSet(maxAniso);
    const rig = buildFashionShowcase(textures);
    rigRef.current = rig;
    scene.add(rig.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(Math.floor(entry.contentRect.width), 280);
        const h = Math.max(Math.floor(entry.contentRect.height), 280);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      }
    });
    resizeObserver.observe(container);

    let isInViewport = true;
    const visibilityObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          isInViewport = entry.isIntersecting;
        }
      },
      { threshold: 0.02 },
    );
    visibilityObserver.observe(container);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let phase = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      if (!sync) {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const poll = () => {
        if (disposed) return;
        const state = gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const scheduleNext = () => {
      if (disposed) return;
      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    };

    const tick = () => {
      if (disposed) return;
      const delta = Math.min(clock.getDelta(), 0.05);

      if (!document.hidden && isInViewport) {
        const {
          isWalking: walking,
          isSpinning: spinning,
          cameraMode: camMode,
          transitioningCamera,
        } = stateRef.current;

        if (!prefersReducedMotion) {
          phase += delta * (walking ? 3.2 : 1.5);
          const stride = walking ? 1 : 0;

          // Smooth runway walk vs relaxed editorial pose via exponential damping
          const walkLeftLeg = Math.sin(phase) * 0.28 * stride;
          const walkRightLeg = -Math.sin(phase) * 0.28 * stride;
          const walkLeftKnee = Math.max(0, -Math.cos(phase)) * 0.34 * stride;
          const walkRightKnee = Math.max(0, Math.cos(phase)) * 0.34 * stride;

          rig.leftLegPivot.rotation.x = THREE.MathUtils.damp(
            rig.leftLegPivot.rotation.x,
            walking ? walkLeftLeg : -0.05,
            8,
            delta,
          );
          rig.rightLegPivot.rotation.x = THREE.MathUtils.damp(
            rig.rightLegPivot.rotation.x,
            walking ? walkRightLeg : 0.07,
            8,
            delta,
          );
          rig.leftKneePivot.rotation.x = THREE.MathUtils.damp(
            rig.leftKneePivot.rotation.x,
            walking ? walkLeftKnee : 0.08,
            8,
            delta,
          );
          rig.rightKneePivot.rotation.x = THREE.MathUtils.damp(
            rig.rightKneePivot.rotation.x,
            walking ? walkRightKnee : 0.02,
            8,
            delta,
          );

          // Confident arm swing opposite to legs + gentle elbow bend
          rig.leftArmPivot.rotation.x = THREE.MathUtils.damp(
            rig.leftArmPivot.rotation.x,
            walking ? -Math.sin(phase) * 0.24 : 0.05,
            7,
            delta,
          );
          rig.rightArmPivot.rotation.x = THREE.MathUtils.damp(
            rig.rightArmPivot.rotation.x,
            walking ? Math.sin(phase) * 0.24 : -0.08,
            7,
            delta,
          );
          rig.leftArmPivot.rotation.z = THREE.MathUtils.damp(
            rig.leftArmPivot.rotation.z,
            -0.09,
            7,
            delta,
          );
          rig.rightArmPivot.rotation.z = THREE.MathUtils.damp(
            rig.rightArmPivot.rotation.z,
            0.09,
            7,
            delta,
          );
          rig.leftForearmPivot.rotation.x = THREE.MathUtils.damp(
            rig.leftForearmPivot.rotation.x,
            walking ? -0.22 - Math.max(0, Math.sin(phase)) * 0.14 : -0.28,
            7,
            delta,
          );
          rig.rightForearmPivot.rotation.x = THREE.MathUtils.damp(
            rig.rightForearmPivot.rotation.x,
            walking ? -0.22 - Math.max(0, -Math.sin(phase)) * 0.14 : -0.45,
            7,
            delta,
          );

          // Subtle hip cadence, torso breathing & head poise
          rig.figureRoot.position.y = THREE.MathUtils.damp(
            rig.figureRoot.position.y,
            walking ? Math.abs(Math.cos(phase)) * 0.018 : Math.sin(phase) * 0.004,
            10,
            delta,
          );
          rig.torsoPivot.rotation.y = THREE.MathUtils.damp(
            rig.torsoPivot.rotation.y,
            walking ? -Math.sin(phase) * 0.065 : 0.05,
            6,
            delta,
          );
          rig.torsoPivot.rotation.z = THREE.MathUtils.damp(
            rig.torsoPivot.rotation.z,
            walking ? Math.cos(phase) * 0.025 : -0.018,
            6,
            delta,
          );
          rig.headPivot.rotation.y = THREE.MathUtils.damp(
            rig.headPivot.rotation.y,
            walking ? Math.sin(phase) * 0.04 : -0.07,
            6,
            delta,
          );
          rig.bagSwingGroup.rotation.z = THREE.MathUtils.damp(
            rig.bagSwingGroup.rotation.z,
            walking ? Math.sin(phase + 0.6) * 0.035 : 0,
            6,
            delta,
          );

          if (spinning) {
            rig.figureRoot.rotation.y += delta * 0.36;
          }
        }

        if (transitioningCamera) {
          if (camMode === 'detail') {
            _desiredPos.set(0.24, 1.46, 1.85);
            _desiredTarget.set(0, 1.24, 0);
          } else {
            _desiredPos.set(0.32, 1.32, 3.05);
            _desiredTarget.set(0, 0.98, 0);
          }
          camera.position.x = THREE.MathUtils.damp(camera.position.x, _desiredPos.x, 6, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, _desiredPos.y, 6, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, _desiredPos.z, 6, delta);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, _desiredTarget.x, 6, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, _desiredTarget.y, 6, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, _desiredTarget.z, 6, delta);

          if (camera.position.distanceTo(_desiredPos) < 0.01) {
            stateRef.current.transitioningCamera = false;
          }
        }

        controls.update();
        renderer.render(scene, camera);
      }

      scheduleNext();
    };

    renderer.render(scene, camera);
    scheduleNext();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      controls.removeEventListener('start', handleControlStart);
      controls.dispose();
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      rig.dispose();
      textures.dispose();
      floorGeo.dispose();
      floorMat.dispose();
      envTarget.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      rigRef.current = null;
    };
  }, []);

  if (webglUnavailable) {
    return (
      <ResilientImage
        src={HERO_IMAGE}
        alt="shopEase studio collection featuring tailored fashion and accessories"
        fallbackLabel="shopEase Collection"
        className="w-full h-full object-cover"
      />
    );
  }

  return (
    <div className="relative flex-1 w-full h-full min-h-[400px] sm:min-h-[440px] lg:min-h-[470px] bg-[#F3EBDD] select-none overflow-hidden">
      {/* Isolated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing"
        aria-label="Interactive 3D fashion model wearing ShopEase curated outfits"
      />

      {/* Minimal Top-Left Editorial Badge */}
      <div className="pointer-events-none absolute top-3 left-3 sm:top-4 sm:left-4 z-10 px-3 py-1.5 rounded-lg bg-[#FFFDF9]/92 border border-[#E4D8C6] shadow-xs">
        <p className="text-[11px] font-medium text-[#2C1A12] tracking-tight">
          3D Runway Showcase · Drag to Rotate
        </p>
      </div>

      {/* Collapsible Unified Bottom Control Dock (Zero Center Occlusion, No backdrop-filter) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 w-[calc(100%-1.5rem)] max-w-[600px] flex flex-col items-center pointer-events-none">
        <button
          type="button"
          onClick={() => setHudCollapsed((prev) => !prev)}
          aria-expanded={!hudCollapsed}
          className="pointer-events-auto mb-1.5 inline-flex items-center gap-1.5 min-h-[30px] px-3 py-1 rounded-t-lg rounded-b-md bg-[#FFFDF9]/95 hover:bg-[#FFFDF9] border border-[#E4D8C6] text-[11px] font-medium text-[#2C1A12] shadow-xs transition-colors"
        >
          {hudCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5 text-[#6B3F26]" />
              Show Style Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5 text-[#6B3F26]" />
              Hide Controls
            </>
          )}
        </button>

        {!hudCollapsed && (
          <div className="pointer-events-auto w-full bg-[#FFFDF9]/95 border border-[#E4D8C6] rounded-xl p-2.5 sm:p-3 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            {/* Outfit Selector */}
            <div
              role="group"
              aria-label="Select outfit style"
              className="flex items-center gap-1 overflow-x-auto no-scrollbar"
            >
              {OUTFITS.map((item) => {
                const active = outfit === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setOutfit(item.id)}
                    aria-pressed={active}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors shrink-0 ${
                      active
                        ? 'bg-[#6B3F26] text-[#FFFDF9]'
                        : 'bg-[#F5EFE4] text-[#2C1A12] hover:bg-[#EAE0CE]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2">
              {/* Fabric Colorway Swatches */}
              <div role="group" aria-label="Select fabric colorway" className="flex items-center gap-1.5">
                {COLORWAYS.map((c) => {
                  const active = colorway === c.id;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColorway(c.id)}
                      title={c.label}
                      aria-label={`${c.label} colorway`}
                      aria-pressed={active}
                      className={`w-7 h-7 rounded-full border-2 transition-transform flex items-center justify-center shrink-0 ${
                        active
                          ? 'border-[#2D6F99] scale-110'
                          : 'border-[#D7C6B1] hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.swatch }}
                    />
                  );
                })}
              </div>

              <span aria-hidden="true" className="h-5 w-px bg-[#E4D8C6]" />

              {/* Pose, Spin & Framing */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setIsWalking((w) => !w)}
                  aria-label={isWalking ? 'Switch to studio pose' : 'Play runway walk'}
                  title={isWalking ? 'Studio Pose' : 'Runway Walk'}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                    isWalking
                      ? 'bg-[#E1F0FA] border-[#A8D4F0] text-[#1E4E6E]'
                      : 'bg-[#FFFDF9] border-[#E4D8C6] text-[#63493B] hover:bg-[#F3EBDD]'
                  }`}
                >
                  {isWalking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                </button>

                <button
                  type="button"
                  onClick={() => setIsSpinning((s) => !s)}
                  aria-label={isSpinning ? 'Pause turntable rotation' : 'Enable turntable rotation'}
                  title={isSpinning ? 'Stop Spin' : 'Auto Spin'}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                    isSpinning
                      ? 'bg-[#E1F0FA] border-[#A8D4F0] text-[#1E4E6E]'
                      : 'bg-[#FFFDF9] border-[#E4D8C6] text-[#63493B] hover:bg-[#F3EBDD]'
                  }`}
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCameraMode((m) => (m === 'full' ? 'detail' : 'full'))}
                  aria-label={cameraMode === 'full' ? 'Zoom to upper tailoring detail' : 'View full outfit'}
                  title={cameraMode === 'full' ? 'Close-Up View' : 'Full Outfit View'}
                  className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                    cameraMode === 'detail'
                      ? 'bg-[#E1F0FA] border-[#A8D4F0] text-[#1E4E6E]'
                      : 'bg-[#FFFDF9] border-[#E4D8C6] text-[#63493B] hover:bg-[#F3EBDD]'
                  }`}
                >
                  {cameraMode === 'full' ? (
                    <ZoomIn className="w-3.5 h-3.5" />
                  ) : (
                    <ZoomOut className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
