/**
 * UI controller for the ray tracer
 */

import { RayTracer } from './ray-tracer.js';
import { Vec3 } from './math.js';

// Global variables
let raytracer;
window.isRendering = false;
window.renderCancelled = false;

// Initialize when page loads
window.addEventListener('load', initializeRayTracer);

function initializeRayTracer() {
    console.log('Initializing raytracer...'); // Debug log
    const canvas = document.getElementById('raytracer');
    raytracer = new RayTracer(canvas);
    
    // Register resize handler
    raytracer.onResize((width, height) => {
        updateCanvasDimensions(width, height);
    });
    
    // Setup UI event listeners
    setupControls();
    updateStatus('Ray tracer initialized - Ready to render!');
    console.log('Raytracer initialization complete'); // Debug log
}

function setupControls() {

    

    // Add event listener for debug camera button
    const debugCameraBtn = document.getElementById('debugCameraBtn');
    if (debugCameraBtn) {
        debugCameraBtn.addEventListener('click', () => {
            debugCameraInfo();
        });
    }
    
    // Add event listener for test coordinates button
    const testCoordsBtn = document.getElementById('testCoordsBtn');
    if (testCoordsBtn) {
        testCoordsBtn.addEventListener('click', () => {
            testCameraCoordinates();
        });
    }
    
    // Sync sliders with number inputs
    const controls = [
        'fov', 'aperture', 'focusDist', 'maxBounces', 
        'samples', 'gamma', 'exposure', 'denoiseStrength', 
        'textureScale', 'skyIntensity'
    ];
    
    controls.forEach(control => {
        const slider = document.getElementById(control);
        const numberInput = document.getElementById(control + 'Num');
        
        if (slider && numberInput) {
            slider.addEventListener('input', () => {
                numberInput.value = slider.value;
            });
            
            numberInput.addEventListener('input', () => {
                slider.value = numberInput.value;
            });
        }
    });
    
    // Add event listeners for texture and post-processing controls
    const textureControls = document.getElementById('enableTextures');
    const textureType = document.getElementById('textureType');
    
    if (textureControls) {
        textureControls.addEventListener('change', () => {
            raytracer.enableTextures = textureControls.checked;
            raytracer.refreshScene();
            updateStatus('Textures ' + (textureControls.checked ? 'enabled' : 'disabled'));
        });
    }
    
    if (textureType) {
        textureType.addEventListener('change', () => {
            raytracer.textureType = textureType.value;
            raytracer.refreshScene();
            updateStatus(`Switched to ${textureType.value} texture`);
        });
    }    // Attach button event handlers
    document.getElementById('renderBtn').addEventListener('click', render);
    document.getElementById('cancelBtn').addEventListener('click', cancelRender);
    document.getElementById('loadPresetBtn').addEventListener('click', loadPreset);
    document.getElementById('loadFileBtn').addEventListener('click', loadBlenderScene);
    
    // Preset selector
    const presetSelector = document.getElementById('scenePreset');
    if (presetSelector) {
        presetSelector.addEventListener('change', () => {
            updateStatus(`Selected ${presetSelector.value} scene preset`);
        });
    }
      // Setup file input for Blender scenes
    const fileInput = document.getElementById('sceneFile');
    if (fileInput) {
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                updateStatus(`Selected file: ${file.name}`);
            }
        });
    }
    
    // Camera position selector
    const cameraPositionSelect = document.getElementById('cameraPosition');
    if (cameraPositionSelect) {
        cameraPositionSelect.addEventListener('change', () => {
            changeCameraPosition(cameraPositionSelect.value);
        });
    }
}

function updateStatus(message) {
    document.getElementById('status').textContent = message;
}

function updateProgress(progress) {
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = (progress * 100) + '%';
}

function cancelRender() {
    window.renderCancelled = true;
    updateStatus('Cancelling render...');
}

