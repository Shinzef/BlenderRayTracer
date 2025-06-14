/**
 * UI controller for the ray tracer
 */

import { RayTracer } from './ray-tracer.js';

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
    
    // Setup UI event listeners
    setupControls();
    updateStatus('Ray tracer initialized - Ready to render!');
    console.log('Raytracer initialization complete'); // Debug log
}

function setupControls() {
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
        updateStatus(`Loaded scene from ${file.name}`);
    } catch (error) {
        updateStatus(`Error loading scene: ${error.message}`);
        console.error('Scene load error:', error);
    }
}

// Export functions needed for HTML buttons
window.render = render;
window.cancelRender = cancelRender;
window.loadPreset = loadPreset;
window.loadBlenderScene = loadBlenderScene;
