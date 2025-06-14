/**
 * Geometry classes for the ray tracer
 */

import { Vec3, HitRecord } from './math.js';

// Sphere geometry
class Sphere {
    constructor(center, radius, material) {
        this.center = center;
        this.radius = radius;
        this.material = material;
    }
    
    hit(ray, tMin, tMax) {
        const oc = ray.origin.sub(this.center);
        const a = ray.direction.dot(ray.direction);
        const halfB = oc.dot(ray.direction);
        const c = oc.dot(oc) - this.radius * this.radius;
        const discriminant = halfB * halfB - a * c;
        
        if (discriminant < 0) return null;
        
        const sqrtd = Math.sqrt(discriminant);
        let root = (-halfB - sqrtd) / a;
        if (root < tMin || tMax < root) {
            root = (-halfB + sqrtd) / a;
            if (root < tMin || tMax < root) return null;
        }
        
        const rec = new HitRecord();
        rec.t = root;
        rec.point = ray.at(rec.t);
        const outwardNormal = rec.point.sub(this.center).div(this.radius);
        rec.setFaceNormal(ray, outwardNormal);
        rec.material = this.material;
        
        // UV mapping for sphere
        const theta = Math.acos(-outwardNormal.y);
        const phi = Math.atan2(-outwardNormal.z, outwardNormal.x) + Math.PI;
        rec.u = phi / (2 * Math.PI);
        rec.v = theta / Math.PI;
        
        return rec;
    }
}

// Plane geometry
class Plane {
    constructor(point, normal, material) {
        this.point = point;
        this.normal = normal.normalize();
        this.material = material;
    }
    
    hit(ray, tMin, tMax) {
        const denom = this.normal.dot(ray.direction);
        if (Math.abs(denom) < 1e-6) return null;
        
        const t = this.point.sub(ray.origin).dot(this.normal) / denom;
        if (t < tMin || t > tMax) return null;
        
        const rec = new HitRecord();
        rec.t = t;
        rec.point = ray.at(t);
        rec.setFaceNormal(ray, this.normal);
        rec.material = this.material;
        
        // Simple UV mapping for plane
        rec.u = (rec.point.x + 10) / 20;
        rec.v = (rec.point.z + 10) / 20;
        
        return rec;
    }
}

// Box geometry
class Box {
    constructor(min, max, material) {
        this.min = min;
        this.max = max;
        this.material = material;
    }
    
    hit(ray, tMin, tMax) {
        let tMinBox = (this.min.x - ray.origin.x) / ray.direction.x;
        let tMaxBox = (this.max.x - ray.origin.x) / ray.direction.x;
        
        if (tMinBox > tMaxBox) [tMinBox, tMaxBox] = [tMaxBox, tMinBox];
        
        let tMinY = (this.min.y - ray.origin.y) / ray.direction.y;
        let tMaxY = (this.max.y - ray.origin.y) / ray.direction.y;
        
        if (tMinY > tMaxY) [tMinY, tMaxY] = [tMaxY, tMinY];
        
        if (tMinBox > tMaxY || tMinY > tMaxBox) return null;
        
        tMinBox = Math.max(tMinBox, tMinY);
        tMaxBox = Math.min(tMaxBox, tMaxY);
        
        let tMinZ = (this.min.z - ray.origin.z) / ray.direction.z;
        let tMaxZ = (this.max.z - ray.origin.z) / ray.direction.z;
        
        if (tMinZ > tMaxZ) [tMinZ, tMaxZ] = [tMaxZ, tMinZ];
        
        if (tMinBox > tMaxZ || tMinZ > tMaxBox) return null;
        
        tMinBox = Math.max(tMinBox, tMinZ);
        tMaxBox = Math.min(tMaxBox, tMaxZ);
        
        const t = tMinBox > tMin ? tMinBox : tMaxBox;
        if (t < tMin || t > tMax) return null;
        
        const rec = new HitRecord();
        rec.t = t;
        rec.point = ray.at(t);
        
        // Calculate normal based on which face was hit
        const p = rec.point;
        const eps = 1e-6;
        if (Math.abs(p.x - this.min.x) < eps) rec.normal = new Vec3(-1, 0, 0);
        else if (Math.abs(p.x - this.max.x) < eps) rec.normal = new Vec3(1, 0, 0);
        else if (Math.abs(p.y - this.min.y) < eps) rec.normal = new Vec3(0, -1, 0);
        else if (Math.abs(p.y - this.max.y) < eps) rec.normal = new Vec3(0, 1, 0);
        else if (Math.abs(p.z - this.min.z) < eps) rec.normal = new Vec3(0, 0, -1);
        else rec.normal = new Vec3(0, 0, 1);
        
        rec.setFaceNormal(ray, rec.normal);
        rec.material = this.material;
        
        return rec;
    }
}

