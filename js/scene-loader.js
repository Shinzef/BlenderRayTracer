/**
 * Scene loader for importing scenes from Blender or other sources
 */

import { Vec3 } from './math.js';
import { World } from './world.js';
import { Sphere, Plane, Box, Triangle, TriangleMesh } from './geometry.js';
import { Lambertian, Metal, Dielectric, Emissive } from './materials.js';
import { PointLight, DirectionalLight } from './lights.js';
import { SolidColor } from './textures.js';
import { Camera } from './camera.js';

class SceneLoader {    /**
     * Load a scene from a JSON file
     * @param {Object} jsonData - The parsed JSON data
     * @param {Number} width - Canvas width for aspect ratio calculation, used if not defined in jsonData
     * @param {Number} height - Canvas height for aspect ratio calculation, used if not defined in jsonData
     * @returns {Object} Object containing world, camera, and optionally new dimensions
     */
    static loadFromJSON(jsonData, width, height) {
        console.log('Loading scene from JSON:', jsonData);
        
        // Get resolution from camera data if available
        let newDimensions = null;
        if (jsonData.camera && jsonData.camera.resolution) {
            newDimensions = {
                width: jsonData.camera.resolution[0],
                height: jsonData.camera.resolution[1]
            };
            // Update width and height for this function
            width = newDimensions.width;
            height = newDimensions.height;
            console.log('Using resolution from scene:', width, 'x', height);
        }
        
        const world = new World();
          // Set background
        if (jsonData.background) {
            if (jsonData.background.type === 'gradient') {
                world.background = world.skyGradient.bind(world);
            } else if (jsonData.background.type === 'solid') {
                const color = this._parseColor(jsonData.background.color || [0.1, 0.1, 0.1]);
                world.background = world.solidBackground.bind(world, color);
            } else if (jsonData.background.type === 'hdri') {
                world.background = world.hdriBackground.bind(world);
            } else if (jsonData.background.type === 'procedural_sky') {
                world.background = world.proceduralSky.bind(world);
            } else {
                // Default to sky gradient if type is not recognized
                world.background = world.skyGradient.bind(world);
            }
            
            if (jsonData.background.intensity !== undefined) {
                world.skyIntensity = jsonData.background.intensity;
            }
        }
        
        // Load objects
        if (jsonData.objects && Array.isArray(jsonData.objects)) {
            for (const obj of jsonData.objects) {
                const object = this._createObject(obj);
                if (object) {
                    world.add(object);
                }
            }
        }
        
        // Load lights
        if (jsonData.lights && Array.isArray(jsonData.lights)) {
            for (const lightData of jsonData.lights) {
                const light = this._createLight(lightData);
                if (light) {
                    world.addLight(light);
                }
            }
        }
          // Load camera
        let camera = null;
        if (jsonData.camera) {
            camera = this._createCamera(jsonData.camera, width / height);
        }
        
        return { world, camera, newDimensions };
    }
    
    /**
     * Create a 3D object from JSON data
     * @private
     */
    static _createObject(objData) {
        if (!objData.type) {
            console.error('Object has no type:', objData);
            return null;
        }
        
        const material = this._createMaterial(objData.material || { type: 'lambertian', color: [0.8, 0.8, 0.8] });
        
        switch (objData.type.toLowerCase()) {
            case 'sphere':
                const center = this._parseVec3(objData.center);
                const radius = objData.radius || 1.0;
                return new Sphere(center, radius, material);
                
            case 'plane':
                const point = this._parseVec3(objData.point);
                const normal = this._parseVec3(objData.normal);
                return new Plane(point, normal, material);
                  case 'box':
                const min = this._parseVec3(objData.min);
                const max = this._parseVec3(objData.max);
                return new Box(min, max, material);
                
            case 'triangle':
                const v0 = this._parseVec3(objData.v0);
                const v1 = this._parseVec3(objData.v1);
                const v2 = this._parseVec3(objData.v2);
                return new Triangle(v0, v1, v2, material);
                
            case 'mesh':
                if (!objData.vertices || !objData.indices) {
                    console.error('Mesh is missing vertices or indices:', objData);
                    return null;
                }
                
                // Parse vertices from array of [x,y,z] arrays
                const vertices = objData.vertices.map(v => this._parseVec3(v));
                
                // Use indices as-is (they're already array of numbers)
                const indices = objData.indices;
                
                return new TriangleMesh(vertices, indices, material);
                
            default:
                console.warn(`Unknown object type: ${objData.type}`);
                return null;
        }
    }
    
