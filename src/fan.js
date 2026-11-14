import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export const LEVELS = [0, 9, 18, 30];
const R = 1.78;
const HEAD_Y = 3.1;
const FAN_H = 4.95;
const FAN_W = 3.7;

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

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.95;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-4, 6, 8);
  const rim = new THREE.PointLight(0xff3b30, 140, 0, 2);
  rim.position.set(3, 3, -4);
  scene.add(key, rim);

  const plastic = new THREE.MeshPhysicalMaterial({
    color: 0x101012, roughness: 0.38, metalness: 0.1,
    clearcoat: 1, clearcoatRoughness: 0.18, side: THREE.DoubleSide,
  });
  const steel = new THREE.MeshStandardMaterial({ color: 0xf4f4f6, roughness: 0.28, metalness: 0.95 });
  const red = new THREE.MeshPhysicalMaterial({
    color: 0xe6342b, roughness: 0.3, metalness: 0.05,
    clearcoat: 0.8, clearcoatRoughness: 0.2, side: THREE.DoubleSide,
  });
  const bladeMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.22, metalness: 0,
    clearcoat: 0.6, clearcoatRoughness: 0.2, side: THREE.DoubleSide,
  });

  const fan = new THREE.Group();
  scene.add(fan);
  const head = new THREE.Group();
  head.position.set(0, HEAD_Y, 0.6);
  fan.add(head);

  const seg = isMobile ? 40 : 72;
  const base = new THREE.Mesh(
    new THREE.LatheGeometry(
      pts([[0, 0], [1.38, 0], [1.42, 0.04], [1.42, 0.12], [1.3, 0.2], [1.0, 0.26], [0.6, 0.34], [0.32, 0.5], [0.2, 0.66], [0.13, 0.82], [0.1, 0.92]]),
      seg
    ),
    plastic
  );
  const baseRing = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.025, 8, seg).rotateX(Math.PI / 2), red);
  baseRing.position.y = 0.2;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.9, 20), steel);
  pole.position.y = 1.8;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.26, 24), plastic);
  collar.position.y = 1.5;
  const joint = new THREE.Mesh(new THREE.SphereGeometry(0.21, 24, 16), plastic);
  joint.position.y = 2.74;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.6, 24), plastic);
  neck.position.y = 2.95;
  fan.add(base, baseRing, pole, collar, joint, neck);

  const housing = new THREE.Mesh(
    new THREE.LatheGeometry(
      pts([[0, -1.22], [0.22, -1.2], [0.4, -1.12], [0.54, -0.98], [0.61, -0.8], [0.62, -0.6], [0.6, -0.38], [0.54, -0.2], [0.46, -0.1], [0.38, -0.04], [0.34, -0.02], [0, -0.02]]),
      48
    ).rotateX(Math.PI / 2),
    plastic
  );
  const trim = new THREE.Mesh(new THREE.TorusGeometry(0.455, 0.028, 8, 48), red);
  trim.position.z = -0.1;
  for (const sx of [-1, 1]) {
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 20).rotateZ(Math.PI / 2), red);
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
  blades.name = 'Blades';
  blades.position.z = 0.06;
  const hub = new THREE.Mesh(
    new THREE.LatheGeometry(pts([[0, -0.14], [0.22, -0.14], [0.3, -0.08], [0.3, 0.1], [0.25, 0.2], [0.14, 0.3], [0, 0.34]]), 32).rotateX(Math.PI / 2),
    red
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

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1.62, 48),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  );
  disc.position.z = 0.06;
  head.add(disc);

  const wireGeo = new THREE.CylinderGeometry(0.018, 0.018, 1, 6);
  const strutGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 8);

  function ring(r, z, tube, mat) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 8, isMobile ? 48 : 96), mat);
    m.position.z = z;
    return m;
  }

  function buildGuard(name, zC, zR, spokes, radii, rings, offset) {
    const g = new THREE.Group();
    g.name = name;
    const zAt = (r) => zR + (zC - zR) * (1 - (r / R) * (r / R));
    rings.forEach((r) => g.add(ring(r, zAt(r), 0.018, steel)));
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

  const front = buildGuard('Front_Guard', 0.95, 0.28, isMobile ? 14 : 20, [0.22, 0.55, 0.95, 1.35, 1.65, R], [0.55, 0.95, 1.35, 1.65], 0);
  const back = buildGuard('Back_Guard', -0.7, -0.28, isMobile ? 10 : 14, [0.62, 0.95, 1.35, 1.65, R], [0.95, 1.35, 1.65], 0.12);
  const badge = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.07, 32).rotateX(Math.PI / 2), red);
  badge.position.z = 0.945;
  const badgeRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.02, 8, 32), steel);
  badgeRing.position.z = 0.945;
  head.add(front, back, badge, badgeRing);

  const rimGroup = new THREE.Group();
  rimGroup.name = 'Guard_Rim';
  rimGroup.add(ring(R, 0.28, 0.055, plastic), ring(R, -0.28, 0.055, plastic));
  const struts = new THREE.InstancedMesh(strutGeo, plastic, 8);
  struts.frustumCulled = false;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    placeWire(struts, i, new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, -0.28), new THREE.Vector3(Math.cos(a) * R, Math.sin(a) * R, 0.28));
  }
  struts.instanceMatrix.needsUpdate = true;
  rimGroup.add(struts);
  head.add(rimGroup);

  const layout = { x: 0, y: 0, r: 0, w: 0, h: 0 };
  const cfg = { y: -0.55, tilt: -0.05 };
  const ptr = { x: 0, y: 0 };
  let omega = 0;
  let target = 0;
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
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const h = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const w = h * camera.aspect;
    const mobile = W < 769;

    let heightPx, cx, topPx;
    if (mobile) {
      heightPx = Math.min(H * 0.26, W * 0.6);
      cx = W * 0.74;
      topPx = 66;
    } else {
      topPx = 84;
      const avail = H - topPx - (76 + H * 0.035 + 18);
      heightPx = Math.min(avail, (W * 0.44) / (FAN_W / FAN_H));
      topPx += (avail - heightPx) / 2;
      cx = W * 0.73;
    }

    const pxPerWorld = H / h;
    const sPx = (heightPx * 0.94) / FAN_H;
    const bottomPx = topPx + heightPx * 0.97;
    fan.scale.setScalar(sPx / pxPerWorld);
    fan.position.set((cx / W - 0.5) * w, (0.5 - bottomPx / H) * h, 0);

    layout.x = cx;
    layout.y = bottomPx - HEAD_Y * sPx;
    layout.r = R * sPx;
    layout.w = W;
    layout.h = H;

    cfg.y = mobile ? -0.7 : -0.55;
    cfg.tilt = mobile ? 0.38 : -0.05;
    fan.rotation.y = cfg.y;
    head.rotation.x = cfg.tilt;
    dirty = true;
    if (reduced) render();
  }

  function update(dt) {
    omega += (target - omega) * (1 - Math.exp(-dt * (target > omega ? 1.3 : 0.9)));
    if (target === 0 && omega < 0.01) omega = 0;
    blades.rotation.z -= omega * dt;
    disc.material.opacity = Math.min(0.14, (omega / LEVELS[3]) * 0.14);

    const dy = cfg.y + ptr.x * 0.14 - fan.rotation.y;
    const dx = cfg.tilt + ptr.y * 0.05 - head.rotation.x;
    const k = Math.min(1, dt * 3);
    fan.rotation.y += dy * k;
    head.rotation.x += dx * k;

    if (omega > 0 || Math.abs(dx) + Math.abs(dy) > 0.0004 || dirty) {
      render();
      dirty = false;
    }
  }

  function setLevel(l) {
    target = LEVELS[l];
  }

  resize();
  return { layout, update, setLevel, resize };
}
