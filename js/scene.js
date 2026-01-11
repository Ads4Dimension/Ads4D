// scene.js - 3D Model Animation with Cinematic Lighting

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', () => {
    // Get canvas element
    const canvas = document.getElementById('threejs-canvas');
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null; // Transparent background

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
        45,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 1, 5); // Default position

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true // Enable transparency
    });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // ============================================
    // CINEMATIC THREE-POINT LIGHTING SETUP
    // ============================================

    // 1. KEY LIGHT (Main light - bright, slightly warm)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 50;
    scene.add(keyLight);

    // 2. FILL LIGHT (Softer light to fill shadows - cooler tone)
    const fillLight = new THREE.DirectionalLight(0xb3d9ff, 0.6);
    fillLight.position.set(-5, 3, 2);
    scene.add(fillLight);

    // 3. RIM/BACK LIGHT (Edge light for depth - slightly purple/cool)
    const rimLight = new THREE.DirectionalLight(0x9d6fff, 0.8);
    rimLight.position.set(-3, 4, -8);
    scene.add(rimLight);

    // 4. AMBIENT LIGHT (Very subtle overall illumination)
    const ambientLight = new THREE.AmbientLight(0x404060, 0.3);
    scene.add(ambientLight);

    // 5. ACCENT LIGHTS (Optional - adds premium feel)
    const accentLight1 = new THREE.PointLight(0xff6b9d, 0.5, 10);
    accentLight1.position.set(3, 2, -2);
    scene.add(accentLight1);

    const accentLight2 = new THREE.PointLight(0x6b9dff, 0.4, 10);
    accentLight2.position.set(-2, 1, 3);
    scene.add(accentLight2);

    // ============================================
    // MODEL LOADING
    // ============================================

    let model = null;
    let mixer = null;
    let animationAction = null;
    let clock = new THREE.Clock();
    let modelCenter = new THREE.Vector3();

    // GLTF Loader
    const loader = new THREE.GLTFLoader();

    // Load your 3D model
    loader.load(
        './assets/iphoneweb14.glb', // UPDATE THIS to your actual file name
        (gltf) => {
            model = gltf.scene;
            
            // Enable shadows on model and fix texture rendering
            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    
                    // Ensure materials render properly
                    if (child.material) {
                        // Debug: Log material info
                        console.log('Mesh:', child.name);
                        console.log('  Has map texture:', !!child.material.map);
                        if (child.material.map) {
                            console.log('  ✅ TEXTURE FOUND on:', child.name);
                            console.log('  Texture image:', child.material.map.image);
                            console.log('  Texture size:', child.material.map.image?.width, 'x', child.material.map.image?.height);
                            
                            // CRITICAL FIX: Force texture to use UV channel 0
                            child.material.map.channel = 0;
                            
                            // Check which UV attributes are available
                            console.log('  Available UV attributes:');
                            Object.keys(child.geometry.attributes).forEach(key => {
                                if (key.startsWith('uv')) {
                                    console.log('    -', key);
                                }
                            });
                            
                            // Force texture to update and render correctly
                            child.material.map.needsUpdate = true;
                            child.material.map.encoding = THREE.sRGBEncoding;
                            child.material.map.flipY = false;
                            child.material.map.minFilter = THREE.LinearFilter;
                            child.material.map.magFilter = THREE.LinearFilter;
                            
                            // Try to fix UV channel issue by copying uv3 to uv if it exists
                            if (!child.geometry.attributes.uv && child.geometry.attributes.uv3) {
                                console.log('  🔧 Copying UV3 to UV (fixing channel mismatch)');
                                child.geometry.setAttribute('uv', child.geometry.attributes.uv3);
                                child.geometry.attributes.uv.needsUpdate = true;
                            }
                            
                            // Ensure the geometry has proper UVs on channel 0
                            if (child.geometry.attributes.uv) {
                                console.log('  ✅ Has UV coordinates');
                            } else if (child.geometry.attributes.uv2) {
                                console.log('  ⚠️ Only has UV2 - copying to UV');
                                child.geometry.setAttribute('uv', child.geometry.attributes.uv2);
                            } else {
                                console.log('  ❌ No UV coordinates found!');
                            }
                            
                            // If this is the screen, make it bright and clear
                            child.material.metalness = 0.0;
                            child.material.roughness = 0.4;
                            
                            // Make sure material color multiplier is pure white
                            if (child.material.color) {
                                child.material.color.setHex(0xffffff);
                            }
                            
                            // Optional: Make screen glow slightly
                            child.material.emissive.setHex(0x111111);
                            child.material.emissiveIntensity = 0.2;
                        }
                        
                        // Ensure proper material settings
                        child.material.needsUpdate = true;
                        child.material.side = THREE.DoubleSide;
                        
                        // If material has emissive map, it might be your screen
                        if (child.material.emissiveMap) {
                            console.log('  Has emissive map on:', child.name);
                            child.material.emissiveMap.needsUpdate = true;
                            child.material.emissiveMap.encoding = THREE.sRGBEncoding;
                            child.material.emissiveIntensity = 1.0;
                        }
                    }
                }
            });

            scene.add(model);

            // Calculate model center and bounds for proper camera positioning
            const box = new THREE.Box3().setFromObject(model);
            box.getCenter(modelCenter);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            // Auto-adjust camera based on model size
            const fov = camera.fov * (Math.PI / 180);
            let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
            cameraZ *= 2.2; // Increased from 1.5 to give more space and prevent clipping

            // Use exported camera if available, otherwise use auto-calculated
            if (gltf.cameras && gltf.cameras.length > 0) {
                const exportedCamera = gltf.cameras[0];
                camera.position.copy(exportedCamera.position);
                camera.rotation.copy(exportedCamera.rotation);
                camera.fov = exportedCamera.fov;
                camera.updateProjectionMatrix();
            } else {
                camera.position.set(modelCenter.x, modelCenter.y + maxDim * 0.3, modelCenter.z + cameraZ);
                camera.lookAt(modelCenter);
            }
            
            // Adjust camera near/far planes to prevent clipping
            camera.near = 0.01;
            camera.far = 1000;
            camera.updateProjectionMatrix();

            // Handle animations
            if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);
                animationAction = mixer.clipAction(gltf.animations[0]);
                animationAction.setLoop(THREE.LoopOnce);
                animationAction.clampWhenFinished = true;
                animationAction.play();
                
                console.log('Animation loaded:', gltf.animations[0].name, 'Duration:', gltf.animations[0].duration);
            }

            console.log('✅ Model loaded successfully');
            console.log('Model bounds:', size);
            console.log('Cameras found:', gltf.cameras ? gltf.cameras.length : 0);
            console.log('Animations found:', gltf.animations ? gltf.animations.length : 0);
        },
        (progress) => {
            const percentComplete = (progress.loaded / progress.total) * 100;
            console.log(`Loading: ${percentComplete.toFixed(2)}%`);
        },
        (error) => {
            console.error('❌ Error loading model:', error);
        }
    );

    // ============================================
    // WINDOW RESIZE HANDLER
    // ============================================

    function onWindowResize() {
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    window.addEventListener('resize', onWindowResize);

    // ============================================
    // SCROLL-DRIVEN ANIMATION
    // ============================================

    function handleScroll() {
        if (!mixer || !animationAction) return;

        const showcaseSection = document.querySelector('.showcase-3d');
        if (!showcaseSection) return;

        const rect = showcaseSection.getBoundingClientRect();
        const sectionHeight = rect.height;
        const windowHeight = window.innerHeight;
        
        // Start animation earlier - when section enters viewport
        const scrollStart = windowHeight * 0.8;
        const adjustedTop = rect.top - scrollStart;
        
        // Calculate scroll progress (0 to 1)
        const scrollProgress = Math.max(0, Math.min(1, -adjustedTop / (sectionHeight + scrollStart)));

        // Map scroll progress to animation time
        const duration = animationAction.getClip().duration;
        const targetTime = scrollProgress * duration;
        
        // CRITICAL FIX: Reset the action if we're scrolling back into view
        // This allows the animation to work again after scrolling past the section
        if (animationAction.paused || animationAction.time === duration) {
            animationAction.paused = false;
            animationAction.enabled = true;
            animationAction.reset();
            animationAction.play();
        }
        
        // Set animation to specific time
        mixer.setTime(targetTime);
    }

    window.addEventListener('scroll', handleScroll, { passive: true });

    // ============================================
    // ANIMATION LOOP
    // ============================================

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();

        // Uncomment these lines for auto-playing animation instead of scroll-driven
        // if (mixer) {
        //     mixer.update(delta);
        // }

        renderer.render(scene, camera);
    }

    // Start animation loop
    animate();

    // Initial scroll check
    handleScroll();

    console.log('🎬 Three.js scene initialized');
});