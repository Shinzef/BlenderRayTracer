/**
 * Texture definitions for the ray tracer
 */

import { Vec3 } from './math.js';
import { PerlinNoise } from './noise.js';

// Base texture class
class Texture {
    value(u, v, p) { return new Vec3(1, 1, 1); }
}

// Solid color texture
class SolidColor extends Texture {
    constructor(color) {
        super();
        this.color = color;
    }
    
    value(u, v, p) { return this.color; }
}

// Checker pattern texture
class CheckerTexture extends Texture {
    constructor(odd, even, scale = 10) {
        super();
        this.odd = odd;
        this.even = even;
        this.scale = scale;
    }
    
    value(u, v, p) {
        const sines = Math.sin(this.scale * p.x) * Math.sin(this.scale * p.y) * Math.sin(this.scale * p.z);
        return sines < 0 ? this.odd : this.even;
    }
}

// Noise-based texture using Perlin noise
class NoiseTexture extends Texture {
    constructor(scale = 1) {
        super();
        this.scale = scale;
        this.noise = new PerlinNoise();
    }
    
    value(u, v, p) {
        const n = this.noise.noise(p.mul(this.scale));
        return new Vec3(1, 1, 1).mul(0.5 * (1 + n));
    }
}

// Marble texture using turbulence
class MarbleTexture extends Texture {
    constructor(scale = 1) {
        super();
        this.scale = scale;
        this.noise = new PerlinNoise();
    }
    
    value(u, v, p) {
        const n = this.noise.turbulence(p.mul(this.scale), 7);
        const marble = 0.5 * (1 + Math.sin(this.scale * p.z + 10 * n));
        return new Vec3(0.9, 0.8, 0.7).mul(marble).add(new Vec3(0.6, 0.4, 0.3).mul(1 - marble));
    }
}

// Wood texture simulating wood grain
class WoodTexture extends Texture {
    constructor(scale = 1) {
        super();
        this.scale = scale;
        this.noise = new PerlinNoise();
    }
    
    value(u, v, p) {
        const grain = this.noise.noise(p.mul(this.scale * 20));
        const rings = Math.sin(this.scale * Math.sqrt(p.x * p.x + p.z * p.z) + grain * 10);
        const wood = 0.5 * (1 + rings);
        return new Vec3(0.8, 0.5, 0.2).mul(wood).add(new Vec3(0.4, 0.2, 0.1).mul(1 - wood));
    }
}

export { Texture, SolidColor, CheckerTexture, NoiseTexture, MarbleTexture, WoodTexture };