    /**
     * Create a material from JSON data
     * @private
     */
    static _createMaterial(matData) {
        if (!matData || !matData.type) {
            return new Lambertian(new Vec3(0.8, 0.8, 0.8));
        }
        
        switch (matData.type.toLowerCase()) {
            case 'lambertian':
                return new Lambertian(this._parseColor(matData.color));
                
            case 'metal':
                return new Metal(
                    this._parseColor(matData.color), 
                    matData.roughness !== undefined ? matData.roughness : 0.0
                );
                
            case 'dielectric':
                return new Dielectric(
                    matData.ior !== undefined ? matData.ior : 1.5
                );
                
            case 'emissive':
                return new Emissive(
                    this._parseColor(matData.color),
                    matData.intensity !== undefined ? matData.intensity : 1.0
                );
                
            default:
                console.warn(`Unknown material type: ${matData.type}, using default`);
                return new Lambertian(new Vec3(0.8, 0.8, 0.8));
        }
    }
    
    /**
     * Create a light from JSON data
     * @private
     */
    static _createLight(lightData) {
        if (!lightData || !lightData.type) {
            return null;
        }
        
        const color = this._parseColor(lightData.color || [1, 1, 1]);
        const intensity = lightData.intensity !== undefined ? lightData.intensity : 1.0;
        
        switch (lightData.type.toLowerCase()) {
            case 'point':
                const position = this._parseVec3(lightData.position);
                return new PointLight(position, color, intensity);
                
            case 'directional':
                const direction = this._parseVec3(lightData.direction);
                return new DirectionalLight(direction, color, intensity);
                
            default:
                console.warn(`Unknown light type: ${lightData.type}`);
                return null;
        }
    }
    
    /**
     * Create a camera from JSON data
     * @private
     */    static _createCamera(camData, aspect) {
        const position = this._parseVec3(camData.position || [0, 0, 5]);
        let lookAt = this._parseVec3(camData.lookAt || [0, 0, 0]);
        const up = this._parseVec3(camData.up || [0, 1, 0]);
        const fov = camData.fov !== undefined ? camData.fov : 45;
        const aperture = camData.aperture !== undefined ? camData.aperture : 0.0;
        
        // Validate that lookAt is reasonable (not too close to position)
        const distanceToLookAt = position.sub(lookAt).length();
        if (distanceToLookAt < 1.0) {
            console.warn('LookAt point is very close to camera position, this may cause issues');
            console.log('Distance to lookAt:', distanceToLookAt);
            console.log('Position:', position);
            console.log('LookAt:', lookAt);
            
            // If lookAt is too close, move it further away in the same direction
            const direction = position.sub(lookAt).normalize().mul(-1); // Direction from pos to lookAt
            lookAt = position.add(direction.mul(100)); // Place lookAt 100 units away
            console.log('Adjusted lookAt to:', lookAt);
        }
        
        // Calculate the focus distance if not provided
        // If lookAt is provided, use distance to lookAt
        let focusDist = camData.focusDist;
        if (focusDist === undefined) {
            const toTarget = position.sub(lookAt);
            focusDist = toTarget.length();
            console.log('Calculated focus distance from lookAt:', focusDist);
        }
        
        const type = camData.type || 'perspective';
        const finalAspect = camData.aspect || aspect;
        
        // Debug camera information
        console.log('Camera Debug Information:');
        console.log('- Raw camera data from JSON:', JSON.stringify(camData, null, 2));
        console.log('- Parsed position:', position);
        console.log('- Parsed lookAt:', lookAt);
        console.log('- Parsed up vector:', up);
        console.log('- Field of view:', fov);
        console.log('- Aspect ratio:', finalAspect);
        console.log('- Focus distance:', focusDist);
        console.log('- Distance from position to lookAt:', position.sub(lookAt).length());
        
        // Visualization of what the camera will see
        console.log('Camera direction (position to lookAt):', position.sub(lookAt).normalize().mul(-1));
        
        return new Camera(
            position,
            lookAt,
            up,
            fov,
            finalAspect,
            aperture,
            focusDist,
            type
        );
    }
    
    /**
     * Parse a Vec3 from an array
     * @private
     */
    static _parseVec3(arr) {
        if (Array.isArray(arr) && arr.length >= 3) {
            return new Vec3(arr[0], arr[1], arr[2]);
        }
        return new Vec3(0, 0, 0);
    }
    
    /**
     * Parse a color from an array
     * @private
     */
    static _parseColor(arr) {
        return this._parseVec3(arr);
    }
}

export { SceneLoader };
