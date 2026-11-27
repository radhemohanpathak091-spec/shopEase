import * as THREE from 'three';
import type { ProceduralTextureSet } from './fashionTextures.ts';

export type OutfitStyle = 'trench' | 'midi' | 'street';
export type ColorwayId = 'espresso' | 'cobalt' | 'ivory';

interface ColorwayPalette {
  outer: number;
  bottom: number;
  inner: number;
  leather: number;
  sole: number;
  metal: number;
  accent: number;
}

const PALETTES: Record<ColorwayId, ColorwayPalette> = {
  espresso: {
    outer: 0x5c3622,
    bottom: 0x2c1f19,
    inner: 0xf4ede1,
    leather: 0x3b2316,
    sole: 0x1e1410,
    metal: 0xd4aa63,
    accent: 0x68b0df,
  },
  cobalt: {
    outer: 0x1e3a5f,
    bottom: 0x284c73,
    inner: 0xf4f6f9,
    leather: 0x241d1a,
    sole: 0xebe6dd,
    metal: 0xd0d7de,
    accent: 0x89c4ea,
  },
  ivory: {
    outer: 0xdfd3be,
    bottom: 0x6f5a47,
    inner: 0x2b231e,
    leather: 0x6b3f26,
    sole: 0x2a1d15,
    metal: 0xcda869,
    accent: 0x4e7fa3,
  },
};

export interface FashionRig {
  root: THREE.Group;
  figureRoot: THREE.Group;
  torsoPivot: THREE.Group;
  headPivot: THREE.Group;
  leftArmPivot: THREE.Group;
  rightArmPivot: THREE.Group;
  leftForearmPivot: THREE.Group;
  rightForearmPivot: THREE.Group;
  leftLegPivot: THREE.Group;
  rightLegPivot: THREE.Group;
  leftKneePivot: THREE.Group;
  rightKneePivot: THREE.Group;
  hemFlowGroup: THREE.Group;
  bagSwingGroup: THREE.Group;
  setStyle: (outfit: OutfitStyle, colorway: ColorwayId) => void;
  dispose: () => void;
}

