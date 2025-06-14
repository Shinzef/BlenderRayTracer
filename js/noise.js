/**
 * Perlin Noise implementation
 */

class PerlinNoise {
    constructor() {
        this.p = [];
        for (let i = 0; i < 256; i++) this.p[i] = i;
        
        // Shuffle array
        for (let i = 255; i >= 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }
        
        // Duplicate array
        for (let i = 0; i < 256; i++) this.p[256 + i] = this.p[i];
    }
    
    fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
    lerp(t, a, b) { return a + t * (b - a); }
    grad(hash, x, y, z) {
        const h = hash & 15;
        const u = h < 8 ? x : y;
        const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    }
    
    noise(point) {
        const x = point.x, y = point.y, z = point.z;
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;
        const Z = Math.floor(z) & 255;
        
        const fx = x - Math.floor(x);
        const fy = y - Math.floor(y);
        const fz = z - Math.floor(z);
        
        const u = this.fade(fx);
        const v = this.fade(fy);
        const w = this.fade(fz);
        
        const A = this.p[X] + Y;
        const AA = this.p[A] + Z;
        const AB = this.p[A + 1] + Z;
        const B = this.p[X + 1] + Y;
        const BA = this.p[B] + Z;
        const BB = this.p[B + 1] + Z;
        
        return this.lerp(w, 
            this.lerp(v, 
                this.lerp(u, this.grad(this.p[AA], fx, fy, fz),
                            this.grad(this.p[BA], fx - 1, fy, fz)),
                this.lerp(u, this.grad(this.p[AB], fx, fy - 1, fz),
                            this.grad(this.p[BB], fx - 1, fy - 1, fz))),
            this.lerp(v, 
                this.lerp(u, this.grad(this.p[AA + 1], fx, fy, fz - 1),
                            this.grad(this.p[BA + 1], fx - 1, fy, fz - 1)),
                this.lerp(u, this.grad(this.p[AB + 1], fx, fy - 1, fz - 1),
                            this.grad(this.p[BB + 1], fx - 1, fy - 1, fz - 1))));
    }
    
    turbulence(point, depth) {
        let accum = 0;
        let weight = 1.0;
        let tempP = point;
        
        for (let i = 0; i < depth; i++) {
            accum += weight * this.noise(tempP);
            weight *= 0.5;
            tempP = tempP.mul(2);
        }
        
        return Math.abs(accum);
    }
}

export { PerlinNoise };
