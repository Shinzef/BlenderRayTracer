/**
 * Math utilities and core ray tracing classes
 */

// Vector class for 3D operations
class Vec3 {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x; this.y = y; this.z = z;
    }
    
    add(v) { return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z); }
    sub(v) { return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z); }
    mul(s) { return new Vec3(this.x * s, this.y * s, this.z * s); }
    div(s) { return new Vec3(this.x / s, this.y / s, this.z / s); }
    dot(v) { return this.x * v.x + this.y * v.y + this.z * v.z; }
    cross(v) { return new Vec3(this.y * v.z - this.z * v.y, this.z * v.x - this.x * v.z, this.x * v.y - this.y * v.x); }
    length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
    normalize() { const l = this.length(); return l > 0 ? this.div(l) : new Vec3(); }
    reflect(n) { return this.sub(n.mul(2 * this.dot(n))); }
    
    static random() { return new Vec3(Math.random(), Math.random(), Math.random()); }
    static randomInUnitSphere() {
        let p;
        do { p = Vec3.random().mul(2).sub(new Vec3(1, 1, 1)); } while (p.dot(p) >= 1.0);
        return p;
    }
    static randomInUnitDisk() {
        let p;
        do { p = new Vec3(Math.random() * 2 - 1, Math.random() * 2 - 1, 0); } while (p.dot(p) >= 1.0);
        return p;
    }
}

// Ray class for representing rays in the scene
class Ray {
    constructor(origin, direction) {
        this.origin = origin;
        this.direction = direction;
    }
    
    at(t) { return this.origin.add(this.direction.mul(t)); }
}

// HitRecord class to store information about ray intersections
class HitRecord {
    constructor() {
        this.point = new Vec3();
        this.normal = new Vec3();
        this.t = 0;
        this.frontFace = true;
        this.material = null;
        this.u = 0; this.v = 0;
    }
    
    setFaceNormal(ray, outwardNormal) {
        this.frontFace = ray.direction.dot(outwardNormal) < 0;
        this.normal = this.frontFace ? outwardNormal : outwardNormal.mul(-1);
    }
}

export { Vec3, Ray, HitRecord };
