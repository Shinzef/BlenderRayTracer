/**
 * World class for the ray tracer
 */

import { Vec3 } from './math.js';
import { PerlinNoise } from './noise.js';

class World {
    constructor() {
        this.objects = [];
        this.lights = [];
        this.background = this.skyGradient.bind(this);
        this.skyIntensity = 1.0;
        this.cloudNoise = new PerlinNoise(); // Cache noise instance
    }
    
    add(object) { this.objects.push(object); }
    addLight(light) { this.lights.push(light); }
    
    hit(ray, tMin, tMax) {
        let closestHit = null;
        let closestT = tMax;
        
        for (const object of this.objects) {
            const hit = object.hit(ray, tMin, closestT);
            if (hit && hit.t < closestT) {
                closestT = hit.t;
                closestHit = hit;
            }
        }
        
        return closestHit;
    }
    
    skyGradient(ray) {
        const t = 0.5 * (ray.direction.normalize().y + 1.0);
        const white = new Vec3(1.0, 1.0, 1.0);
        const blue = new Vec3(0.5, 0.7, 1.0);
        return white.mul(1.0 - t).add(blue.mul(t)).mul(this.skyIntensity);
    }
    
    solidBackground(color) {
        return () => color.mul(this.skyIntensity);
    }
    
    proceduralSky(ray) {
        const dir = ray.direction.normalize();
        
        // Sun
        const sunDir = new Vec3(0.3, 0.6, 0.8).normalize();
        const sunDot = Math.max(0, dir.dot(sunDir));
        const sunIntensity = Math.pow(sunDot, 512);
        const sunColor = new Vec3(1.0, 0.95, 0.8).mul(sunIntensity * 10);
        
        // Sky gradient based on Y
        const horizonBlend = Math.max(0, dir.y);
        const skyColor = new Vec3(0.4, 0.7, 1.0).mul(horizonBlend * 0.8);
        
        // Horizon glow
        const horizonGlow = Math.exp(-Math.abs(dir.y) * 4) * 0.3;
        const glowColor = new Vec3(1.0, 0.8, 0.6).mul(horizonGlow);
        
        // Ground
        const groundColor = new Vec3(0.1, 0.15, 0.1).mul(Math.max(0, -dir.y * 0.5));
        
        // Procedural clouds
        const cloudPos = new Vec3(dir.x * 10, dir.y * 3 + 2, dir.z * 10);
        const cloud = Math.max(0, this.cloudNoise.noise(cloudPos) * 0.8 + 0.2);
        const cloudColor = new Vec3(0.9, 0.9, 1.0).mul(cloud * Math.max(0, dir.y) * 0.5);
        
        return skyColor.add(glowColor).add(groundColor).add(sunColor).add(cloudColor).mul(this.skyIntensity);
    }
    
    hdriBackground() {
        return (ray) => {
            const dir = ray.direction.normalize();
            
            // Enhanced HDRI simulation
            const sunDir = new Vec3(-0.3, 0.6, -0.5).normalize();
            const sunDot = Math.max(0, dir.dot(sunDir));
            
            // Sun disk
            const sunSize = 0.04;
            const sunMask = sunDot > (1.0 - sunSize) ? 1.0 : 0.0;
            const sunColor = new Vec3(1.0, 0.95, 0.8).mul(sunMask * 20);
            
            // Sun corona
            const coronaSize = 0.2;
            const coronaIntensity = Math.max(0, (sunDot - (1.0 - coronaSize)) / coronaSize);
            const coronaColor = new Vec3(1.0, 0.8, 0.6).mul(Math.pow(coronaIntensity, 2) * 3);
            
            // Environment lighting based on spherical harmonics approximation
            const y = dir.y;
            const phi = Math.atan2(dir.z, dir.x);
            
            // Sky dome
            const skyIntensity = Math.max(0, y * 0.5 + 0.5);
            const skyColor = new Vec3(0.3, 0.5, 0.8).mul(skyIntensity * 2);
            
            // Ground bounce
            const groundBounce = Math.max(0, -y * 0.3);
            const groundColor = new Vec3(0.2, 0.15, 0.1).mul(groundBounce);
            
            // Atmospheric scattering approximation
            const scatter = Math.pow(Math.max(0, 1.0 - Math.abs(y)), 2) * 0.3;
            const scatterColor = new Vec3(0.8, 0.9, 1.0).mul(scatter);
            
            return skyColor.add(groundColor).add(scatterColor).add(sunColor).add(coronaColor).mul(this.skyIntensity);
        };
    }
}

export { World };