function createPleatedSkirtGeometry(
  topRadius: number,
  bottomRadius: number,
  height: number,
  pleatCount: number,
  pleatDepth: number,
): THREE.BufferGeometry {
  const radialSegs = 96;
  const heightSegs = 20;
  const geo = new THREE.CylinderGeometry(
    topRadius,
    bottomRadius,
    height,
    radialSegs,
    heightSegs,
    true,
  );
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const angle = Math.atan2(z, x);
    const vNorm = 1 - (y + height / 2) / height; // 0 at waist, 1 at hem
    const pleat = Math.sin(angle * pleatCount) * pleatDepth * Math.pow(vNorm, 0.85);
    const r = Math.hypot(x, z);
    if (r > 0.0001) {
      const scale = (r + pleat) / r;
      pos.setX(i, x * scale);
      pos.setZ(i, z * scale);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

function createLapelGeometry(side: -1 | 1): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.065 * side, -0.025);
  shape.lineTo(0.092 * side, -0.14);
  shape.lineTo(0.055 * side, -0.155);
  shape.lineTo(0.068 * side, -0.195);
  shape.lineTo(0.015 * side, -0.28);
  shape.lineTo(0, -0.28);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.014,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.003,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

export function buildFashionShowcase(textures: ProceduralTextureSet): FashionRig {
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  const root = new THREE.Group();

  // --- Shared PBR Material Library ---
  const skinMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0xd9a88a,
      roughness: 0.56,
      metalness: 0.0,
      sheen: 0.25,
      sheenColor: new THREE.Color(0xf6d5c1),
      sheenRoughness: 0.7,
    }),
  );

  const hairMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x241914,
      roughness: 0.36,
      metalness: 0.05,
      clearcoat: 0.35,
      clearcoatRoughness: 0.45,
    }),
  );

  const outerFabricMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: PALETTES.espresso.outer,
      map: textures.twillColor,
      bumpMap: textures.twillBump,
      bumpScale: 0.0045,
      roughness: 0.84,
      metalness: 0.02,
      sheen: 0.65,
      sheenRoughness: 0.72,
      sheenColor: new THREE.Color(0xfbf6ee),
      side: THREE.DoubleSide,
    }),
  );

  const bottomFabricMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: PALETTES.espresso.bottom,
      map: textures.denimColor,
      bumpMap: textures.twillBump,
      bumpScale: 0.004,
      roughness: 0.82,
      metalness: 0.02,
      sheen: 0.45,
      sheenRoughness: 0.8,
      side: THREE.DoubleSide,
    }),
  );

  const innerKnitMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: PALETTES.espresso.inner,
      bumpMap: textures.knitBump,
      bumpScale: 0.006,
      roughness: 0.88,
      metalness: 0.0,
      sheen: 0.8,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color(0xffffff),
    }),
  );

  const leatherMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: PALETTES.espresso.leather,
      bumpMap: textures.leatherBump,
      bumpScale: 0.004,
      roughness: 0.4,
      metalness: 0.05,
      clearcoat: 0.28,
      clearcoatRoughness: 0.38,
    }),
  );

  const soleMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: PALETTES.espresso.sole,
      roughness: 0.72,
      metalness: 0.05,
    }),
  );

  const metalMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: PALETTES.espresso.metal,
      roughness: 0.18,
      metalness: 0.94,
      anisotropy: 0.8,
      clearcoat: 0.4,
    }),
  );

  const accentMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: PALETTES.espresso.accent,
      roughness: 0.42,
      metalness: 0.12,
      sheen: 0.7,
      sheenColor: new THREE.Color(0xffffff),
      side: THREE.DoubleSide,
    }),
  );

  const eyewearFrameMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x3b2316,
      roughness: 0.22,
      metalness: 0.08,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    }),
  );

  const lensMat = trackMat(
    new THREE.MeshPhysicalMaterial({
      color: 0x161c24,
      roughness: 0.08,
      metalness: 0.2,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.82,
    }),
  );

  // --- Grounded Travertine Studio Plinth (top surface strictly at y = 0) ---
  const plinthGroup = new THREE.Group();
  const plinthMat = trackMat(
    new THREE.MeshStandardMaterial({
      map: textures.plinthMarble,
      roughness: 0.58,
      metalness: 0.06,
    }),
  );
  const plinthDisk = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.68, 0.72, 0.12, 64)),
    plinthMat,
  );
  plinthDisk.position.y = -0.06;
  plinthDisk.receiveShadow = true;
  plinthGroup.add(plinthDisk);

  const plinthRim = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.685, 0.012, 16, 72)),
    metalMat,
  );
  plinthRim.rotation.x = Math.PI / 2;
  plinthRim.position.y = -0.008;
  plinthGroup.add(plinthRim);

  const shadowMat = trackMat(
    new THREE.MeshBasicMaterial({
      map: textures.contactShadow,
      transparent: true,
      depthWrite: false,
      opacity: 0.48,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const contactShadowPlane = new THREE.Mesh(
    trackGeo(new THREE.PlaneGeometry(0.92, 0.92)),
    shadowMat,
  );
  contactShadowPlane.rotation.x = -Math.PI / 2;
  contactShadowPlane.position.y = 0.003;
  plinthGroup.add(contactShadowPlane);
  root.add(plinthGroup);

  // --- Articulated Runway Figure (bottom of footwear rests at y = 0) ---
  const figureRoot = new THREE.Group();
  root.add(figureRoot);

  // Pelvis / Hips (y = 0.96)
  const pelvisGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.0, -0.06),
        new THREE.Vector2(0.115, -0.04),
        new THREE.Vector2(0.132, 0.02),
        new THREE.Vector2(0.108, 0.09),
        new THREE.Vector2(0.0, 0.1),
      ],
      28,
    ),
  );
  const pelvisMesh = new THREE.Mesh(pelvisGeo, bottomFabricMat);
  pelvisMesh.position.y = 0.94;
  pelvisMesh.scale.set(1.04, 1, 0.78);
  pelvisMesh.castShadow = true;
  figureRoot.add(pelvisMesh);

  // --- Torso Pivot ---
  const torsoPivot = new THREE.Group();
  torsoPivot.position.set(0, 0.98, 0);
  figureRoot.add(torsoPivot);

  // Sculpted Inner Top (Ribbed Knit / Crisp Oxford Base)
  const torsoBaseGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.098, 0.0),
        new THREE.Vector2(0.094, 0.08),
        new THREE.Vector2(0.118, 0.22),
        new THREE.Vector2(0.148, 0.36),
        new THREE.Vector2(0.154, 0.45),
        new THREE.Vector2(0.058, 0.51),
        new THREE.Vector2(0.048, 0.57),
        new THREE.Vector2(0.0, 0.57),
      ],
      32,
    ),
  );
  const torsoBase = new THREE.Mesh(torsoBaseGeo, innerKnitMat);
  torsoBase.scale.set(1.06, 1, 0.74);
  torsoBase.castShadow = true;
  torsoBase.receiveShadow = true;
  torsoPivot.add(torsoBase);

  // --- Head & Editorial Hair Pivot ---
  const headPivot = new THREE.Group();
  headPivot.position.set(0, 0.54, 0);
  torsoPivot.add(headPivot);

  const neckMesh = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.042, 0.049, 0.11, 24)),
    skinMat,
  );
  neckMesh.position.y = 0.05;
  neckMesh.castShadow = true;
  headPivot.add(neckMesh);

  const headGeo = trackGeo(new THREE.SphereGeometry(0.096, 32, 28));
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.y = 0.165;
  headMesh.scale.set(0.86, 1.08, 0.94);
  headMesh.castShadow = true;
  headPivot.add(headMesh);

  // Sleek Sculpted Hair Cap + High Editorial Bun
  const hairCapGeo = trackGeo(
    new THREE.SphereGeometry(0.1, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.62),
  );
  const hairCap = new THREE.Mesh(hairCapGeo, hairMat);
  hairCap.position.set(0, 0.175, -0.01);
  hairCap.rotation.x = -0.35;
  hairCap.scale.set(0.89, 1.07, 0.98);
  hairCap.castShadow = true;
  headPivot.add(hairCap);

  const hairBun = new THREE.Mesh(
    trackGeo(new THREE.SphereGeometry(0.052, 24, 20)),
    hairMat,
  );
  hairBun.position.set(0, 0.24, -0.092);
  hairBun.scale.set(1.05, 0.92, 0.88);
  hairBun.castShadow = true;
  headPivot.add(hairBun);

  // Gold/Silver Sculpted Drop Earrings
  const earringGeo = trackGeo(new THREE.TorusGeometry(0.014, 0.0028, 12, 24));
  [-1, 1].forEach((side) => {
    const earring = new THREE.Mesh(earringGeo, metalMat);
    earring.position.set(side * 0.084, 0.145, 0.005);
    earring.rotation.y = Math.PI / 2;
    headPivot.add(earring);
  });

  // Designer Acetate Eyewear (Sunglasses)
  const eyewearGroup = new THREE.Group();
  eyewearGroup.position.set(0, 0.172, 0.088);
  const frameGeo = trackGeo(new THREE.BoxGeometry(0.055, 0.025, 0.01));
  const lensGeo = trackGeo(new THREE.BoxGeometry(0.047, 0.019, 0.012));
  [-1, 1].forEach((side) => {
    const rim = new THREE.Mesh(frameGeo, eyewearFrameMat);
    rim.position.set(side * 0.032, 0, 0);
    eyewearGroup.add(rim);
    const lens = new THREE.Mesh(lensGeo, lensMat);
    lens.position.set(side * 0.032, 0, 0.001);
    eyewearGroup.add(lens);
  });
  const bridge = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.022, 0.006, 0.008)),
    eyewearFrameMat,
  );
  bridge.position.y = 0.005;
  eyewearGroup.add(bridge);
  headPivot.add(eyewearGroup);

  // --- Outfit Variants Attached to Torso & Lower Body ---
  const hemFlowGroup = new THREE.Group();
  torsoPivot.add(hemFlowGroup);

  const bagSwingGroup = new THREE.Group();
  torsoPivot.add(bagSwingGroup);

  // 1) TRENCH OUTFIT PARTS
  const trenchGroup = new THREE.Group();
  const trenchTorsoGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.185, -0.34),
        new THREE.Vector2(0.155, -0.18),
        new THREE.Vector2(0.122, 0.02),
        new THREE.Vector2(0.142, 0.22),
        new THREE.Vector2(0.168, 0.38),
        new THREE.Vector2(0.175, 0.46),
        new THREE.Vector2(0.072, 0.51),
      ],
      36,
    ),
  );
  const trenchBody = new THREE.Mesh(trenchTorsoGeo, outerFabricMat);
  trenchBody.scale.set(1.07, 1, 0.78);
  trenchBody.castShadow = true;
  trenchBody.receiveShadow = true;
  trenchGroup.add(trenchBody);

  // Notched Lapels (Left & Right)
  const leftLapel = new THREE.Mesh(trackGeo(createLapelGeometry(-1)), outerFabricMat);
  leftLapel.position.set(-0.056, 0.35, 0.118);
  leftLapel.rotation.set(0.18, -0.18, 0.04);
  leftLapel.castShadow = true;
  trenchGroup.add(leftLapel);

  const rightLapel = new THREE.Mesh(trackGeo(createLapelGeometry(1)), outerFabricMat);
  rightLapel.position.set(0.056, 0.35, 0.118);
  rightLapel.rotation.set(0.18, 0.18, -0.04);
  rightLapel.castShadow = true;
  trenchGroup.add(rightLapel);

  // Double-Breasted Buttons
  const buttonGeo = trackGeo(new THREE.CylinderGeometry(0.011, 0.011, 0.008, 18));
  for (let row = 0; row < 3; row++) {
    [-1, 1].forEach((side) => {
      const btn = new THREE.Mesh(buttonGeo, metalMat);
      btn.rotation.x = Math.PI / 2;
      btn.position.set(side * 0.042, 0.18 - row * 0.075, 0.122);
      trenchGroup.add(btn);
    });
  }

  // Waist Belt & Brushed Buckle
  const beltGeo = trackGeo(new THREE.CylinderGeometry(0.116, 0.12, 0.042, 32));
  const beltMesh = new THREE.Mesh(beltGeo, leatherMat);
  beltMesh.position.set(0, 0.045, 0);
  beltMesh.scale.set(1.08, 1, 0.8);
  beltMesh.castShadow = true;
  trenchGroup.add(beltMesh);

  const buckleFrame = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.042, 0.048, 0.014)),
    metalMat,
  );
  buckleFrame.position.set(0, 0.045, 0.1);
  trenchGroup.add(buckleFrame);

  // Crossbody Leather Satchel
  const strapCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.12, 0.49, 0.04),
    new THREE.Vector3(0.02, 0.25, 0.145),
    new THREE.Vector3(0.165, 0.01, 0.04),
    new THREE.Vector3(0.02, 0.23, -0.135),
    new THREE.Vector3(-0.12, 0.49, -0.04),
  ]);
  const strapMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(strapCurve, 44, 0.009, 10, true)),
    leatherMat,
  );
  strapMesh.castShadow = true;
  bagSwingGroup.add(strapMesh);

  const satchelBody = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.14, 0.115, 0.05)),
    leatherMat,
  );
  satchelBody.position.set(0.185, -0.05, 0.025);
  satchelBody.rotation.z = -0.08;
  satchelBody.castShadow = true;
  bagSwingGroup.add(satchelBody);

  const satchelClasp = new THREE.Mesh(
    trackGeo(new THREE.BoxGeometry(0.026, 0.022, 0.012)),
    metalMat,
  );
  satchelClasp.position.set(0.185, -0.04, 0.054);
  bagSwingGroup.add(satchelClasp);

  trenchGroup.add(bagSwingGroup);
  hemFlowGroup.add(trenchGroup);

  // 2) MIDI CHIC OUTFIT PARTS
  const midiGroup = new THREE.Group();
  // Draped Shoulder Scarf / Capelet
  const scarfCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.07, 0.47, 0.11),
    new THREE.Vector3(-0.16, 0.46, 0.02),
    new THREE.Vector3(-0.08, 0.44, -0.11),
    new THREE.Vector3(0.08, 0.44, -0.11),
    new THREE.Vector3(0.16, 0.46, 0.02),
    new THREE.Vector3(0.075, 0.45, 0.12),
    new THREE.Vector3(0.065, 0.24, 0.145),
    new THREE.Vector3(0.06, 0.08, 0.13),
  ]);
  const scarfMesh = new THREE.Mesh(
    trackGeo(new THREE.TubeGeometry(scarfCurve, 56, 0.026, 12, false)),
    accentMat,
  );
  scarfMesh.scale.set(1.06, 1, 0.9);
  scarfMesh.castShadow = true;
  midiGroup.add(scarfMesh);

  // Pleated Flowing Midi Skirt (anchored at waist)
  const skirtGeo = trackGeo(createPleatedSkirtGeometry(0.112, 0.29, 0.62, 22, 0.022));
  const skirtMesh = new THREE.Mesh(skirtGeo, outerFabricMat);
  skirtMesh.position.set(0, -0.28, 0);
  skirtMesh.scale.set(1.06, 1, 0.88);
  skirtMesh.castShadow = true;
  skirtMesh.receiveShadow = true;
  midiGroup.add(skirtMesh);

  // Thin Waist Belt + Pendant Necklace
  const midiBelt = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.112, 0.115, 0.026, 32)),
    leatherMat,
  );
  midiBelt.position.y = 0.025;
  midiBelt.scale.set(1.07, 1, 0.79);
  midiGroup.add(midiBelt);

  const pendant = new THREE.Mesh(
    trackGeo(new THREE.OctahedronGeometry(0.018, 0)),
    metalMat,
  );
  pendant.position.set(0, 0.39, 0.118);
  pendant.scale.set(0.8, 1.3, 0.4);
  midiGroup.add(pendant);

  hemFlowGroup.add(midiGroup);

  // 3) STREET LAYER OUTFIT PARTS
  const streetGroup = new THREE.Group();
  const jacketGeo = trackGeo(
    new THREE.LatheGeometry(
      [
        new THREE.Vector2(0.125, 0.02),
        new THREE.Vector2(0.132, 0.12),
        new THREE.Vector2(0.155, 0.28),
        new THREE.Vector2(0.172, 0.42),
        new THREE.Vector2(0.168, 0.48),
        new THREE.Vector2(0.068, 0.51),
      ],
      32,
    ),
  );
  const jacketMesh = new THREE.Mesh(jacketGeo, outerFabricMat);
  jacketMesh.scale.set(1.09, 1, 0.8);
  jacketMesh.castShadow = true;
  jacketMesh.receiveShadow = true;
  streetGroup.add(jacketMesh);

  // Contrast Collar + Dual Chest Pockets + Steel Snaps
  const collarRing = new THREE.Mesh(
    trackGeo(new THREE.TorusGeometry(0.075, 0.02, 12, 28)),
    leatherMat,
  );
  collarRing.rotation.x = Math.PI / 2 + 0.15;
  collarRing.position.set(0, 0.505, 0.005);
  collarRing.scale.set(1.1, 0.9, 1);
  streetGroup.add(collarRing);

  [-1, 1].forEach((side) => {
    const pocket = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.062, 0.068, 0.015)),
      outerFabricMat,
    );
    pocket.position.set(side * 0.068, 0.31, 0.118);
    pocket.rotation.y = side * 0.15;
    pocket.castShadow = true;
    streetGroup.add(pocket);

    const snap = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.008, 0.008, 0.008, 14)),
      metalMat,
    );
    snap.rotation.x = Math.PI / 2;
    snap.position.set(side * 0.068, 0.33, 0.126);
    streetGroup.add(snap);
  });

  // Layered Untucked Shirt Hem
  const shirtHem = new THREE.Mesh(
    trackGeo(new THREE.CylinderGeometry(0.12, 0.134, 0.08, 28)),
    innerKnitMat,
  );
  shirtHem.position.y = -0.015;
  shirtHem.scale.set(1.07, 1, 0.78);
  streetGroup.add(shirtHem);

  hemFlowGroup.add(streetGroup);

  // --- Articulated Arms (Left & Right) ---
  const createArm = (side: -1 | 1) => {
    const shoulderPivot = new THREE.Group();
    shoulderPivot.position.set(side * 0.182, 0.455, 0);
    torsoPivot.add(shoulderPivot);

    const sleeveGeo = trackGeo(new THREE.CylinderGeometry(0.048, 0.04, 0.27, 20));
    const upperArm = new THREE.Mesh(sleeveGeo, outerFabricMat);
    upperArm.position.y = -0.135;
    upperArm.castShadow = true;
    shoulderPivot.add(upperArm);

    const elbowPivot = new THREE.Group();
    elbowPivot.position.set(0, -0.265, 0);
    shoulderPivot.add(elbowPivot);

    const forearmGeo = trackGeo(new THREE.CylinderGeometry(0.039, 0.032, 0.24, 20));
    const forearm = new THREE.Mesh(forearmGeo, outerFabricMat);
    forearm.position.y = -0.12;
    forearm.castShadow = true;
    elbowPivot.add(forearm);

    const cuff = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.035, 0.036, 0.03, 20)),
      innerKnitMat,
    );
    cuff.position.y = -0.235;
    elbowPivot.add(cuff);

    const hand = new THREE.Mesh(
      trackGeo(new THREE.SphereGeometry(0.028, 16, 14)),
      skinMat,
    );
    hand.position.y = -0.27;
    hand.scale.set(0.72, 1.35, 0.55);
    hand.castShadow = true;
    elbowPivot.add(hand);

    // Metallic Wristwatch on Left Wrist
    if (side === -1) {
      const watchBand = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.033, 0.006, 10, 22)),
        metalMat,
      );
      watchBand.rotation.x = Math.PI / 2;
      watchBand.position.y = -0.22;
      elbowPivot.add(watchBand);
    }

    return { shoulderPivot, elbowPivot, upperArm, forearm };
  };

  const leftArm = createArm(-1);
  const rightArm = createArm(1);

  // --- Articulated Legs & Architectural Footwear (Bottom rests strictly at y = 0) ---
  const createLeg = (side: -1 | 1) => {
    const hipPivot = new THREE.Group();
    hipPivot.position.set(side * 0.088, 0.94, 0);
    figureRoot.add(hipPivot);

    const thighGeo = trackGeo(new THREE.CylinderGeometry(0.068, 0.064, 0.42, 24));
    const thigh = new THREE.Mesh(thighGeo, bottomFabricMat);
    thigh.position.y = -0.21;
    thigh.castShadow = true;
    thigh.receiveShadow = true;
    hipPivot.add(thigh);

    const kneePivot = new THREE.Group();
    kneePivot.position.set(0, -0.42, 0);
    hipPivot.add(kneePivot);

    const calfGeo = trackGeo(new THREE.CylinderGeometry(0.064, 0.072, 0.4, 24));
    const calf = new THREE.Mesh(calfGeo, bottomFabricMat);
    calf.position.y = -0.2;
    calf.castShadow = true;
    calf.receiveShadow = true;
    kneePivot.add(calf);

    // Sculpted Platform Chelsea Boot / Sneaker (Bottom of sole is -0.52 relative to kneePivot => 0.94 - 0.42 - 0.52 = 0.00!)
    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.45, 0.028);
    kneePivot.add(footGroup);

    const bootShaft = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.044, 0.046, 0.14, 20)),
      leatherMat,
    );
    bootShaft.position.set(0, 0.03, -0.028);
    bootShaft.castShadow = true;
    footGroup.add(bootShaft);

    const vamp = new THREE.Mesh(
      trackGeo(new THREE.CapsuleGeometry(0.041, 0.095, 8, 16)),
      leatherMat,
    );
    vamp.rotation.x = Math.PI / 2;
    vamp.position.set(0, -0.025, 0.015);
    vamp.scale.set(0.96, 1, 0.72);
    vamp.castShadow = true;
    footGroup.add(vamp);

    const sole = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.088, 0.034, 0.21)),
      soleMat,
    );
    sole.position.set(0, -0.053, 0.015);
    sole.castShadow = true;
    footGroup.add(sole);

    return { hipPivot, kneePivot, thigh, calf, bootShaft, vamp };
  };

  const leftLeg = createLeg(-1);
  const rightLeg = createLeg(1);

  const setStyle = (outfit: OutfitStyle, colorway: ColorwayId) => {
    const palette = PALETTES[colorway];

    outerFabricMat.color.setHex(palette.outer);
    bottomFabricMat.color.setHex(palette.bottom);
    innerKnitMat.color.setHex(palette.inner);
    leatherMat.color.setHex(palette.leather);
    soleMat.color.setHex(palette.sole);
    metalMat.color.setHex(palette.metal);
    accentMat.color.setHex(palette.accent);

    trenchGroup.visible = outfit === 'trench';
    midiGroup.visible = outfit === 'midi';
    streetGroup.visible = outfit === 'street';

    // In Midi Chic, upper sleeves become fine-ribbed knitwear; lower legs show sleek knee-high leather boots!
    const sleeveMaterial = outfit === 'midi' ? innerKnitMat : outerFabricMat;
    leftArm.upperArm.material = sleeveMaterial;
    leftArm.forearm.material = sleeveMaterial;
    rightArm.upperArm.material = sleeveMaterial;
    rightArm.forearm.material = sleeveMaterial;

    const legMaterial = outfit === 'midi' ? leatherMat : bottomFabricMat;
    leftLeg.thigh.material = outfit === 'midi' ? skinMat : bottomFabricMat;
    rightLeg.thigh.material = outfit === 'midi' ? skinMat : bottomFabricMat;
    leftLeg.calf.material = legMaterial;
    rightLeg.calf.material = legMaterial;

    // Sneakers use contrast light soles in Street Layer
    if (outfit === 'street') {
      soleMat.color.setHex(0xf4efe6);
    }
  };

  // Initialize default outfit
  setStyle('trench', 'espresso');

  return {
    root,
    figureRoot,
    torsoPivot,
    headPivot,
    leftArmPivot: leftArm.shoulderPivot,
    rightArmPivot: rightArm.shoulderPivot,
    leftForearmPivot: leftArm.elbowPivot,
    rightForearmPivot: rightArm.elbowPivot,
    leftLegPivot: leftLeg.hipPivot,
    rightLegPivot: rightLeg.hipPivot,
    leftKneePivot: leftLeg.kneePivot,
    rightKneePivot: rightLeg.kneePivot,
    hemFlowGroup,
    bagSwingGroup,
    setStyle,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
    },
  };
}
