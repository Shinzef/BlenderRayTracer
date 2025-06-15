/**
 * Main ray tracer class
 */

import { Vec3 } from './math.js';
import { World } from './world.js';
import { Sphere, Plane, Box, Triangle, TriangleMesh } from './geometry.js';
import { Lambertian, Metal, Dielectric, Emissive } from './materials.js';
import { PointLight, DirectionalLight } from './lights.js';
import { SolidColor, CheckerTexture, NoiseTexture, MarbleTexture, WoodTexture } from './textures.js';
import { PostProcessor } from './post-processor.js';
import { Camera } from './camera.js';
import { SceneLoader } from './scene-loader.js';

class RayTracer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        this.imageData = this.ctx.createImageData(this.width, this.height);
        
        this.maxBounces = 5;
        this.samples = 4;
        this.gamma = 2.2;
        this.exposure = 1.0;
        this.toneMapping = 'reinhard';
        this.antiAliasing = 'supersampling';
        this.denoising = false;
        this.denoiseStrength = 0.5;
        this.enableTextures = true;
        this.textureType = 'checkerboard';
        this.textureScale = 10;
        
        // Initialize world
        this.world = new World();
        this.camera = null;
        
        this.setupDefaultScene();
    }
    
    setupDefaultScene() {
        // Simple default scene for debugging
        const red = new Lambertian(new Vec3(0.7, 0.3, 0.3));
        const green = new Lambertian(new Vec3(0.3, 0.7, 0.3));
        const blue = new Lambertian(new Vec3(0.3, 0.3, 0.7));
        const metal = new Metal(new Vec3(0.8, 0.8, 0.9), 0.1);
        const glass = new Dielectric(1.5);
        const light = new Emissive(new Vec3(1, 1, 1), 5);
        
        // Ground plane
        this.world.add(new Plane(new Vec3(0, -0.5, 0), new Vec3(0, 1, 0), 
            new Lambertian(new Vec3(0.5, 0.5, 0.5))));
        
        // Simple spheres
        this.world.add(new Sphere(new Vec3(0, 0, -1), 0.5, red));
        this.world.add(new Sphere(new Vec3(-1, 0, -1), 0.5, glass));
        this.world.add(new Sphere(new Vec3(1, 0, -1), 0.5, metal));
        this.world.add(new Sphere(new Vec3(0, 1.5, -1), 0.3, light));
        
        // Lights
        this.world.addLight(new PointLight(new Vec3(2, 2, 0), new Vec3(1, 1, 1), 10));
        this.world.addLight(new DirectionalLight(new Vec3(-1, -1, -1), new Vec3(1, 0.9, 0.8), 2));
        
        // Setup camera
        this.camera = new Camera(
            new Vec3(3, 2, 2),
            new Vec3(0, 0, -1),
            new Vec3(0, 1, 0),
            45,
            this.width / this.height,
            0.0,
            10.0
        );
        
        console.log('Scene setup complete'); // Debug log
    }
    
    createTexture(baseColor) {
        if (!this.enableTextures) {
            return new SolidColor(baseColor);
        }
        
        switch (this.textureType) {
            case 'checkerboard':
                return new CheckerTexture(
                    baseColor.mul(0.2),
                    baseColor,
                    this.textureScale
                );
            case 'noise':
                return new NoiseTexture(this.textureScale * 0.1);
            case 'marble':
                return new MarbleTexture(this.textureScale * 0.1);
            case 'wood':
                return new WoodTexture(this.textureScale * 0.1);
            default:
                return new SolidColor(baseColor);
        }
    }
    
    rayColor(ray, depth) {
        if (depth <= 0) return new Vec3(0, 0, 0);
        
        const hit = this.world.hit(ray, 0.001, Infinity);
        if (hit) {
            // Add emissive contribution
            const emitted = hit.material.emitted(hit.u, hit.v, hit.point);
            
            const scatterResult = hit.material.scatter(ray, hit);
            if (scatterResult) {
                const scattered = this.rayColor(scatterResult.scattered, depth - 1);
                return emitted.add(new Vec3(
                    scatterResult.attenuation.x * scattered.x,
                    scatterResult.attenuation.y * scattered.y,
                    scatterResult.attenuation.z * scattered.z
                ));
            }
            return emitted;
        }
        
        return this.world.background(ray);
    }
    
    getAntiAliasSample(i, j, s) {
        if (this.antiAliasing === 'stochastic') {
            // Stochastic sampling with blue noise distribution
            const r1 = Math.random();
            const r2 = Math.random();
            const offsetX = Math.sqrt(r1) * Math.cos(2 * Math.PI * r2);
            const offsetY = Math.sqrt(r1) * Math.sin(2 * Math.PI * r2);
            return {
                u: (i + 0.5 + offsetX * 0.5) / this.width,
                v: (j + 0.5 + offsetY * 0.5) / this.height
            };
        } else if (this.antiAliasing === 'supersampling') {
            // Regular supersampling
            return {
                u: (i + Math.random()) / this.width,
                v: (j + Math.random()) / this.height
            };
        } else {
            // No anti-aliasing
            return {
                u: (i + 0.5) / this.width,
                v: (j + 0.5) / this.height
            };
        }
    }
    
    toneMap(color) {
        switch (this.toneMapping) {
            case 'aces':
                return PostProcessor.acesToneMap(color, this.exposure);
            case 'linear':
                return color.mul(this.exposure);
            case 'reinhard':
            default:
                return PostProcessor.reinhardToneMap(color, this.exposure);
        }
    }
    
    gammaCorrect(color) {
        return PostProcessor.gammaCorrect(color, this.gamma);
    }
      async render(onProgress) {
        console.log('Starting render...'); // Debug log
        
        // Debug camera information before rendering
        console.log('Camera Debug Information Before Rendering:');
        if (this.camera) {
            console.log('- Camera position (origin):', this.camera.origin);
            console.log('- Camera w vector (points away from lookAt):', this.camera.w);
            console.log('- Camera u vector (right):', this.camera.u);
            console.log('- Camera v vector (up):', this.camera.v);
            console.log('- Field of view:', this.camera.fov);
            console.log('- Focus distance:', this.camera.focusDist);
            console.log('- Aperture:', this.camera.aperture);
        } else {
            console.log('ERROR: No camera is set up!');
        }
        
        const data = this.imageData.data;
        const floatData = new Float32Array(data.length);
        let pixelCount = 0;
        const totalPixels = this.width * this.height;
        const updateInterval = Math.max(1, Math.floor(this.width / 4));
        
        for (let j = this.height - 1; j >= 0; j--) {
            if (window.renderCancelled) break;
            
            console.log(`Rendering row ${this.height - 1 - j + 1}/${this.height}`); // Debug log
            const rowStartTime = performance.now();
            
            for (let i = 0; i < this.width; i++) {
                if (window.renderCancelled) break;
                
                let color = new Vec3(0, 0, 0);
                
                // Anti-aliasing with multiple samples
                const sampleCount = this.antiAliasing === 'none' ? 1 : this.samples;
                for (let s = 0; s < sampleCount; s++) {
                    const sample = this.getAntiAliasSample(i, j, s);
                    const ray = this.camera.getRay(sample.u, sample.v);
                    color = color.add(this.rayColor(ray, this.maxBounces));
                }
                
                color = color.div(sampleCount);
                
                // Post-processing pipeline
                color = this.toneMap(color);
                color = this.gammaCorrect(color);
                
                // Store in float array for denoising
                const pixelIndex = ((this.height - 1 - j) * this.width + i) * 4;
                floatData[pixelIndex] = color.x;
                floatData[pixelIndex + 1] = color.y;
                floatData[pixelIndex + 2] = color.z;
                floatData[pixelIndex + 3] = 1.0;
                
                pixelCount++;
                
                // Real-time preview - simplified
                if (i % updateInterval === 0 || i === this.width - 1) {
                    // Convert to 8-bit for display
                    const r = Math.min(255, Math.max(0, Math.floor(color.x * 255)));
                    const g = Math.min(255, Math.max(0, Math.floor(color.y * 255)));
                    const b = Math.min(255, Math.max(0, Math.floor(color.z * 255)));
                    
                    data[pixelIndex] = r;
                    data[pixelIndex + 1] = g;
                    data[pixelIndex + 2] = b;
                    data[pixelIndex + 3] = 255;
                    
                    // Update canvas every few pixels
                    if (i === this.width - 1) {
                        this.ctx.putImageData(this.imageData, 0, 0);
                    }
                    
                    if (performance.now() - rowStartTime > 50) {
                        await new Promise(resolve => setTimeout(resolve, 1));
                    }
                } else {
                    // Just store the pixel data
                    const r = Math.min(255, Math.max(0, Math.floor(color.x * 255)));
                    const g = Math.min(255, Math.max(0, Math.floor(color.y * 255)));
                    const b = Math.min(255, Math.max(0, Math.floor(color.z * 255)));
                    
                    data[pixelIndex] = r;
                    data[pixelIndex + 1] = g;
                    data[pixelIndex + 2] = b;
                    data[pixelIndex + 3] = 255;
                }
            }
            
            if (window.renderCancelled) break;
            
            const progress = pixelCount / totalPixels;
            if (onProgress) onProgress(progress);
            
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        if (!window.renderCancelled) {
            // Apply denoising if enabled
            if (this.denoising) {
                const denoisedData = PostProcessor.denoise(floatData, this.width, this.height, this.denoiseStrength);
                
                // Convert denoised float data to 8-bit
                for (let i = 0; i < denoisedData.length; i += 4) {
                    data[i] = Math.min(255, Math.max(0, Math.floor(denoisedData[i] * 255)));
                    data[i + 1] = Math.min(255, Math.max(0, Math.floor(denoisedData[i + 1] * 255)));
                    data[i + 2] = Math.min(255, Math.max(0, Math.floor(denoisedData[i + 2] * 255)));
                    data[i + 3] = 255;
                }
            }
            
            this.ctx.putImageData(this.imageData, 0, 0);
            if (onProgress) onProgress(1.0);
        }
    }
      loadPreset(presetName) {
        this.world = new World();
        
        switch (presetName) {
            case 'glass':
                this.setupGlassScene();
                break;
            case 'metal':
                this.setupMetalScene();
                break;
            case 'cornell':
                this.setupCornellBox();
                break;
            default:
                this.setupDefaultScene();
                break;
        }
    }
    
    /**
     * Load a scene from Blender-exported JSON
     * @param {Object} jsonData The parsed JSON data from a Blender export
     */    
    loadFromJSON(jsonData) {
        console.log('Loading scene from Blender JSON:', jsonData);
        
        try {
            const result = SceneLoader.loadFromJSON(jsonData, this.width, this.height);
            
            // Update world and camera
            this.world = result.world;
            
            // Only update camera if one was included in the JSON
            if (result.camera) {
                this.camera = result.camera;
            }
            
            // Handle resolution change if provided in the scene data
            if (result.newDimensions) {
                this.resizeCanvas(result.newDimensions.width, result.newDimensions.height);
                // Notify any listeners that dimensions have changed
                if (typeof this.onResizeCallback === 'function') {
                    this.onResizeCallback(result.newDimensions.width, result.newDimensions.height);
                }
            }
            
            console.log('Successfully loaded scene from JSON');
            return true;
        } catch (error) {
            console.error('Error loading scene from JSON:', error);
            return false;
        }
    }
    
    setupGlassScene() {
        const glass = new Dielectric(1.5);
        const glass2 = new Dielectric(2.4);
        const ground = new Lambertian(new Vec3(0.8, 0.8, 0.0));
        const light = new Emissive(new Vec3(1, 1, 1), 8);
        
        // Ground
        this.world.add(new Plane(new Vec3(0, -0.5, 0), new Vec3(0, 1, 0), ground));
        
        // Glass spheres
        this.world.add(new Sphere(new Vec3(0, 0, -1), 0.5, glass));
        this.world.add(new Sphere(new Vec3(0, 0, -1), -0.45, glass)); // Hollow
        this.world.add(new Sphere(new Vec3(-1, 0, -1), 0.5, glass2));
        this.world.add(new Sphere(new Vec3(1, 0, -1), 0.5, glass));
        
        // Lights
        this.world.add(new Sphere(new Vec3(0, 4, -1), 1, light));
        this.world.addLight(new PointLight(new Vec3(0, 4, -1), new Vec3(1, 1, 1), 20));
        
        this.camera = new Camera(
            new Vec3(3, 2, 2),
            new Vec3(0, 0, -1),
            new Vec3(0, 1, 0),
            45,
            this.width / this.height,
            0.02,
            Math.sqrt(3*3 + 2*2 + 3*3)
        );
    }
    
    setupMetalScene() {
        const metal1 = new Metal(new Vec3(0.8, 0.8, 0.9), 0.0);
        const metal2 = new Metal(new Vec3(0.8, 0.6, 0.2), 0.1);
        const metal3 = new Metal(new Vec3(0.7, 0.6, 0.5), 0.3);
        const ground = new Lambertian(new Vec3(0.5, 0.5, 0.5));
        const light = new Emissive(new Vec3(1, 0.8, 0.6), 10);
        
        // Ground
        this.world.add(new Plane(new Vec3(0, -0.5, 0), new Vec3(0, 1, 0), ground));
        
        // Metal spheres
        this.world.add(new Sphere(new Vec3(0, 0, -1), 0.5, metal1));
        this.world.add(new Sphere(new Vec3(-1, 0, -1), 0.5, metal2));
        this.world.add(new Sphere(new Vec3(1, 0, -1), 0.5, metal3));
        
        // Box
        this.world.add(new Box(new Vec3(-0.3, -0.5, -2), new Vec3(0.3, 0.3, -1.4), metal2));
        
        // Lights
        this.world.add(new Sphere(new Vec3(2, 3, 0), 0.5, light));
        this.world.addLight(new PointLight(new Vec3(2, 3, 0), new Vec3(1, 0.8, 0.6), 15));
        this.world.addLight(new DirectionalLight(new Vec3(-1, -2, -1), new Vec3(0.3, 0.4, 0.6), 1));
        
        this.camera = new Camera(
            new Vec3(4, 2, 3),
            new Vec3(0, 0, -1),
            new Vec3(0, 1, 0),
            45,
            this.width / this.height,
            0.0,
            10.0
        );
    }
    
    setupCornellBox() {
        const red = new Lambertian(new Vec3(0.65, 0.05, 0.05));
        const white = new Lambertian(new Vec3(0.73, 0.73, 0.73));
        const green = new Lambertian(new Vec3(0.12, 0.45, 0.15));
        const light = new Emissive(new Vec3(1, 1, 1), 15);
        const metal = new Metal(new Vec3(0.8, 0.85, 0.88), 0.0);
        const glass = new Dielectric(1.5);
        
        // Cornell box walls
        this.world.add(new Plane(new Vec3(0, 0, -5), new Vec3(0, 0, 1), white)); // Back
        this.world.add(new Plane(new Vec3(0, -2.5, 0), new Vec3(0, 1, 0), white)); // Floor
        this.world.add(new Plane(new Vec3(0, 2.5, 0), new Vec3(0, -1, 0), white)); // Ceiling
        this.world.add(new Plane(new Vec3(-2.5, 0, 0), new Vec3(1, 0, 0), red)); // Left wall
        this.world.add(new Plane(new Vec3(2.5, 0, 0), new Vec3(-1, 0, 0), green)); // Right wall
        
        // Objects
        this.world.add(new Box(new Vec3(-1, -2.5, -3.5), new Vec3(-0.2, -1, -2.7), white));
        this.world.add(new Box(new Vec3(0.2, -2.5, -4), new Vec3(1.2, -0.5, -3), white));
        this.world.add(new Sphere(new Vec3(-0.6, -1.8, -2.2), 0.7, glass));
        this.world.add(new Sphere(new Vec3(0.7, -1.8, -3.5), 0.7, metal));
        
        // Light
        this.world.add(new Box(new Vec3(-0.5, 2.45, -3.5), new Vec3(0.5, 2.49, -2.5), light));
        
        this.world.background = this.world.solidBackground(new Vec3(0, 0, 0));
        
        this.camera = new Camera(
            new Vec3(0, 0, 2),
            new Vec3(0, 0, -1),
            new Vec3(0, 1, 0),
            40,
            this.width / this.height,
            0.0,
            10.0
        );
    }
    
    /**     * Recreate the camera with updated dimensions
     * This ensures the aspect ratio is correct after a resize
     */    setupCamera() {
        if (!this.camera) return;
        
        // Calculate lookAt point from the camera's current vectors
        // w points away from lookAt, so origin - (w * focusDist) gives a more accurate lookAt point
        const lookFrom = this.camera.origin;
        // Use the stored focus distance for a more accurate lookAt calculation
        const lookAt = lookFrom.sub(this.camera.w.mul(this.camera.focusDist));
        
        // Use the camera's existing up vector
        const vup = this.camera.v; // This is already normalized
        
        // Get existing camera parameters
        const fov = this.camera.fov || 45; // Default to 45 if not defined
        const aperture = this.camera.aperture || 0.0;
        const focusDist = this.camera.focusDist || 10.0;
        const type = this.camera.type || 'perspective';
        
        console.log('Recreating camera:');
        console.log('- Position:', lookFrom);
        console.log('- LookAt:', lookAt);
        console.log('- Up vector:', vup);
        console.log('- Focus distance:', focusDist);
        
        // Create new camera with updated aspect ratio
        this.camera = new Camera(
            lookFrom,
            lookAt,
            vup,
            fov,
            this.width / this.height, // Updated aspect ratio
            aperture,
            focusDist,
            type
        );
    }
      updateCamera(params) {
        // Get current camera position and orientation if camera exists
        let lookFrom = new Vec3(3, 2, 2);     // Default position
        let lookAt = new Vec3(0, 0, -1);      // Default look-at
        let vup = new Vec3(0, 1, 0);          // Default up vector
        
        // If camera already exists, preserve its position and orientation
        if (this.camera) {
            lookFrom = this.camera.origin;
            // Calculate current lookAt from camera vectors
            lookAt = this.camera.origin.sub(this.camera.w.mul(this.camera.focusDist || 10.0));
            vup = this.camera.v;
        }
        
        // Allow position override from params
        if (params.position) {
            lookFrom = new Vec3(params.position[0], params.position[1], params.position[2]);
        }
        if (params.lookAt) {
            lookAt = new Vec3(params.lookAt[0], params.lookAt[1], params.lookAt[2]);
        }
        if (params.up) {
            vup = new Vec3(params.up[0], params.up[1], params.up[2]);
        }
        
        this.camera = new Camera(
            lookFrom,
            lookAt,
            vup,
            params.fov || (this.camera?.fov || 45),
            this.width / this.height,
            params.aperture || (this.camera?.aperture || 0.0),
            params.focusDist || (this.camera?.focusDist || 10.0),
            params.type || (this.camera?.type || 'perspective')
        );
    }
    
    /**
     * Set camera position and orientation directly
     */
    setCameraPosition(lookFrom, lookAt, vup) {
        if (!this.camera) {
            // Create default camera if none exists
            this.camera = new Camera(
                lookFrom || new Vec3(3, 2, 2),
                lookAt || new Vec3(0, 0, -1),
                vup || new Vec3(0, 1, 0),
                45,
                this.width / this.height,
                0.0,
                10.0
            );
        } else {
            // Update existing camera with new position
            this.updateCamera({
                position: lookFrom ? [lookFrom.x, lookFrom.y, lookFrom.z] : undefined,
                lookAt: lookAt ? [lookAt.x, lookAt.y, lookAt.z] : undefined,
                up: vup ? [vup.x, vup.y, vup.z] : undefined
            });
        }
    }
    
    /**
     * Get current camera position and orientation
     */
    getCameraPosition() {
        if (!this.camera) return null;
        
        return {
            position: this.camera.origin,
            lookAt: this.camera.origin.sub(this.camera.w.mul(this.camera.focusDist)),
            up: this.camera.v,
            fov: this.camera.fov,
            aperture: this.camera.aperture,
            focusDist: this.camera.focusDist,
            type: this.camera.type
        };
    }
    
    updateRenderSettings(params) {
        this.maxBounces = params.maxBounces || 5;
        this.samples = params.samples || 4;
        this.gamma = params.gamma || 2.2;
        this.exposure = params.exposure || 1.0;
        this.toneMapping = params.toneMapping || 'reinhard';
        this.antiAliasing = params.antiAliasing || 'supersampling';
        this.denoising = params.denoising || false;
        this.denoiseStrength = params.denoiseStrength || 0.5;
        this.enableTextures = params.enableTextures !== undefined ? params.enableTextures : true;
        this.textureType = params.textureType || 'checkerboard';
        this.textureScale = params.textureScale || 10;
    }
    
    updateBackground(type, intensity = 1.0) {
        this.world.skyIntensity = intensity;
        
        switch (type) {
            case 'solid':
                this.world.background = this.world.solidBackground(new Vec3(0.1, 0.1, 0.1));
                break;
            case 'hdri':
                this.world.background = this.world.hdriBackground();
                break;
            case 'procedural_sky':
                this.world.background = this.world.proceduralSky.bind(this.world);
                break;
            default:
                this.world.background = this.world.skyGradient.bind(this.world);
                break;
        }
    }
    
    refreshScene() {
        // Rebuild the scene with current texture settings
        this.world = new World();
        this.setupDefaultScene();
    }
    
    /**
     * Resize the canvas to new dimensions
     * @param {Number} width - New canvas width
     * @param {Number} height - New canvas height
     */
    resizeCanvas(width, height) {
        console.log(`Resizing canvas to ${width}x${height}`);
        this.width = width;
        this.height = height;
        this.canvas.width = width;
        this.canvas.style.width = `${width}px`;
        this.canvas.height = height;
        this.canvas.style.height = `${height}px`;
        
        // Re-create imageData with new dimensions
        this.imageData = this.ctx.createImageData(this.width, this.height);
        
        // Update aspect ratio of camera if it exists
        if (this.camera) {
            this.setupCamera();
        }
    }
    
    /**
     * Set a callback to be called when canvas is resized
     * @param {Function} callback - Function to call with (width, height)
     */
    onResize(callback) {
        this.onResizeCallback = callback;
    }
    
    /**
     * Load camera from predefined presets
     */
    loadCameraPreset(presetName) {
        const presets = {
            'default': {
                position: [3, 2, 2],
                lookAt: [0, 0, -1],
                up: [0, 1, 0],
                fov: 45,
                aperture: 0.0,
                focusDist: 10.0
            },
            'close-up': {
                position: [1, 1, 1],
                lookAt: [0, 0, -1],
                up: [0, 1, 0],
                fov: 60,
                aperture: 0.02,
                focusDist: 2.0
            },
            'wide-angle': {
                position: [5, 3, 5],
                lookAt: [0, 0, 0],
                up: [0, 1, 0],
                fov: 80,
                aperture: 0.0,
                focusDist: 15.0
            },
            'top-down': {
                position: [0, 5, 0],
                lookAt: [0, 0, -1],
                up: [0, 0, -1],
                fov: 45,
                aperture: 0.0,
                focusDist: 5.0
            },
            'side-view': {
                position: [5, 0, 0],
                lookAt: [0, 0, -1],
                up: [0, 1, 0],
                fov: 45,
                aperture: 0.0,
                focusDist: 5.0
            }
        };
        
        const preset = presets[presetName];
        if (!preset) {
            console.warn(`Camera preset '${presetName}' not found. Available presets:`, Object.keys(presets));
            return false;
        }
        
        this.updateCamera(preset);
        console.log(`Loaded camera preset: ${presetName}`);
        return true;
    }
}

export { RayTracer };
