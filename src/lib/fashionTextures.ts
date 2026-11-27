import * as THREE from 'three';

export interface ProceduralTextureSet {
  twillColor: THREE.CanvasTexture;
  twillBump: THREE.CanvasTexture;
  knitBump: THREE.CanvasTexture;
  denimColor: THREE.CanvasTexture;
  leatherBump: THREE.CanvasTexture;
  plinthMarble: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('2D canvas context unavailable');
  }
  return [canvas, ctx];
}

export function createFashionTextureSet(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Tailored Wool Twill Color + Micro-Bump
  const [twillCanvas, twillCtx] = makeCanvas(256, 256);
  twillCtx.fillStyle = '#e8e4de';
  twillCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    for (let x = 0; x < 256; x += 2) {
      const diag = (x + y) % 8 === 0;
      const shade = diag ? 214 : ((x * 7 + y * 13) % 14) + 232;
      twillCtx.fillStyle = `rgb(${shade}, ${shade - 2}, ${shade - 5})`;
      twillCtx.fillRect(x, y, 2, 2);
    }
  }
  const twillColor = new THREE.CanvasTexture(twillCanvas);
  twillColor.colorSpace = THREE.SRGBColorSpace;
  twillColor.wrapS = THREE.RepeatWrapping;
  twillColor.wrapT = THREE.RepeatWrapping;
  twillColor.repeat.set(4, 4);
  twillColor.anisotropy = maxAnisotropy;

  const [twillBumpCanvas, twillBumpCtx] = makeCanvas(256, 256);
  twillBumpCtx.fillStyle = '#808080';
  twillBumpCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    for (let x = 0; x < 256; x += 2) {
      const v = (x + y) % 6 === 0 ? 175 : 108;
      twillBumpCtx.fillStyle = `rgb(${v},${v},${v})`;
      twillBumpCtx.fillRect(x, y, 2, 2);
    }
  }
  const twillBump = new THREE.CanvasTexture(twillBumpCanvas);
  twillBump.wrapS = THREE.RepeatWrapping;
  twillBump.wrapT = THREE.RepeatWrapping;
  twillBump.repeat.set(6, 6);
  twillBump.anisotropy = maxAnisotropy;

  // 2. Ribbed Merino Knit Bump
  const [knitCanvas, knitCtx] = makeCanvas(256, 256);
  knitCtx.fillStyle = '#808080';
  knitCtx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 8) {
    const grad = knitCtx.createLinearGradient(x, 0, x + 8, 0);
    grad.addColorStop(0, '#555555');
    grad.addColorStop(0.5, '#dcdcdc');
    grad.addColorStop(1, '#555555');
    knitCtx.fillStyle = grad;
    knitCtx.fillRect(x, 0, 8, 256);
  }
  knitCtx.fillStyle = 'rgba(0,0,0,0.08)';
  for (let y = 0; y < 256; y += 6) {
    knitCtx.fillRect(0, y, 256, 2);
  }
  const knitBump = new THREE.CanvasTexture(knitCanvas);
  knitBump.wrapS = THREE.RepeatWrapping;
  knitBump.wrapT = THREE.RepeatWrapping;
  knitBump.repeat.set(5, 4);
  knitBump.anisotropy = maxAnisotropy;

  // 3. Japanese Selvedge / Structured Woven Albedo
  const [denimCanvas, denimCtx] = makeCanvas(256, 256);
  denimCtx.fillStyle = '#dedad3';
  denimCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 2) {
    for (let x = 0; x < 256; x += 2) {
      const warp = (x + y * 2) % 6 === 0;
      const speck = ((x * 19 + y * 31) % 17) - 8;
      const base = (warp ? 204 : 232) + speck;
      denimCtx.fillStyle = `rgb(${base}, ${base}, ${base + 2})`;
      denimCtx.fillRect(x, y, 2, 2);
    }
  }
  const denimColor = new THREE.CanvasTexture(denimCanvas);
  denimColor.colorSpace = THREE.SRGBColorSpace;
  denimColor.wrapS = THREE.RepeatWrapping;
  denimColor.wrapT = THREE.RepeatWrapping;
  denimColor.repeat.set(4, 4);
  denimColor.anisotropy = maxAnisotropy;

  // 4. Full-Grain Pebbled Leather Bump
  const [leatherCanvas, leatherCtx] = makeCanvas(256, 256);
  leatherCtx.fillStyle = '#848484';
  leatherCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1600; i++) {
    const px = (i * 73) % 256;
    const py = (i * 137) % 256;
    const r = 1.4 + (i % 3) * 0.6;
    const tone = i % 2 === 0 ? 156 : 106;
    leatherCtx.fillStyle = `rgb(${tone},${tone},${tone})`;
    leatherCtx.beginPath();
    leatherCtx.arc(px, py, r, 0, Math.PI * 2);
    leatherCtx.fill();
  }
  const leatherBump = new THREE.CanvasTexture(leatherCanvas);
  leatherBump.wrapS = THREE.RepeatWrapping;
  leatherBump.wrapT = THREE.RepeatWrapping;
  leatherBump.repeat.set(3, 3);
  leatherBump.anisotropy = maxAnisotropy;

  // 5. Travertine Stone Plinth Texture
  const [marbleCanvas, marbleCtx] = makeCanvas(512, 512);
  marbleCtx.fillStyle = '#EFE5D6';
  marbleCtx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 42; i++) {
    const y = (i * 19) % 512;
    marbleCtx.strokeStyle = i % 3 === 0 ? 'rgba(182, 160, 134, 0.28)' : 'rgba(255, 253, 249, 0.42)';
    marbleCtx.lineWidth = 1.5 + (i % 4);
    marbleCtx.beginPath();
    marbleCtx.moveTo(0, y);
    marbleCtx.bezierCurveTo(160, y + ((i % 5) - 2) * 8, 340, y - ((i % 4) - 1.5) * 9, 512, y + 3);
    marbleCtx.stroke();
  }
  const plinthMarble = new THREE.CanvasTexture(marbleCanvas);
  plinthMarble.colorSpace = THREE.SRGBColorSpace;
  plinthMarble.anisotropy = maxAnisotropy;

  // 6. Soft Radial Contact Shadow
  const [shadowCanvas, shadowCtx] = makeCanvas(256, 256);
  const grad = shadowCtx.createRadialGradient(128, 128, 12, 128, 128, 124);
  grad.addColorStop(0, 'rgba(44, 26, 18, 0.55)');
  grad.addColorStop(0.55, 'rgba(44, 26, 18, 0.22)');
  grad.addColorStop(1, 'rgba(44, 26, 18, 0)');
  shadowCtx.fillStyle = grad;
  shadowCtx.fillRect(0, 0, 256, 256);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  const all = [
    twillColor,
    twillBump,
    knitBump,
    denimColor,
    leatherBump,
    plinthMarble,
    contactShadow,
  ];

  return {
    twillColor,
    twillBump,
    knitBump,
    denimColor,
    leatherBump,
    plinthMarble,
    contactShadow,
    dispose: () => {
      all.forEach((tex) => tex.dispose());
    },
  };
}
