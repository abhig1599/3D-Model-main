// Three.js Scene Setup
let scene, camera, renderer, controls, currentModel;
let outsideModel = null;
let insideModel = null;
let currentView = 'outside';
let modelsLoaded = false;

// Initialize the 3D scene
function initScene() {
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a);
    scene.fog = new THREE.Fog(0x1a1a1a, 100, 1000);

    // Camera
    const canvas = document.getElementById('canvas');
    camera = new THREE.PerspectiveCamera(
        75,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
    );
    camera.position.set(0, 0, 5);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowShadowMap;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 15, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.far = 50;
    scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x667eea, 0.5);
    pointLight.position.set(-10, 5, 10);
    scene.add(pointLight);

    // Simple orbit-like controls
    setupControls();

    // Load 3D models
    loadModels();

    // Event listeners
    setupEventListeners();

    // Animation loop
    animate();
}

// Setup basic controls
function setupControls() {
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };
    let touchStartDistance = 0;

    // Mouse controls
    renderer.domElement.addEventListener('mousedown', (e) => {
        isDragging = true;
        previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    renderer.domElement.addEventListener('mousemove', (e) => {
        if (isDragging && currentModel) {
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;

            currentModel.rotation.y += deltaX * 0.01;
            currentModel.rotation.x += deltaY * 0.01;

            previousMousePosition = { x: e.clientX, y: e.clientY };
        }
    });

    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Mouse wheel zoom
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomSpeed = 0.1;
        if (e.deltaY > 0) {
            camera.position.z += zoomSpeed;
        } else {
            camera.position.z -= zoomSpeed;
        }
        camera.position.z = Math.max(1, Math.min(20, camera.position.z));
    });

    // Touch controls for mobile
    renderer.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
            isDragging = true;
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            // Pinch zoom
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            touchStartDistance = Math.sqrt(dx * dx + dy * dy);
        }
    });

    renderer.domElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1 && isDragging && currentModel) {
            e.preventDefault();
            const deltaX = e.touches[0].clientX - previousMousePosition.x;
            const deltaY = e.touches[0].clientY - previousMousePosition.y;

            currentModel.rotation.y += deltaX * 0.01;
            currentModel.rotation.x += deltaY * 0.01;

            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
            // Pinch zoom
            e.preventDefault();
            const dx = e.touches[0].clientX - e.touches[1].clientX;
            const dy = e.touches[0].clientY - e.touches[1].clientY;
            const touchDistance = Math.sqrt(dx * dx + dy * dy);
            const zoomDelta = touchDistance - touchStartDistance;
            const zoomSpeed = 0.01;

            if (zoomDelta > 0) {
                camera.position.z += zoomSpeed;
            } else {
                camera.position.z -= zoomSpeed;
            }
            camera.position.z = Math.max(1, Math.min(20, camera.position.z));
            touchStartDistance = touchDistance;
        }
    });

    renderer.domElement.addEventListener('touchend', () => {
        isDragging = false;
        touchStartDistance = 0;
    });
}

// Load 3D models from GLB files
function loadModels() {
    const loader = new THREE.GLTFLoader();
    let modelsLoadedCount = 0;
    
    // Load outside model
    loader.load(
        'outside.glb',
        (gltf) => {
            // Load outside view
            outsideModel = gltf.scene;
            outsideModel.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            modelsLoadedCount++;
            if (modelsLoadedCount === 2) {
                onModelsLoaded();
            }
        },
        undefined,
        (error) => {
            console.error('Error loading outside.glb:', error);
            document.getElementById('loading').innerHTML = '<p style="color: #ff6b6b;">Error loading outside model</p>';
        }
    );
    
    // Load inside model (kitchen.glb)
    loader.load(
        'kitchen.glb',
        (gltf) => {
            // Load inside view
            insideModel = gltf.scene;
            insideModel.traverse((node) => {
                if (node.isMesh) {
                    node.castShadow = true;
                    node.receiveShadow = true;
                }
            });
            
            modelsLoadedCount++;
            if (modelsLoadedCount === 2) {
                onModelsLoaded();
            }
        },
        undefined,
        (error) => {
            console.error('Error loading kitchen.glb:', error);
            document.getElementById('loading').innerHTML = '<p style="color: #ff6b6b;">Error loading inside model</p>';
        }
    );
}

// Called when both models are loaded
function onModelsLoaded() {
    // Center and scale both models consistently
    const models = [outsideModel, insideModel];
    
    models.forEach((model) => {
        // Center the model
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);

        // Calculate scale to fit model into a 4-unit sphere
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 4 / maxDim;
        model.scale.multiplyScalar(scale);
    });
    
    // Set initial model (outside)
    currentModel = outsideModel;
    scene.add(currentModel);

    modelsLoaded = true;
    document.getElementById('loading').style.display = 'none';
}

// Setup event listeners for tab buttons
function setupEventListeners() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const view = e.target.dataset.view;
            switchView(view);
        });
    });

    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

// Switch between inside and outside views
function switchView(view) {
    if (currentView === view || !modelsLoaded) return;

    currentView = view;

    // Update active button
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.view === view) {
            btn.classList.add('active');
        }
    });

    // Update title
    const title = view === 'outside' ? 'Outside View' : 'Inside View';
    document.getElementById('view-title').textContent = title;

    // Switch model
    scene.remove(currentModel);
    
    if (view === 'outside') {
        currentModel = outsideModel;
    } else {
        currentModel = insideModel;
    }
    
    scene.add(currentModel);

    // Animation for model appearance (scale in from smaller to normal)
    currentModel.scale.multiplyScalar(0.5);
    animateModelIntro();
}

// Animate model introduction
function animateModelIntro() {
    const targetScale = 1;
    const speed = 0.1;

    const animateScale = () => {
        if (currentModel.scale.x < targetScale) {
            currentModel.scale.addScalar(speed);
            requestAnimationFrame(animateScale);
        }
    };

    animateScale();
}

// Handle window resize
function onWindowResize() {
    const canvas = document.getElementById('canvas');
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Slow auto-rotation when not interacting
    if (currentModel) {
        currentModel.rotation.y += 0.002;
    }

    renderer.render(scene, camera);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    initScene();
});
