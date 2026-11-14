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

export function createFan({ canvas, isMobile, reduced }) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: !isMobile,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, isMobile ? 1.25 : 1.75));
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
  key.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
  key.shadow.bias = -0.0006;
  key.shadow.radius = 5;
  key.shadow.normalBias = 0.02;
  const rim = new THREE.PointLight(0x4d86ff, 25, 0, 2);
  rim.position.set(4, 3, -3);
  fan.add(key, key.target, rim);

  // wall: invisible except for the soft shadow of the guard and blades
  const wall = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 60),
    new THREE.ShadowMaterial({ color: 0x0a1740, opacity: 0.24 })
  );
  wall.position.z = WALL_Z;
  wall.receiveShadow = true;
  fan.add(wall);

  const plastic = new THREE.MeshPhysicalMaterial({
    color: 0x7d8cb8, roughness: 0.55, metalness: 0.05,
    clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide,
  });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9ba8cf, roughness: 0.5, metalness: 0.35 });
  const blue = new THREE.MeshPhysicalMaterial({
    color: 0x5b86ff, roughness: 0.45, metalness: 0.05,
    clearcoat: 0.3, clearcoatRoughness: 0.5, side: THREE.DoubleSide,
  });
  const bladeMat = new THREE.MeshPhysicalMaterial({
    color: 0x62729f, roughness: 0.6, metalness: 0.05,
    clearcoat: 0.15, clearcoatRoughness: 0.6, side: THREE.DoubleSide,
  });

  const castAll = (o) => o.traverse((m) => { if (m.isMesh) m.castShadow = true; });

  // stand: runs straight down from behind the head and out of the hero
  const stand = new THREE.Group();
  stand.position.z = -0.6;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 14, 20), steel);
  pole.position.y = -7.35;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.26, 24), plastic);
  collar.position.y = -1.6;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16), plastic);
  joint.position.y = -0.36;
  stand.add(pole, collar, joint);
  stand.visible = !isMobile; // on phones the fan floats, no pole through the content
  fan.add(stand);

  const head = new THREE.Group();
  fan.add(head);

  const housing = new THREE.Mesh(
    new THREE.LatheGeometry(
      pts([[0, -1.22], [0.22, -1.2], [0.4, -1.12], [0.54, -0.98], [0.61, -0.8], [0.62, -0.6], [0.6, -0.38], [0.54, -0.2], [0.46, -0.1], [0.38, -0.04], [0.34, -0.02], [0, -0.02]]),
      48
    ).rotateX(Math.PI / 2),
    plastic
  );
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.028, 8, 48), blue);
  trim.position.z = -0.1;
  for (const sx of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 20).rotateZ(Math.PI / 2), blue);
    knob.position.set(sx * 0.64, 0, -0.6);
    head.add(knob);
  }
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.5, 12).rotateX(Math.PI / 2), steel);
  shaft.position.z = 0.2;
  head.add(housing, trim, shaft);

  function makeBlade() {
    const g = new THREE.PlaneGeometry(1, 1, 22, 6);
    const p = g.attributes.position;
    const r0 = 0.2;
    const r1 = 1.6;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) + 0.5;
      const v = p.getY(i);
      let w;
      if (u < 0.72) w = 0.2 + 0.46 * Math.sin((Math.PI / 2) * (u / 0.72));
      else {
        const k = (u - 0.72) / 0.28;
        w = 0.66 * Math.sqrt(Math.max(0, 1 - k * k));
      }
      const twist = 0.75 - 0.5 * u;
      const yy = (v + 0.1 * Math.sin(Math.PI * u)) * w;
      const x = r0 + u * (r1 - r0);
      const y = yy * Math.cos(twist);
      const z = yy * Math.sin(twist) + v * v * 0.5 * w;
      const sw = 0.3 * u * u;
      p.setXYZ(i, x * Math.cos(sw) - y * Math.sin(sw), x * Math.sin(sw) + y * Math.cos(sw), z);
    }
    g.computeVertexNormals();
    return g;
  }

  const blades = new THREE.Group();
  blades.position.z = 0.06;
  const hub = new THREE.Mesh(
    new THREE.LatheGeometry(pts([[0, -0.14], [0.22, -0.14], [0.3, -0.08], [0.3, 0.1], [0.25, 0.2], [0.14, 0.3], [0, 0.34]]), 32).rotateX(Math.PI / 2),
    blue
  );
  blades.add(hub);
  const bladeGeo = makeBlade();
  for (let i = 0; i < 3; i++) {
    const pivot = new THREE.Group();
    pivot.rotation.z = (i * Math.PI * 2) / 3;
    pivot.add(new THREE.Mesh(bladeGeo, bladeMat));
    blades.add(pivot);
  }
  head.add(blades);

  // soft motion-blur disc that fades in with speed
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.62, 48),
    new THREE.MeshBasicMaterial({ color: 0x1f5bff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  disc.position.z = 0.06;
  head.add(disc);

  const wireR = 0.011;
  const wireGeo = new THREE.CylinderGeometry(wireR, wireR, 1, 6);
  const strutGeo = new THREE.CylinderGeometry(0.026, 0.026, 1, 8);

  function ring(r, z, tube, mat) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, isMobile ? 64 : 128), mat);
    m.position.z = z;
    return m;
  }

  function buildGuard(zC, zR, spokes, radii, rings, offset) {
    const g = new THREE.Group();
    const zAt = (r) => zR + (zC - zR) * (1 - (r / R) * (r / R));
    rings.forEach((r) => g.add(ring(r, zAt(r), wireR, steel)));
    const segs = radii.length - 1;
    const mesh = new THREE.InstancedMesh(wireGeo, steel, spokes * segs);
    mesh.frustumCulled = false;
    let n = 0;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2 + offset;
      for (let s = 0; s < segs; s++) {
        const r1 = radii[s];
        const r2 = radii[s + 1];
        placeWire(
          mesh,
          n++,
          new THREE.Vector3(Math.cos(a) * r1, Math.sin(a) * r1, zAt(r1)),
          new THREE.Vector3(Math.cos(a) * r2, Math.sin(a) * r2, zAt(r2))
        );
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    g.add(mesh);
    return g;
  }

  const front = buildGuard(0.95, 0.28, isMobile ? 16 : 26, [0.22, 0.55, 0.95, 1.35, 1.65, R], [0.55, 0.95, 1.35, 1.65], 0);
  const back = buildGuard(-0.7, -0.28, isMobile ? 10 : 16, [0.62, 0.95, 1.35, 1.65, R], [0.95, 1.35, 1.65], 0.12);
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.07, 32).rotateX(Math.PI / 2), blue);
  badge.position.z = 0.945;
  const badgeRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 8, 32), steel);
  badgeRing.position.z = 0.945;
  head.add(front, back, badge, badgeRing);

  const rimGroup = new THREE.Group();
  rimGroup.add(ring(R, 0.28, 0.05, plastic), ring(R, -0.28, 0.05, plastic));
  const struts = new THREE.InstancedMesh(strutGeo, plastic, 8);
  struts.frustumCulled = false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    placeWire(struts, i, new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, -0.28), new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0.28));
  }
  struts.instanceMatrix.needsUpdate = true;
  rimGroup.add(struts);
  head.add(rimGroup);

  castAll(head);
  castAll(stand);
  disc.castShadow = false;

  const layout = { x: 0, y: 0, r: 0, w: 0, h: 0 };
  const cfg = { y: 0, tilt: 0 };
  const ptr = { x: 0, y: 0 };
  let omega = 0;
  let target = 0;
  let sweep = 0;
  let dirty = true;

  if (!isMobile && !reduced) {
    addEventListener(
      'pointermove',
      (e) => {
        ptr.x = e.clientX / innerWidth - 0.5;
        ptr.y = e.clientY / innerHeight - 0.5;
      },
      { passive: true }
    );
  }

  function render() {
    renderer.render(scene, camera);
  }

  function resize() {
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    const mobile = W < 769;

    // diameter of the guard on screen, and where its centre sits
    let diam, cx, cy;
    if (mobile) {
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

    cfg.y = mobile ? -0.25 : 0;
    cfg.tilt = mobile ? 0.12 : 0;
    dirty = true;
    if (reduced) render();
  }

  function update(dt) {
    omega += (target - omega) * (1 - Math.exp(-dt * (target > omega ? 1.3 : 0.9)));
    if (target === 0 && omega < 0.01) omega = 0;
    blades.rotation.z -= omega * dt;
    disc.material.opacity = Math.min(0.14, (omega / LEVELS[3]) * 0.14);

    // a real fan sweeps slowly side to side while it runs
    sweep += dt * 0.55 * Math.min(1, omega / LEVELS[1]);
    const sweepAmt = Math.sin(sweep) * 0.12 * Math.min(1, omega / LEVELS[1]);

    const dy = cfg.y + ptr.x * 0.12 + sweepAmt - head.rotation.y;
    const dx = cfg.tilt + ptr.y * 0.05 - head.rotation.x;
    const k = Math.min(1, dt * 3);
    head.rotation.y += dy * k;
    head.rotation.x += dx * k;

    if (omega > 0 || Math.abs(dx) + Math.abs(dy) > 0.0004 || dirty) {
      render();
      dirty = false;
    }
  }

  function setLevel(l) {
    target = LEVELS[l];
  }

  // tonal palettes: the fan sits close to the page colour so it blends in instead of fighting the content
  const PAL = {
    light: { plastic: 0x7d8cb8, steel: 0x9ba8cf, blade: 0x62729f, blue: 0x5b86ff, env: 0.7, key: 1.5, rim: 15, shadow: 0.16, shadowColor: 0x1b2c6b },
    dark: { plastic: 0x2a3d78, steel: 0x3a4f98, blade: 0x1a2a5e, blue: 0x4d7bff, env: 0.45, key: 1.2, rim: 40, shadow: 0.4, shadowColor: 0x01051a },
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
  return { layout, update, setLevel, setTheme, resize };
}
