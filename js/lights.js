/**
 * Light classes for the ray tracer
 */

import { Vec3 } from './math.js';

// Base Light class
class Light {
    constructor(position, color, intensity = 1) {
        this.position = position;
        this.color = color;
        this.intensity = intensity;
    }
}

// Point light for localized illumination
class PointLight extends Light {
    constructor(position, color, intensity = 1) {
        super(position, color, intensity);
    }
    
    illuminate(point) {
        const direction = this.position.sub(point);
        const distance = direction.length();
        const attenuation = 1.0 / (1.0 + 0.1 * distance + 0.01 * distance * distance);
        return {
            direction: direction.normalize(),
            color: this.color.mul(this.intensity * attenuation),
            distance: distance
        };
    }
}

// Directional light for sun-like illumination
class DirectionalLight extends Light {
    constructor(direction, color, intensity = 1) {
        super(new Vec3(), color, intensity);
        this.direction = direction.normalize();
    }
    
    illuminate(point) {
        return {
            direction: this.direction.mul(-1),
            color: this.color.mul(this.intensity),
            distance: Infinity
        };
    }
}

export { Light, PointLight, DirectionalLight };
