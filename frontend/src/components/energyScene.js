import * as THREE from 'three';

// Keep the xiangmu scene in sync while using the project's local Three.js runtime.
export function mountEnergyScene(stage, hit, onStatus = () => {}) {
  const scene = createEnergyScene(stage, THREE, onStatus);
  return Object.assign(() => scene.dispose(), scene);
}
export function createEnergyScene(stage, T, onStatus) {
  const root = stage.closest('.energy-login');
  const hit = stage.querySelector('.ec-core-hit');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  let reducedMotion = motionPreference.matches;
  const settings = {
    motion: !reducedMotion,
    paused: false,
    focused: false,
    busy: false,
    accent: '#64f4e2',
    speed: 1,
  };
  let time = 0;
  let pulseStart = -100;
  let pulsePower = 0;
  let renderer;
  let scene;
  let camera;
  let world;
  let coreMaterial;
  let accentMaterial;
  let clockLast = 0;
  let frameId = null;
  let uniforms;
  let tx = 0;
  let ty = 0;
  let pulseCount = 0;
  let suppressPulse = false;
  let disposed = false;
  let ro;
  let wake = () => {};
  let resetView = () => {};
  let stopMotion = () => {};
  let completionTimer;
  let finishCompletion;
  let completionPromise;
  let completionStart = null;
  let completionFrames = 0;
  const ownedResources = new Set();
  const listeners = [];

  function listen(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    listeners.push(() => target.removeEventListener(event, handler, options));
  }

  function applySettings() {
    if (uniforms) uniforms.uColor.value.set(settings.accent);
    if (accentMaterial) accentMaterial.color.set(settings.accent);
  }

  function pulse() {
    if (disposed || completionPromise) return;
    stage.dataset.pulse = String(++pulseCount);
    onStatus(reducedMotion || settings.paused ? '能量已连接' : '能量脉冲已激活');
    if (settings.motion && !settings.paused) {
      pulseStart = performance.now() / 1000;
      pulsePower = 1;
      wake();
    }
  }

  function describeMotion() {
    stage.dataset.motion = reducedMotion
      ? 'reduced'
      : settings.paused
        ? 'paused'
        : completionStart !== null
          ? 'gathering'
          : settings.busy
            ? 'authenticating'
            : settings.focused
              ? 'focused'
              : 'running';
    stage.dataset.speed = String(settings.focused || settings.busy ? 0.18 : 1);
  }

  function setPaused(value) {
    if (disposed) return;
    settings.paused = value;
    if (value) stopMotion();
    describeMotion();
    onStatus(value ? '动效已暂停' : '能量场已就绪');
    wake(value ? 0 : 320);
  }

  function setFocused(value) {
    if (disposed || completionPromise) return;
    settings.focused = value;
    tx = ty = 0;
    describeMotion();
    wake();
  }

  function setBusy(value) {
    if (disposed || completionPromise) return;
    settings.busy = value;
    describeMotion();
    if (value) onStatus('正在验证 · 安全连接');
    else onStatus('能量场已就绪');
    wake();
  }

  function settleCompletion() {
    if (!finishCompletion) return;
    clearTimeout(completionTimer);
    const resolve = finishCompletion;
    finishCompletion = null;
    completionPromise = null;
    completionStart = null;
    stage.dataset.transition = 'complete';
    resolve();
  }

  function complete() {
    if (completionPromise) return completionPromise;
    settings.busy = false;
    if (disposed || document.hidden || reducedMotion || settings.paused) return Promise.resolve();
    stopMotion();
    settings.focused = false;
    completionStart = performance.now();
    completionFrames = 0;
    stage.dataset.transition = 'gathering';
    describeMotion();
    onStatus('验证通过 · 能量汇聚中');
    completionPromise = new Promise((resolve) => {
      finishCompletion = resolve;
      // Normal navigation resolves after the final rendered frames, not a short delay.
      // A stalled/lost renderer must never block an authenticated user indefinitely.
      completionTimer = setTimeout(settleCompletion, 2000);
    });
    wake();
    return completionPromise;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameId);
    settleCompletion();
    if (ro) ro.disconnect();
    listeners.forEach((remove) => remove());
    const resources = new Set(ownedResources);
    if (scene) {
      scene.traverse((object) => {
        if (object.geometry) resources.add(object.geometry);
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.filter(Boolean).forEach((material) => {
          resources.add(material);
          Object.values(material).forEach((value) => {
            if (value && value.isTexture) resources.add(value);
          });
        });
      });
    }
    resources.forEach((resource) => resource.dispose());
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    }
    stage.classList.remove('ec-ready');
  }
  listen(hit, 'click', (event) => {
    if (event.detail === 0 || !suppressPulse) pulse();
  });
  function initialize() {
    renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'default',
    });
    renderer.setClearColor(0, 0);
    renderer.outputColorSpace = T.SRGBColorSpace;
    renderer.toneMapping = T.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    stage.appendChild(renderer.domElement);
    scene = new T.Scene();
    // Small local studio reflections keep the metal readable without an HDR download.
    const faces = Array.from({ length: 6 }, (_, i) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 64;
      const context = canvas.getContext('2d');
      const gradient = context.createLinearGradient(0, 0, 64, 64);
      gradient.addColorStop(0, i === 2 ? '#c5e7ed' : '#344e65');
      gradient.addColorStop(0.42, i % 2 ? '#6a9bb0' : '#a5cad7');
      gradient.addColorStop(0.56, '#1a3044');
      gradient.addColorStop(1, '#08131f');
      context.fillStyle = gradient;
      context.fillRect(0, 0, 64, 64);
      return canvas;
    });
    const environment = new T.CubeTexture(faces);
    environment.colorSpace = T.SRGBColorSpace;
    environment.needsUpdate = true;
    const pmrem = new T.PMREMGenerator(renderer);
    try {
      const reflections = pmrem.fromCubemap(environment);
      ownedResources.add(reflections);
      scene.environment = reflections.texture;
    } finally {
      environment.dispose();
      pmrem.dispose();
    }
    camera = new T.PerspectiveCamera(38, 1, 0.1, 80);
    camera.position.set(0, 0.1, 7.7);
    world = new T.Group();
    world.rotation.set(0.1, -0.2, -0.08);
    scene.add(world);
    // Quaternion rotation keeps the assembly freely rotatable without pole limits.
    const viewRotation = world.quaternion.clone();
    const turn = new T.Quaternion();
    const tilt = new T.Quaternion();
    const axis = new T.Vector3();
    const pointers = new Map();
    let velocityX = 0;
    let velocityY = 0;
    let lastMoveAt = 0;
    let pinchDistance = 0;
    let targetZoom = 1;
    let settleUntil = 0;
    let renderedFrames = 0;
    let qualityScale = 1;
    let slowFrames = 0;
    let sampledFrames = 0;
    const canMove = () => settings.motion && !settings.paused;
    wake = (settle = 320) => {
      if (disposed || document.hidden) return;
      settleUntil = Math.max(settleUntil, performance.now() + settle);
      if (frameId === null) {
        clockLast = 0;
        frameId = requestAnimationFrame(animate);
      }
    };
    stopMotion = () => {
      settleUntil = 0;
      velocityX = velocityY = tx = ty = 0;
      pulsePower = 0;
      if (uniforms) uniforms.uPulse.value = 0;
      if (uniforms) uniforms.uGather.value = 0;
      world.scale.setScalar(1);
      core.scale.setScalar(1);
      wire.scale.setScalar(1);
      dust.scale.setScalar(1);
      [orbitA, orbitB, orbitC].forEach((orbit) => orbit.scale.setScalar(1));
      if (aura) aura.material.opacity = 0.16;
      shockwaves.forEach((mesh) => {
        mesh.material.opacity = 0;
      });
      settleCompletion();
    };
    resetView = () => {
      viewRotation.setFromEuler(new T.Euler(0.1, -0.2, -0.08));
      velocityX = velocityY = tx = ty = 0;
      targetZoom = 1;
      wake(650);
    };
    hit.setAttribute(
      'aria-label',
      '拖拽旋转能量装置，滚轮缩放，点击触发能量反馈；方向键旋转，加减键缩放，P暂停或恢复动效，Home恢复视角',
    );

    function rotateView(dx, dy) {
      const length = Math.hypot(dx, dy);
      if (!length) return;
      axis.set(dy / length, dx / length, 0);
      turn.setFromAxisAngle(axis, length);
      viewRotation.premultiply(turn).normalize();
      wake();
    }

    function zoomView(value) {
      targetZoom = Math.max(0.78, Math.min(1.22, value));
      wake(650);
    }
    listen(hit, 'pointerdown', (e) => {
      if (completionPromise) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (!pointers.size) {
        suppressPulse = false;
        velocityX = velocityY = 0;
      }
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
      });
      hit.setPointerCapture(e.pointerId);
      stage.dataset.dragging = 'true';
      lastMoveAt = performance.now();
      if (pointers.size > 1) {
        const p = [...pointers.values()];
        pinchDistance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        suppressPulse = true;
      }
    });
    listen(hit, 'pointermove', (e) => {
      const previous = pointers.get(e.pointerId);
      if (!previous) return;
      const now = performance.now();
      const dt = Math.max(0.008, (now - lastMoveAt) / 1000);
      const dx = e.clientX - previous.x;
      const dy = e.clientY - previous.y;
      if (Math.hypot(e.clientX - previous.startX, e.clientY - previous.startY) > 5)
        suppressPulse = true;
      previous.x = e.clientX;
      previous.y = e.clientY;
      if (pointers.size > 1) {
        const p = [...pointers.values()];
        const distance = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinchDistance > 0) zoomView((targetZoom * distance) / pinchDistance);
        pinchDistance = distance;
        velocityX = velocityY = 0;
      } else if (suppressPulse) {
        const scale = 4.2 / Math.min(stage.clientWidth, stage.clientHeight);
        rotateView(dx * scale, dy * scale);
        velocityX = Math.max(-3, Math.min(3, (dx * scale) / dt));
        velocityY = Math.max(-3, Math.min(3, (dy * scale) / dt));
      }
      lastMoveAt = now;
      wake();
    });

    function releasePointer(e) {
      if (!pointers.has(e.pointerId)) return;
      pointers.delete(e.pointerId);
      pinchDistance = 0;
      if (hit.hasPointerCapture(e.pointerId)) hit.releasePointerCapture(e.pointerId);
      if (e.type === 'pointercancel' || performance.now() - lastMoveAt > 90 || reducedMotion)
        velocityX = velocityY = 0;
      if (e.type === 'pointercancel') suppressPulse = true;
      if (!pointers.size) {
        stage.dataset.dragging = 'false';
      }
      if (suppressPulse) wake();
    }
    listen(hit, 'pointerup', releasePointer);
    listen(hit, 'pointercancel', releasePointer);
    listen(hit, 'lostpointercapture', releasePointer);
    listen(window, 'blur', () => {
      pointers.clear();
      velocityX = velocityY = 0;
      stage.dataset.dragging = 'false';
    });
    listen(
      hit,
      'wheel',
      (e) => {
        e.preventDefault();
        const pixels =
          e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? stage.clientHeight : 1);
        zoomView(targetZoom * Math.exp(-Math.max(-120, Math.min(120, pixels)) * 0.0013));
      },
      {
        passive: false,
      },
    );
    listen(hit, 'keydown', (e) => {
      const step = e.shiftKey ? 0.22 : 0.1;
      if (e.key === 'ArrowLeft') rotateView(-step, 0);
      else if (e.key === 'ArrowRight') rotateView(step, 0);
      else if (e.key === 'ArrowUp') rotateView(0, -step);
      else if (e.key === 'ArrowDown') rotateView(0, step);
      else if (e.key === '+' || e.key === '=') zoomView(targetZoom * 1.08);
      else if (e.key === '-' || e.key === '_') zoomView(targetZoom / 1.08);
      else if (e.key.toLowerCase() === 'p') setPaused(!settings.paused);
      else if (e.key === 'Home') {
        resetView();
      } else return;
      e.preventDefault();
      velocityX = velocityY = 0;
    });

    function updateView(dt) {
      if (canMove() && !pointers.size && Math.hypot(velocityX, velocityY) > 0.002) {
        rotateView(velocityX * dt, velocityY * dt);
        const damping = Math.exp(-5.8 * dt);
        velocityX *= damping;
        velocityY *= damping;
      }
      const parallax =
        pointers.size || !canMove() || settings.focused || settings.busy || completionPromise
          ? 0
          : 1;
      tilt.setFromEuler(new T.Euler(ty * parallax, tx * parallax, 0));
      turn.copy(viewRotation).premultiply(tilt);
      const ease = reducedMotion ? 1 : 1 - Math.exp(-16 * dt);
      world.quaternion.slerp(turn, ease);
      if (Math.abs(targetZoom - camera.zoom) > 0.00001) {
        camera.zoom += (targetZoom - camera.zoom) * (reducedMotion ? 1 : 1 - Math.exp(-12 * dt));
        camera.updateProjectionMatrix();
      }
      stage.dataset.rotation = world.quaternion
        .toArray()
        .map((n) => n.toFixed(4))
        .join(',');
      stage.dataset.zoom = camera.zoom.toFixed(3);
    }
    scene.add(new T.HemisphereLight(0xc2e9ff, 0x142048, 2.3));
    const key = new T.DirectionalLight(0xc3f7ff, 3.2);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new T.PointLight(0x5368ff, 70, 16);
    rim.position.set(2, 1, -2);
    scene.add(rim);
    const cyan = new T.PointLight(0x64ffdd, 26, 12);
    cyan.position.set(-2, -1, 2);
    scene.add(cyan);
    accentMaterial = new T.MeshBasicMaterial({
      color: settings.accent,
      toneMapped: false,
    });
    const blueMat = new T.MeshBasicMaterial({
      color: '#758bff',
      toneMapped: false,
    });
    const metal = new T.MeshStandardMaterial({
      color: '#7195ae',
      metalness: 0.72,
      roughness: 0.26,
      envMapIntensity: 1.1,
    });
    const dark = new T.MeshStandardMaterial({
      color: '#344c65',
      metalness: 0.65,
      roughness: 0.29,
      envMapIntensity: 0.85,
    });
    uniforms = {
      uTime: {
        value: 0,
      },
      uPulse: {
        value: 0,
      },
      uGather: {
        value: 0,
      },
      uColor: {
        value: new T.Color(settings.accent),
      },
    };
    coreMaterial = new T.ShaderMaterial({
      uniforms,
      vertexShader:
        'varying vec3 vP; varying vec3 vN; varying vec3 vV; uniform float uTime; uniform float uPulse; void main(){vP=position; vec3 p=position; float d=sin(p.x*6.0+uTime)*sin(p.y*7.0-uTime*.8)*sin(p.z*5.0+uTime*.5); p+=normal*d*(.012+uPulse*.018); vec4 mv=modelViewMatrix*vec4(p,1.0);vN=normalize(normalMatrix*normal);vV=-mv.xyz;gl_Position=projectionMatrix*mv;}',
      fragmentShader:
        'precision highp float; varying vec3 vP; varying vec3 vN; varying vec3 vV; uniform float uTime; uniform float uPulse; uniform float uGather; uniform vec3 uColor; void main(){vec3 n=normalize(vN);float fres=pow(1.0-abs(dot(n,normalize(vV))),2.1);float lat=asin(clamp(vP.y,-.999,.999));float lon=atan(vP.z,vP.x);float f=sin(lon*7.0+sin(lat*11.0-uTime)*.7+uTime*.5);float g=sin(lat*18.0+sin(lon*6.0+uTime*.7)*1.1);float fil=pow(max(0.0,1.0-abs(f)*1.5),15.0);float fil2=pow(max(0.0,1.0-abs(g)*1.3),20.0);float weave=fil*.32+fil2*.20;float bands=pow(max(0.0,1.0-abs(sin(lat*38.0+uTime*.3))*1.6),9.0)*.035;float l=max(0.0,dot(n,normalize(vec3(-1.0,1.5,2.0))));vec3 base=mix(vec3(.016,.042,.09),uColor*.20,l);vec3 c=base+uColor*(fres*1.05+weave+bands)*(1.0+uPulse*.8);c+=vec3(.18,.32,.60)*pow(l,18.0);c+=mix(uColor,vec3(.78,1.0,1.0),.6)*uGather*.45;gl_FragColor=vec4(c,1.0);}',
    });
    const core = new T.Mesh(new T.SphereGeometry(0.98, 80, 56), coreMaterial);
    world.add(core);
    const wire = new T.Mesh(
      new T.IcosahedronGeometry(1.023, 3),
      new T.MeshBasicMaterial({
        color: '#6ac9d8',
        wireframe: true,
        transparent: true,
        opacity: 0.035,
        depthWrite: false,
      }),
    );
    world.add(wire);

    function torus(radius, tube, material, parent, arc = Math.PI * 2) {
      const mesh = new T.Mesh(new T.TorusGeometry(radius, tube, 10, 144, arc), material);
      parent.add(mesh);
      return mesh;
    }
    const orbitA = new T.Group();
    orbitA.rotation.set(0.84, -0.38, 0.3);
    world.add(orbitA);
    const orbitB = new T.Group();
    orbitB.rotation.set(1.3, 0.93, -0.5);
    world.add(orbitB);
    const orbitC = new T.Group();
    orbitC.rotation.set(-0.4, 0.64, 0.64);
    world.add(orbitC);

    function luminous(radius, color, material, parent, arc = Math.PI * 2) {
      const bright = torus(radius, 0.011, material, parent, arc);
      torus(
        radius,
        0.03,
        new T.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.045,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
        parent,
        arc,
      );
      return bright;
    }
    luminous(1.44, settings.accent, accentMaterial, orbitA, Math.PI * 1.84);
    luminous(1.73, '#758bff', blueMat, orbitB, Math.PI * 1.72);
    luminous(
      1.97,
      '#64baf0',
      new T.MeshBasicMaterial({
        color: '#78bfe3',
        transparent: true,
        opacity: 0.76,
      }),
      orbitC,
      Math.PI * 1.76,
    );
    const rail = torus(1.48, 0.034, metal, orbitA, Math.PI * 1.74);
    rail.rotation.z = 0.12;
    const rail2 = torus(1.77, 0.026, dark, orbitB, Math.PI * 1.74);
    rail2.rotation.z = 0.3;
    for (let i = 0; i < 36; i++) {
      const a = (i * Math.PI * 2) / 36;
      const tick = new T.Mesh(
        new T.BoxGeometry(i % 3 === 0 ? 0.025 : 0.014, i % 3 === 0 ? 0.13 : 0.066, 0.032),
        i % 3 === 0 ? accentMaterial : metal,
      );
      tick.position.set(Math.cos(a) * 1.51, Math.sin(a) * 1.51, 0);
      tick.rotation.z = a - Math.PI / 2;
      orbitA.add(tick);
    }
    for (let i = 0; i < 12; i++) {
      const segment = torus(1.89, 0.052, metal, orbitC, 0.13);
      segment.rotation.z = (i * Math.PI * 2) / 12;
    }
    const lights = [];
    for (let i = 0; i < 6; i++) {
      const bead = new T.Mesh(new T.SphereGeometry(0.026, 10, 8), i % 2 ? blueMat : accentMaterial);
      const parent = i % 2 ? orbitB : orbitA;
      parent.add(bead);
      lights.push({
        mesh: bead,
        parent,
        r: i % 2 ? 1.73 : 1.44,
        a: i * 1.1,
      });
      bead.position.set(
        Math.cos(i * 1.1) * (i % 2 ? 1.73 : 1.44),
        Math.sin(i * 1.1) * (i % 2 ? 1.73 : 1.44),
        0,
      );
    }
    let seed = 2701;

    function rand() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    const dustPositions = [];
    const dustColors = [];
    for (let i = 0; i < 1100; i++) {
      const a = rand() * Math.PI * 2;
      const r = i % 4 ? (i % 2 ? 1.56 : 1.95) + (rand() - 0.5) * 0.16 : 1.3 + rand() * 1.1;
      const y = (rand() - 0.5) * 0.08;
      dustPositions.push(Math.cos(a) * r, y, Math.sin(a) * r);
      const c = new T.Color().setHSL(0.47 + rand() * 0.12, 0.6, 0.4 + rand() * 0.24);
      dustColors.push(c.r, c.g, c.b);
    }
    const dustGeo = new T.BufferGeometry();
    dustGeo.setAttribute('position', new T.Float32BufferAttribute(dustPositions, 3));
    dustGeo.setAttribute('color', new T.Float32BufferAttribute(dustColors, 3));
    const dust = new T.Points(
      dustGeo,
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: T.AdditiveBlending,
        vertexColors: true,
        uniforms: {
          uTime: { value: 0 },
          uPulse: { value: 0 },
          uScale: {
            value: renderer.getPixelRatio(),
          },
        },
        vertexShader:
          'uniform float uScale; uniform float uTime; uniform float uPulse; varying vec3 vColor; void main(){vColor=color;float r=length(position.xz);float a=atan(position.z,position.x)+uTime*(.18+.07/r);vec3 p=vec3(cos(a)*r,position.y,sin(a)*r)*(1.0+uPulse*.09);vec4 mv=modelViewMatrix*vec4(p,1.0);gl_PointSize=clamp(13.0/-mv.z,1.0,3.5)*uScale;gl_Position=projectionMatrix*mv;}',
        fragmentShader:
          'varying vec3 vColor; void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;gl_FragColor=vec4(vColor,pow(1.0-d*2.0,1.6)*.56);}',
      }),
    );
    dust.rotation.set(0.36, -0.2, -0.4);
    world.add(dust);
    const starsPositions = [];
    for (let i = 0; i < 220; i++)
      starsPositions.push((rand() - 0.5) * 18, (rand() - 0.5) * 12, -2 - rand() * 8);
    const starsGeo = new T.BufferGeometry();
    starsGeo.setAttribute('position', new T.Float32BufferAttribute(starsPositions, 3));
    const stars = new T.Points(
      starsGeo,
      new T.PointsMaterial({
        color: '#6a9ec5',
        size: 0.015,
        transparent: true,
        opacity: 0.34,
      }),
    );
    scene.add(stars);
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 128;
    glowCanvas.height = 128;
    const gctx = glowCanvas.getContext('2d');
    const gradient = gctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, '#c0ffffcc');
    gradient.addColorStop(0.12, '#71ffed77');
    gradient.addColorStop(0.4, '#4bcaff22');
    gradient.addColorStop(1, '#418aff00');
    gctx.fillStyle = gradient;
    gctx.fillRect(0, 0, 128, 128);
    const glowMap = new T.CanvasTexture(glowCanvas);

    function sprite(scale, x, y, z, color, opacity) {
      const s = new T.Sprite(
        new T.SpriteMaterial({
          map: glowMap,
          color,
          transparent: true,
          blending: T.AdditiveBlending,
          depthWrite: false,
          opacity,
        }),
      );
      s.scale.set(scale, scale, 1);
      s.position.set(x, y, z);
      world.add(s);
      return s;
    }
    const aura = sprite(5.0, 0, 0, -0.8, 0x348bd9, 0.16);
    sprite(1.0, -1.3, 0.6, 0.5, 0x7affdf, 0.8);
    sprite(0.6, 1.25, -0.9, 0.9, 0x818eff, 0.7);
    sprite(0.4, 0.7, 1.4, 0.6, 0x7afaff, 0.7);
    const shockwaves = [];
    for (let i = 0; i < 2; i++) {
      const mesh = torus(
        1,
        0.007,
        new T.MeshBasicMaterial({
          color: settings.accent,
          transparent: true,
          opacity: 0,
          blending: T.AdditiveBlending,
          depthWrite: false,
        }),
        world,
      );
      mesh.rotation.set(0.15, 0, 0);
      shockwaves.push(mesh);
    }
    const streams = [];
    for (let i = 0; i < 7; i++) {
      const y = (rand() - 0.5) * 7;
      const z = -1.7 - rand() * 2;
      const pts = [
        new T.Vector3(-8, y - 3, z),
        new T.Vector3(-3, y - 1, z + 0.4),
        new T.Vector3(2, y + 1, z),
        new T.Vector3(8, y + 4, z - 0.5),
      ];
      const curve = new T.CatmullRomCurve3(pts);
      const points = curve.getPoints(40);
      const line = new T.Line(
        new T.BufferGeometry().setFromPoints(points),
        new T.LineBasicMaterial({
          color: i % 2 ? '#6594ff' : '#4ddfc7',
          transparent: true,
          opacity: 0.035,
        }),
      );
      scene.add(line);
      const seed = new T.Mesh(new T.SphereGeometry(0.012, 5, 5), i % 2 ? blueMat : accentMaterial);
      scene.add(seed);
      streams.push({
        mesh: seed,
        curve,
        offset: rand(),
      });
    }
    const shards = [];
    for (let i = 0; i < 4; i++) {
      const s = new T.Mesh(new T.OctahedronGeometry(0.04 + rand() * 0.04), i % 2 ? metal : dark);
      const a = rand() * Math.PI * 2;
      const r = 2 + rand() * 0.35;
      s.position.set(Math.cos(a) * r, Math.sin(a) * r, rand() - 0.5);
      world.add(s);
      shards.push(s);
    }
    listen(root, 'pointermove', (e) => {
      if (
        e.pointerType === 'touch' ||
        !canMove() ||
        settings.focused ||
        settings.busy ||
        completionPromise
      )
        return;
      const b = root.getBoundingClientRect();
      tx = ((e.clientX - b.left) / b.width - 0.5) * 0.25;
      ty = ((e.clientY - b.top) / b.height - 0.5) * 0.18;
      wake();
    });
    listen(root, 'pointerleave', () => {
      tx = 0;
      ty = 0;
      if (canMove()) wake();
    });

    function resize() {
      const w = stage.clientWidth;
      const h = stage.clientHeight;
      const lowPower =
        stage.clientWidth < 700 ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
      const budget = Math.sqrt(1500000 / Math.max(1, w * h));
      renderer.setPixelRatio(
        Math.max(0.75, Math.min(devicePixelRatio || 1, lowPower ? 1 : 1.5, budget) * qualityScale),
      );
      renderer.setSize(w, h);
      dust.material.uniforms.uScale.value = renderer.getPixelRatio();
      camera.aspect = w / h;
      camera.position.z = matchMedia('(max-width: 690px)').matches ? 6.6 : 7.7;
      camera.updateProjectionMatrix();
      stage.dataset.quality = renderer.getPixelRatio().toFixed(2);
      wake();
    }
    ro = new ResizeObserver(resize);
    ro.observe(stage);
    resize();
    applySettings();
    describeMotion();
    stage.classList.add('ec-ready');

    function animate(now) {
      frameId = null;
      if (disposed || document.hidden) return;
      const frameDuration = clockLast ? now - clockLast : 16;
      const dt = Math.min(frameDuration / 1000, 0.06);
      clockLast = now;
      const elapsed = now / 1000 - pulseStart;
      updateView(dt);
      if (canMove()) {
        const speed = settings.focused || settings.busy ? 0.18 : settings.speed;
        time += dt * speed;
        core.rotation.y = time * 0.08;
        wire.rotation.y = -time * 0.05;
        orbitA.rotation.z = 0.3 + time * 0.075;
        orbitB.rotation.z = -0.5 - time * 0.05;
        orbitC.rotation.z = 0.64 + time * 0.025;
        lights.forEach((p, i) => {
          const a = time * (0.4 + i * 0.02) + p.a;
          p.mesh.position.set(Math.cos(a) * p.r, Math.sin(a) * p.r, 0);
        });
        streams.forEach((s) =>
          s.mesh.position.copy(s.curve.getPointAt((time * 0.1 + s.offset) % 1)),
        );
        shards.forEach((s, i) => {
          s.rotation.x = time * (i + 1) * 0.03;
          s.rotation.y = time * 0.1;
        });
        uniforms.uTime.value = time;
        dust.material.uniforms.uTime.value = time;
        if (pulsePower) {
          const f = Math.max(0, 1 - elapsed / 1.8);
          uniforms.uPulse.value = Math.sin(Math.min(elapsed / 0.8, 1) * Math.PI) * f;
          world.scale.setScalar(1 + Math.sin(Math.min(elapsed, 1) * Math.PI) * 0.02);
          aura.material.opacity = 0.16 + f * 0.12;
          shockwaves.forEach((r, i) => {
            const p = Math.max(0, (elapsed - i * 0.18) / 1.3);
            r.scale.setScalar(1 + p * 1.4);
            r.material.opacity = p > 0 && p < 1 ? (1 - p) * 0.16 : 0;
          });
          if (elapsed > 1.8) {
            pulsePower = 0;
            uniforms.uPulse.value = 0;
            onStatus('能量场已就绪');
          }
        }
      }
      if (completionStart !== null) {
        const progress = Math.min(1, (now - completionStart) / 900);
        const gather = progress * progress * (3 - 2 * progress);
        core.scale.setScalar(1 + gather * 0.13);
        wire.scale.setScalar(1 + gather * 0.13);
        orbitA.scale.setScalar(1 - gather * 0.22);
        orbitB.scale.setScalar(1 - gather * 0.25);
        orbitC.scale.setScalar(1 - gather * 0.29);
        dust.scale.setScalar(1 - gather * 0.62);
        uniforms.uGather.value = gather;
        uniforms.uPulse.value = gather * 0.55;
        aura.material.opacity = 0.16 + gather * 0.28;
        stage.dataset.gather = gather.toFixed(3);
        completionFrames = progress === 1 ? completionFrames + 1 : 0;
      }
      dust.material.uniforms.uPulse.value = uniforms.uPulse.value;
      renderer.render(scene, camera);
      stage.dataset.frame = String(++renderedFrames);
      stage.dataset.time = time.toFixed(4);
      if (completionFrames >= 2) settleCompletion();
      if (canMove()) {
        // Only downgrade sustained slow rendering; never chase isolated startup frames.
        sampledFrames++;
        if (frameDuration > 34) slowFrames++;
        if (sampledFrames === 90) {
          if (slowFrames > 55 && renderer.getPixelRatio() > 0.8) {
            qualityScale = Math.max(0.65, qualityScale * 0.85);
            resize();
          }
          sampledFrames = slowFrames = 0;
        }
      }
      if (
        canMove() ||
        pointers.size ||
        now < settleUntil ||
        (Math.hypot(velocityX, velocityY) > 0.002 && canMove())
      ) {
        if (frameId === null) frameId = requestAnimationFrame(animate);
      }
    }
    wake();
    listen(motionPreference, 'change', (event) => {
      reducedMotion = event.matches;
      settings.motion = !reducedMotion;
      stopMotion();
      describeMotion();
      wake();
    });
    listen(document, 'visibilitychange', () => {
      cancelAnimationFrame(frameId);
      frameId = null;
      if (document.hidden) settleCompletion();
      if (!document.hidden && !disposed) {
        clockLast = 0;
        wake();
      }
    });
    listen(renderer.domElement, 'webglcontextlost', (event) => {
      event.preventDefault();
      dispose();
      onStatus('能量核心 · 静态展示');
    });
    return {
      available: true,
      pulse,
      setPaused,
      setFocused,
      setBusy,
      reset: () => resetView(),
      complete,
      dispose,
    };
  }
  try {
    return initialize();
  } catch (error) {
    dispose();
    onStatus('能量核心 · 静态展示');
    return {
      available: false,
      pulse: () => {},
      setPaused: () => {},
      setFocused: () => {},
      setBusy: () => {},
      reset: () => {},
      complete: () => Promise.resolve(),
      dispose: () => {},
    };
  }
}
