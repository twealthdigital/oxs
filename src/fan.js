import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const LEVELS = [0, 9, 18, 30];
const R = 1.78; // guard radius in world units
const WALL_Z = -2.3; // wall the fan "hangs" in front of, catches the shadows

const Y = new THREE.Vector3(0, 1, 0);
const dummy = new THREE.Object3D();
const tmp = new THREE.Vector3();

function placeWire(mesh, idx, a, b) {
  tmp.subVectors(b, a);
  const len = tmp.length();
  dummy.position.copy(a).addScaledVector(tmp, 0.5);
  dummy.quaternion.setFromUnitVectors(Y, tmp.normalize());
  dummy.scale.set(1, len, 1);
  dummy.updateMatrix();
  mesh.setMatrixAt(idx, dummy.matrix);
}

const pts = (arr) => arr.map(([x, y]) => new THREE.Vector2(x, y));

export function createFan({ canvas, isMobile, reduced, layout: sharedLayout, face = false }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : face ? 1.25 : 1.75));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(20, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  // everything lives in one group that is moved to the fan's screen position
  const fan = new THREE.Group();
  scene.add(fan);

  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(-5, 6, 9);
  key.castShadow = true;
  const sc = key.shadow.camera;
  sc.left = -5.5; sc.right = 5.5; sc.top = 5.5; sc.bottom = -5.5; sc.near = 1; sc.far = 40;
  key.shadow.mapSize.set(isMobile || face ? 1024 : 2048, isMobile || face ? 1024 : 2048);
  key.shadow.bias = -0.0006;
  key.shadow.radius = 5;
  key.shadow.normalBias = 0.02;
  const rim = new THREE.PointLight(0x4d86ff, 25, 0, 2);
  rim.position.set(4, 3, -3);
  const fill = new THREE.HemisphereLight(0xffffff, 0xb4c4f2, 0.8);
  fan.add(key, key.target, rim, fill);

  // wall: invisible except for the soft shadow of the guard and blades
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ color: 0x0a1740, opacity: 0.24 })
  );
  wall.position.z = WALL_Z;
  wall.receiveShadow = true;
  fan.add(wall);

  const plastic = new THREE.MeshPhysicalMaterial({ color: 0xf3f6ff, roughness: 0.32, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.25, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: 0xdde5fa, roughness: 0.35, metalness: 0.2 });
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x1f5bff, roughness: 0.3, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide });
  const bladeMat = new THREE.MeshPhysicalMaterial({ color: 0x2d6bff, roughness: 0.28, metalness: 0, clearcoat: 0.7, clearcoatRoughness: 0.18, side: THREE.DoubleSide });
  const castAll = (o) => o.traverse((m) => { if (m.isMesh) m.castShadow = true; });

  // stand: a thick neck running down and out of the hero
  const stand = new THREE.Group();
  stand.position.z = -0.6;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.27, 14, 40), plastic);
  neck.position.y = -7.35;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 40), blue);
  collar.position.y = -1.7;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.3, 32, 20), plastic);
  joint.position.y = -0.4;
  stand.add(neck, collar, joint);
  stand.visible = !isMobile && !face;
  fan.add(stand);

  // the head sits on a swivel at the top of the stand: it turns about the neck's own axis, like a real oscillating fan
  const PIVOT = new THREE.Vector3(0, -0.4, -0.6);
  const swivel = new THREE.Group();
  swivel.position.copy(PIVOT);
  fan.add(swivel);
  const head = new THREE.Group();
  head.position.copy(PIVOT).negate();
  swivel.add(head);

  const housing = new THREE.Mesh(
    new THREE.LatheGeometry(pts([[0, -1.22], [0.22, -1.2], [0.4, -1.12], [0.54, -0.98], [0.61, -0.8], [0.62, -0.6], [0.6, -0.38], [0.54, -0.2], [0.46, -0.1], [0.38, -0.04], [0.34, -0.02], [0, -0.02]]), 64).rotateX(Math.PI / 2),
    plastic
  );
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 16).rotateX(Math.PI / 2), steel);
  shaft.position.z = 0.2;
  head.add(housing, shaft);

  // swivel socket under the motor housing, directly above the stand's joint
  const yoke = new THREE.Group();
  const socket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.26, 40), blue);
  socket.position.y = -0.2;
  const neckTop = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.32, 40), plastic);
  neckTop.position.y = -0.04;
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.34), plastic);
  bracket.position.y = 0.22;
  yoke.add(socket, neckTop, bracket);
  swivel.add(yoke);

  // smooth paddle blade: broad, rounded tip, gentle pitch and cup, no creases
  function makeBlade() {
    const g = new THREE.PlaneGeometry(1, 1, 48, 18);
    const p = g.attributes.position;
    const r0 = 0.24, r1 = 1.58, Wm = 0.5, Wr = 0.15;
    const sm = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5;
      const v = p.getY(i) * 2;
      const w = u < 0.7 ? Wr + (Wm - Wr) * sm(u / 0.55) : Wm * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.7) / 0.3, 2)));
      const pitch = 0.5 - 0.22 * u;
      const y = v * w;
      const x = r0 + u * (r1 - r0);
      const z = y * Math.sin(pitch) + 0.06 * (1 - v * v) * Math.sin(Math.PI * Math.min(1, u * 1.1));
      const yy = y * Math.cos(pitch);
      const sw = 0.22 * u * u;
      p.setXYZ(i, x * Math.cos(sw) - yy * Math.sin(sw), x * Math.sin(sw) + yy * Math.cos(sw), z);
    }
    g.computeVertexNormals();
    return g;
  }

  const blades = new THREE.Group();
  blades.position.z = 0.06;
  const hub = new THREE.Mesh(new THREE.LatheGeometry(pts([[0, -0.14], [0.26, -0.14], [0.34, -0.06], [0.34, 0.1], [0.28, 0.22], [0.14, 0.32], [0, 0.36]]), 48).rotateX(Math.PI / 2), blue);
  blades.add(hub);
  const bladeGeo = makeBlade();
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI * 2) / 3;
    pivot.add(new THREE.Mesh(bladeGeo, bladeMat));
    blades.add(pivot);
  }
  head.add(blades);

  // faint motion-blur disc that fades in with speed
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.62, 64),
    new THREE.MeshBasicMaterial({ color: 0x2d6bff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  disc.position.z = 0.06;
  head.add(disc);

  // dense guard like a real table fan: many fine radial wires plus concentric rings
  const wireR = 0.0075;
  const wireGeo = new THREE.CylinderGeometry(wireR, wireR, 1, 5);
  const ring = (r, z, tube, mat) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, isMobile ? 96 : 160), mat);
    m.position.z = z;
    return m;
  };
  function buildGuard(zC, zR, spokes, radii, offset) {
    const g = new THREE.Group();
    const zAt = (r) => zR + (zC - zR) * (1 - (r / R) * (r / R));
    radii.slice(0, -1).forEach((r) => g.add(ring(r, zAt(r), wireR * 1.3, steel)));
    const segs = radii.length - 1;
    const mesh = new THREE.InstancedMesh(wireGeo, steel, spokes * segs);
    mesh.frustumCulled = false;
    let n = 0;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + offset;
      for (let s = 0; s < segs; s++) {
        const r1 = radii[s], r2 = radii[s + 1];
        placeWire(mesh, n++, new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, zAt(r1)), new THREE.Vector3(Math.cos(a) * r2, Math.sin(a) * r2, zAt(r2)));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    g.add(mesh);
    return g;
  }
  const front = buildGuard(0.95, 0.28, isMobile ? 40 : 72, [0.4, 0.56, 0.72, 0.88, 1.04, 1.2, 1.36, 1.52, 1.66, R], 0);
  const back = buildGuard(-0.7, -0.28, isMobile ? 18 : 30, [0.62, 0.95, 1.28, 1.6, R], 0.05);
  head.add(front, back);

  // centre cap with a glossy navy "OXs" badge
  const badgeTex = new THREE.CanvasTexture(document.createElement('canvas'));
  badgeTex.colorSpace = THREE.SRGBColorSpace;
  badgeTex.anisotropy = 8;
  function drawBadge() {
    const c = badgeTex.image;
    c.width = c.height = 256;
    const x = c.getContext('2d');
    x.clearRect(0, 0, 256, 256);
    x.fillStyle = '#0a1740';
    x.beginPath();
    x.roundRect(14, 14, 228, 228, 70);
    x.fill();
    const gl = x.createLinearGradient(0, 14, 0, 128);
    gl.addColorStop(0, 'rgba(255,255,255,.28)');
    gl.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = gl;
    x.beginPath();
    x.roundRect(14, 14, 228, 114, [70, 70, 0, 0]);
    x.fill();
    x.fillStyle = '#ffffff';
    x.font = '700 92px Fredoka, ui-rounded, system-ui, sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('OXs', 128, 136);
    badgeTex.needsUpdate = true;
  }
  drawBadge();
  document.fonts.ready.then(() => { drawBadge(); dirty = true; });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.42, 0.1, 64).rotateX(Math.PI / 2), plastic);
  cap.position.z = 0.98;
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), new THREE.MeshPhysicalMaterial({ map: badgeTex, transparent: true, roughness: 0.25, clearcoat: 1 }));
  badge.position.z = 1.034;
  head.add(cap, badge);

  // slim blue rim rings, plus a cage of fine side wires joining the front and back guards all the way round
  const rimGroup = new THREE.Group();
  rimGroup.add(ring(R, 0.28, 0.02, blue), ring(R, -0.28, 0.02, blue));
  const SIDE = isMobile ? 40 : 72;
  const side = new THREE.InstancedMesh(new THREE.CylinderGeometry(wireR * 1.15, wireR * 1.15, 1, 6), steel, SIDE);
  side.frustumCulled = false;
  for (let i = 0; i < SIDE; i++) {
    const a = (i / SIDE) * Math.PI * 2;
    placeWire(side, i, new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, -0.28), new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0.28));
  }
  side.instanceMatrix.needsUpdate = true;
  const struts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.014, 1, 10), blue, 8);
  struts.frustumCulled = false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
    placeWire(struts, i, new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, -0.28), new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0.28));
  }
  struts.instanceMatrix.needsUpdate = true;
  rimGroup.add(side, struts);
  head.add(rimGroup);

  castAll(head);
  castAll(yoke);
  castAll(stand);
  disc.castShadow = false;

  const layout = sharedLayout || { x: 0, y: 0, r: 0, w: 0, h: 0 };
  const cfg = { y: 0, tilt: 0 };
  const ptr = { x: 0, y: 0 };
  let omega = 0;
  let target = 0;
  let hovering = false;
  let sweep = 0;
  let dirty = true;

  // desktop: only hovering the fan itself makes its head follow the cursor; elsewhere it just oscillates
  const YAW_MAX = 0.9;
  if (!isMobile && !reduced && !face) {
    addEventListener(
      'pointermove',
      (e) => {
        const cr = canvas.getBoundingClientRect();
        const dx = e.clientX - (cr.left + layout.x);
        const dy = e.clientY - (cr.top + layout.y);
        const r = layout.r || 1;
        hovering = Math.hypot(dx, dy) < r * 1.05;
        ptr.x = Math.max(-1, Math.min(1, dx / r));
        ptr.y = Math.max(-1, Math.min(1, dy / r));
      },
      { passive: true }
    );
    document.documentElement.addEventListener('pointerleave', () => {
      hovering = false;
    });
  }

  function render() {
    renderer.render(scene, camera);
  }

  function resize() {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    const mobile = !face && W < 769;

    // diameter of the guard on screen, and where its centre sits
    let diam, cx, cy;
    if (face) {
      // face-only copy (FAQ): the head alone, tucked to the right so its breeze can blow left
      diam = Math.min(W, H) * 0.9;
      cx = W / 2;
      cy = H / 2;
    } else if (mobile) {
      diam = W * 2.1; // zoomed right in: mostly just the face
      cx = W * 0.72;
      cy = H * 0.42;
    } else {
      diam = Math.min(H * 1.14, W * 0.66);
      cx = W * 0.5;
      cy = H * 0.5;
    }
    const sPx = diam / (2 * R); // pixels per world unit

    // frame the camera so one world unit is exactly sPx pixels at the fan's depth
    const visH = H / sPx;
    camera.aspect = W / H;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(visH / 2 / camera.position.z));
    camera.updateProjectionMatrix();
    fan.position.set((cx - W / 2) / sPx, (H / 2 - cy) / sPx, 0);

    layout.x = cx;
    layout.y = cy;
    layout.r = diam / 2;
    layout.w = W;
    layout.h = H;

    cfg.y = face ? -0.5 : mobile ? -0.25 : 0; // the face copy looks left, toward the FAQ
    cfg.tilt = face ? 0.04 : mobile ? 0.12 : 0;
    dirty = true;
    if (reduced) render();
  }

  function update(dt) {
    // blades only turn with the speed knob, never from hovering
    omega += (target - omega) * (1 - Math.exp(-dt * (target > omega ? 1.3 : 0.9)));
    if (target === 0 && omega < 0.01) omega = 0;
    blades.rotation.z -= omega * dt;
    disc.material.opacity = Math.min(0.14, (omega / LEVELS[3]) * 0.14);

    // a running fan oscillates side to side; on desktop the swing is wide and slow like a real one
    const run = Math.min(1, omega / LEVELS[1]);
    sweep += dt * (isMobile ? 0.55 : 0.75) * run;
    const sweepAmt = Math.sin(sweep) * (face ? 0.3 : isMobile ? 0.12 : 0.62) * run;

    // hovering the fan makes it look at the cursor; letting go resumes the oscillation
    const wantY = hovering ? ptr.x * YAW_MAX : cfg.y + sweepAmt;
    const wantX = hovering ? cfg.tilt + ptr.y * 0.4 : cfg.tilt;
    const dy = wantY - swivel.rotation.y;
    const dx = wantX - head.rotation.x;
    const k = Math.min(1, dt * (hovering ? 7 : 3));
    swivel.rotation.y += dy * k;
    head.rotation.x += dx * k;

    if (omega > 0 || Math.abs(dx) + Math.abs(dy) > 0.0004 || dirty) {
      render();
      dirty = false;
    }
  }

  // where the fan is pointing, -1 (far left) to 1 (far right); the breeze uses this
  function getFacing() {
    return Math.max(-1, Math.min(1, (swivel.rotation.y - cfg.y) / YAW_MAX));
  }

  function setLevel(l) {
    target = LEVELS[l];
  }

  // tonal palettes: the fan sits close to the page colour so it blends in instead of fighting the content
  const PAL = {
    light: { plastic: 0xf3f6ff, steel: 0xd3ddf7, blade: 0x2d6bff, blue: 0x1f5bff, env: 0.8, key: 1.4, rim: 10, shadow: 0.16, shadowColor: 0x1b2c6b },
    dark: { plastic: 0xa9b8e6, steel: 0x8397d4, blade: 0x2a5ce6, blue: 0x2a5ce6, env: 0.5, key: 1.1, rim: 30, shadow: 0.4, shadowColor: 0x01051a },
  };
  function setTheme(dark) {
    const p = dark ? PAL.dark : PAL.light;
    plastic.color.set(p.plastic);
    steel.color.set(p.steel);
    bladeMat.color.set(p.blade);
    blue.color.set(p.blue);
    scene.environmentIntensity = p.env;
    key.intensity = p.key;
    rim.intensity = p.rim;
    wall.material.opacity = p.shadow;
    wall.material.color.set(p.shadowColor);
    dirty = true;
    if (reduced) render();
  }

  resize();
  setTheme(document.documentElement.dataset.theme === 'dark');
  return { layout, update, setLevel, setTheme, resize, getFacing };
}