// Triangle geometry
class Triangle {
    constructor(v0, v1, v2, material) {
        this.v0 = v0; // First vertex
        this.v1 = v1; // Second vertex
        this.v2 = v2; // Third vertex
        this.material = material;
          // Precompute normal for faster hit calculations
        const edge1 = this.v1.sub(this.v0);
        const edge2 = this.v2.sub(this.v0);
        this.normal = edge1.cross(edge2).normalize();
    }
    
    hit(ray, tMin, tMax) {
        // Möller–Trumbore intersection algorithm
        const edge1 = this.v1.sub(this.v0);
        const edge2 = this.v2.sub(this.v0);
        
        const h = ray.direction.cross(edge2);
        const a = edge1.dot(h);
        
        // Check if ray is parallel to the triangle
        if (Math.abs(a) < 0.0001) return null;
        
        const f = 1.0 / a;
        const s = ray.origin.sub(this.v0);
        const u = f * s.dot(h);
        
        // Check if intersection is outside the triangle
        if (u < 0 || u > 1) return null;
        
        const q = s.cross(edge1);
        const v = f * ray.direction.dot(q);
        
        // Check if intersection is outside the triangle
        if (v < 0 || u + v > 1) return null;
        
        const t = f * edge2.dot(q);
        
        // Check if intersection is behind the ray origin or beyond max distance
        if (t < tMin || t > tMax) return null;
        
        const rec = new HitRecord();
        rec.t = t;
        rec.point = ray.at(t);
        rec.setFaceNormal(ray, this.normal);
        rec.material = this.material;
        
        // Compute UV coordinates using barycentric coordinates
        rec.u = u;
        rec.v = v;
        
        return rec;
    }
}

// TriangleMesh - Collection of triangles for efficient rendering
class TriangleMesh {
    constructor(vertices, indices, material) {
        this.triangles = [];
        
        console.log(`Creating mesh with ${vertices.length} vertices and ${indices.length} indices`);
        
        // Validate input data
        if (!Array.isArray(vertices) || !Array.isArray(indices)) {
            console.error("Invalid vertices or indices:", { vertices, indices });
            return;
        }
        
        // Create triangles from vertices and indices
        try {
            for (let i = 0; i < indices.length; i += 3) {
                if (i + 2 >= indices.length) {
                    console.warn(`Skipping incomplete triangle at index ${i}`);
                    continue;
                }
                
                const idx0 = indices[i];
                const idx1 = indices[i + 1];
                const idx2 = indices[i + 2];
                
                if (idx0 >= vertices.length || idx1 >= vertices.length || idx2 >= vertices.length) {
                    console.warn(`Invalid vertex index at triangle ${i/3}: [${idx0}, ${idx1}, ${idx2}] (max: ${vertices.length-1})`);
                    continue;
                }
                
                const v0 = vertices[idx0];
                const v1 = vertices[idx1];
                const v2 = vertices[idx2];
                
                // Make sure these are Vec3 objects, not just arrays
                const vert0 = v0 instanceof Vec3 ? v0 : this._ensureVec3(v0);
                const vert1 = v1 instanceof Vec3 ? v1 : this._ensureVec3(v1);
                const vert2 = v2 instanceof Vec3 ? v2 : this._ensureVec3(v2);
                
                this.triangles.push(new Triangle(vert0, vert1, vert2, material));
            }
            
            console.log(`Successfully created ${this.triangles.length} triangles`);
        } catch (error) {
            console.error("Error creating triangle mesh:", error);
        }
    }
    
    // Helper to ensure we have a Vec3 and not just an array
    _ensureVec3(v) {
        if (Array.isArray(v) && v.length >= 3) {
            return new Vec3(v[0], v[1], v[2]);
        }
        console.warn("Invalid vertex data:", v);
        return new Vec3(0, 0, 0);
    }
    
    hit(ray, tMin, tMax) {
        let closest = null;
        let closestT = tMax;
        
        // Check intersection with all triangles
        for (const triangle of this.triangles) {
            const hit = triangle.hit(ray, tMin, closestT);
            if (hit) {
                closest = hit;
                closestT = hit.t;
            }
        }
        
        return closest;
    }
}

export { Sphere, Plane, Box, Triangle, TriangleMesh };