async function render() {
    if (window.isRendering) return;
    
    console.log('Render function called'); // Debug log
    
    window.isRendering = true;
    window.renderCancelled = false;
    const renderBtn = document.getElementById('renderBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const canvas = document.getElementById('raytracer');
    
    renderBtn.style.display = 'none';
    cancelBtn.style.display = 'block';
    canvas.classList.add('rendering');
    
    const startTime = performance.now();
    
    try {
        // Update camera settings
        raytracer.updateCamera({
            fov: parseFloat(document.getElementById('fov').value),
            aperture: parseFloat(document.getElementById('aperture').value),
            focusDist: parseFloat(document.getElementById('focusDist').value),
            type: document.getElementById('cameraType').value
        });
        
        // Update render settings
        raytracer.updateRenderSettings({
            maxBounces: parseInt(document.getElementById('maxBounces').value),
            samples: parseInt(document.getElementById('samples').value),
            gamma: parseFloat(document.getElementById('gamma').value),
            exposure: parseFloat(document.getElementById('exposure').value),
            toneMapping: document.getElementById('toneMapping').value,
            antiAliasing: document.getElementById('antiAliasing').value,
            denoising: document.getElementById('denoising').checked,
            denoiseStrength: parseFloat(document.getElementById('denoiseStrength').value),
            enableTextures: document.getElementById('enableTextures').checked,
            textureType: document.getElementById('textureType').value,
            textureScale: parseInt(document.getElementById('textureScale').value)
        });
        
        // Update background
        raytracer.updateBackground(
            document.getElementById('backgroundType').value,
            parseFloat(document.getElementById('skyIntensity').value)
        );
        
        updateStatus('🎬 Rendering in progress...');
        console.log('Starting raytracer.render()...'); // Debug log
        
        await raytracer.render((progress) => {
            if (window.renderCancelled) return;
            
            updateProgress(progress);
            const elapsed = (performance.now() - startTime) / 1000;
            const eta = elapsed / progress - elapsed;
            const progressPercent = Math.round(progress * 100);
            
            if (progress < 1.0) {
                updateStatus(`🎬 Rendering: ${progressPercent}% (${elapsed.toFixed(1)}s elapsed, ~${eta.toFixed(1)}s remaining)`);
            }
        });
        
        if (window.renderCancelled) {
            updateStatus('❌ Render cancelled');
        } else {
            const totalTime = (performance.now() - startTime) / 1000;
            updateStatus(`✅ Render complete! (${totalTime.toFixed(1)}s total)`);
        }
        
    } catch (error) {
        updateStatus('❌ Render failed: ' + error.message);
        console.error('Render error:', error);
    } finally {
        window.isRendering = false;
        renderBtn.style.display = 'block';
        cancelBtn.style.display = 'none';
        canvas.classList.remove('rendering');
        if (!window.renderCancelled) {
            updateProgress(0);
        }
    }
}

function loadPreset() {
    const preset = document.getElementById('scenePreset').value;
    raytracer.loadPreset(preset);
    
    // Reset camera position selector to default when loading a new scene
    const cameraPositionSelect = document.getElementById('cameraPosition');
    if (cameraPositionSelect) {
        cameraPositionSelect.value = 'default';
    }
    
    updateStatus(`Loaded ${preset} scene preset`);
}

async function loadBlenderScene() {
    const fileInput = document.getElementById('sceneFile');
    const file = fileInput.files[0];
    
    if (!file) {
        updateStatus('No file selected');
        return;
    }
    
    try {
        updateStatus(`Loading scene from ${file.name}...`);
        
        const json = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(JSON.parse(e.target.result));
            reader.onerror = (e) => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
          raytracer.loadFromJSON(json);
        
        // Update UI with new dimensions (if changed)
        updateCanvasDimensions(raytracer.width, raytracer.height);
        updateStatus(`Loaded scene from ${file.name}`);
    } catch (error) {
        updateStatus(`Error loading scene: ${error.message}`);
        console.error('Scene load error:', error);
    }
}

function updateCanvasDimensions(width, height) {
    // Update UI elements showing dimensions
    const dimensionsDisplay = document.getElementById('canvasDimensions');
    if (dimensionsDisplay) {
        dimensionsDisplay.textContent = `${width}x${height}`;
    }
    
    // Update any width/height inputs if they exist
    const widthInput = document.getElementById('canvasWidth');
    const heightInput = document.getElementById('canvasHeight');
    
    if (widthInput) widthInput.value = width;
    if (heightInput) heightInput.value = height;
    
    // Update the page layout if needed
    updateLayout();
}

function updateLayout() {
    // This function can be expanded to handle layout adjustments
    // when canvas dimensions change
    const canvas = document.getElementById('raytracer');
    const container = canvas.parentElement;
    
    // Make any necessary adjustments to container size
    if (container) {
        container.style.width = `${canvas.width}px`;
        container.style.height = `${canvas.height}px`;
    }
}

/**
 * Debug function to display current camera information
 */
function debugCameraInfo() {
    if (!raytracer || !raytracer.camera) {
        updateStatus('No camera is set up!');
        console.error('No camera found');
        return;
    }
    
    const camera = raytracer.camera;
    const report = camera.debugReport();
    
    // // Create a debug display in the UI
    // const debugDiv = document.createElement('div');
    // debugDiv.className = 'debug-overlay';
    // debugDiv.innerHTML = `
    //     <h3>Camera Debug Information</h3>
    //     <button id="closeDebugBtn">Close</button>
    //     <div class="debug-content">
    //         <p><strong>Position:</strong> ${new Vec3(camera.origin)}</p>
    //         <p><strong>Look Direction:</strong> ${new Vec3(camera.w.mul(-1))}</p>
    //         <p><strong>Up Vector:</strong> ${new Vec3(camera.v)}</p>
    //         <p><strong>Right Vector:</strong> ${new Vec3(camera.u)}</p>
    //         <p><strong>Reconstructed LookAt:</strong> ${new Vec3(report.debug.reconstructedLookAt)}</p>
    //         <p><strong>Lower Left Corner:</strong> ${new Vec3(camera.lowerLeftCorner)}</p>
    //         <p><strong>FOV:</strong> ${camera.fov}°</p>
    //         <p><strong>Focus Distance:</strong> ${camera.focusDist}</p>
    //         <p><strong>Aperture:</strong> ${camera.aperture}</p>
    //         <hr>
    //         <h4>Sample Rays:</h4>
    //         <p>Lower Left: ${new Vec3(report.sampleRays[0].direction)}</p>
    //         <p>Center: ${new Vec3(report.sampleRays[1].direction)}</p>
    //         <p>Lower Right: ${new Vec3(report.sampleRays[2].direction)}</p>
    //         <p>Upper Left: ${new Vec3(report.sampleRays[3].direction)}</p>
    //         <p>Upper Right: ${new Vec3(report.sampleRays[4].direction)}</p>
    //     </div>
    // `;
    
    // // Style the debug overlay
    // debugDiv.style.position = 'fixed';
    // debugDiv.style.top = '50px';
    // debugDiv.style.right = '20px';
    // debugDiv.style.backgroundColor = 'rgba(0,0,0,0.8)';
    // debugDiv.style.color = '#10d5c2';
    // debugDiv.style.padding = '15px';
    // debugDiv.style.borderRadius = '8px';
    // debugDiv.style.zIndex = '1000';
    // debugDiv.style.maxWidth = '400px';
    // debugDiv.style.border = '1px solid #10d5c2';
    
    // document.body.appendChild(debugDiv);
    
    // // Add close button functionality
    // document.getElementById('closeDebugBtn').addEventListener('click', () => {
    //     document.body.removeChild(debugDiv);
    // });
    
    // Also log to console
    console.log('=== CAMERA DEBUG INFORMATION ===');
    console.log('Position:', camera.origin);
    console.log('Look Direction:', camera.w.mul(-1));
    console.log('Up Vector:', camera.v);
    console.log('Right Vector:', camera.u);
    console.log('FOV:', camera.fov);
    console.log('Focus Distance:', camera.focusDist);
    console.log('Aperture:', camera.aperture);
}

/**
 * Test function to load camera from scene data
 */
function loadCameraFromScene() {
    if (!raytracer) {
        updateStatus('Ray tracer not initialized');
        return;
    }
    
    // Example: Load camera from the sample scene data
    const cameraData = {
        position: [0, 2, 3],      // From sample_scene.json
        lookAt: [0, 0, -1],
        up: [0, 1, 0],
        fov: 40,
        aperture: 0.05,
        focusDist: 4.0
    };
    
    raytracer.updateCamera(cameraData);
    updateStatus('Camera loaded from scene data: position [0, 2, 3]');
    console.log('Camera updated with scene data:', cameraData);
}

/**
 * Test function to cycle through camera presets
 */
function cycleCameraPresets() {
    if (!raytracer) {
        updateStatus('Ray tracer not initialized');
        return;
    }
    
    const presets = ['default', 'close-up', 'wide-angle', 'top-down', 'side-view'];
    const currentPreset = window.currentCameraPreset || 0;
    const nextPreset = (currentPreset + 1) % presets.length;
    
    raytracer.loadCameraPreset(presets[nextPreset]);
    window.currentCameraPreset = nextPreset;
    updateStatus(`Camera preset: ${presets[nextPreset]}`);
}

/**
 * Test function to set custom camera position
 */
function setCustomCameraPosition(x, y, z, lookAtX, lookAtY, lookAtZ) {
    if (!raytracer) {
        updateStatus('Ray tracer not initialized');
        return;
    }
    
    const position = [x || 3, y || 2, z || 2];
    const lookAt = [lookAtX || 0, lookAtY || 0, lookAtZ || -1];
    
    raytracer.updateCamera({
        position: position,
        lookAt: lookAt,
        up: [0, 1, 0]
    });
    
    updateStatus(`Camera moved to [${position.join(', ')}] looking at [${lookAt.join(', ')}]`);
    console.log('Camera position updated:', { position, lookAt });
}

/**
 * Change camera position based on selected preset
 */
function changeCameraPosition(position) {
    if (!raytracer) {
        updateStatus('Ray tracer not initialized');
        return;
    }
      const cameraPositions = {
        'default': {
            position: [3, 2, 2],
            lookAt: [0, 0, -1],
            up: [0, 1, 0],
            fov: 45,
            description: 'Default angled view'
        },
        'top': {
            position: [0, 6, 0],
            lookAt: [0, 0, -1],
            up: [0, 0, -1],  // Point camera down with negative Z as up
            fov: 60,
            description: 'Top-down view'
        },
        'front': {
            position: [0, 1, 4],
            lookAt: [0, 0, -1],
            up: [0, 1, 0],
            fov: 50,
            description: 'Front view'
        },
        'side': {
            position: [5, 1, 1],
            lookAt: [0, 0, -1],
            up: [0, 1, 0],
            fov: 45,
            description: 'Side view'
        }
    };
    
    const selectedPosition = cameraPositions[position];
    if (!selectedPosition) {
        updateStatus(`Unknown camera position: ${position}`);
        console.warn(`Camera position '${position}' not found`);
        return;
    }
    
    // Update camera with new position
    raytracer.updateCamera({
        position: selectedPosition.position,
        lookAt: selectedPosition.lookAt,
        up: selectedPosition.up,
        fov: selectedPosition.fov
    });
    
    // Update FOV slider and input to match the new position
    const fovSlider = document.getElementById('fov');
    const fovInput = document.getElementById('fovNum');
    if (fovSlider && fovInput) {
        fovSlider.value = selectedPosition.fov;
        fovInput.value = selectedPosition.fov;
    }
    
    updateStatus(`📸 Camera moved to ${selectedPosition.description}`);
    console.log(`Camera updated to ${position}:`, selectedPosition);
}

// Make the debug function globally accessible
window.debugCameraInfo = debugCameraInfo;

// Export functions needed for HTML buttons
window.render = render;
window.cancelRender = cancelRender;
window.loadPreset = loadPreset;
window.loadBlenderScene = loadBlenderScene;

// Export camera test functions for console access
window.loadCameraFromScene = loadCameraFromScene;
window.cycleCameraPresets = cycleCameraPresets;
window.setCustomCameraPosition = setCustomCameraPosition;
window.changeCameraPosition = changeCameraPosition;
