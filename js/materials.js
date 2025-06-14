/**
 * Material classes for the ray tracer
 */

import { Vec3, Ray } from './math.js';

// Base Material class
class Material {
    scatter(ray, rec) { return null; }
    emitted(u, v, p) { return new Vec3(0, 0, 0); }
}

// Lambertian (diffuse) material
class Lambertian extends Material {
    constructor(albedo) {
        super();
        this.albedo = albedo;
    }
    
    scatter(ray, rec) {
        const scatterDirection = rec.normal.add(Vec3.randomInUnitSphere().normalize());
        const scattered = new Ray(rec.point, scatterDirection);
        const attenuation = this.albedo;
        return { scattered, attenuation };
    }
}

// Metal material
class Metal extends Material {
    constructor(albedo, roughness = 0) {
        super();
        this.albedo = albedo;
        this.roughness = Math.min(roughness, 1);
    }
    
    scatter(ray, rec) {
        const reflected = ray.direction.normalize().reflect(rec.normal);
        const scattered = new Ray(rec.point, reflected.add(Vec3.randomInUnitSphere().mul(this.roughness)));
        const attenuation = this.albedo;
        return scattered.direction.dot(rec.normal) > 0 ? { scattered, attenuation } : null;
    }
}

// Dielectric (glass) material
class Dielectric extends Material {
    constructor(refractionIndex) {
        super();
        this.refractionIndex = refractionIndex;
    }
    
    scatter(ray, rec) {
        const attenuation = new Vec3(1, 1, 1);
        const refractionRatio = rec.frontFace ? (1.0 / this.refractionIndex) : this.refractionIndex;
        
        const unitDirection = ray.direction.normalize();
        const cosTheta = Math.min(unitDirection.mul(-1).dot(rec.normal), 1.0);
        const sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);
        
        const cannotRefract = refractionRatio * sinTheta > 1.0;
        let direction;
        
        if (cannotRefract || this.reflectance(cosTheta, refractionRatio) > Math.random()) {
            direction = unitDirection.reflect(rec.normal);
        } else {
            direction = this.refract(unitDirection, rec.normal, refractionRatio);
        }
        
        const scattered = new Ray(rec.point, direction);
        return { scattered, attenuation };
    }
    
    refract(uv, n, etaiOverEtat) {
        const cosTheta = Math.min(uv.mul(-1).dot(n), 1.0);
        const rOutPerpendicular = uv.add(n.mul(cosTheta)).mul(etaiOverEtat);
        const rOutParallel = n.mul(-Math.sqrt(Math.abs(1.0 - rOutPerpendicular.dot(rOutPerpendicular))));
        return rOutPerpendicular.add(rOutParallel);
    }
    
    reflectance(cosine, refIdx) {
        let r0 = (1 - refIdx) / (1 + refIdx);
        r0 = r0 * r0;
        return r0 + (1 - r0) * Math.pow((1 - cosine), 5);
    }
}

// Emissive material for light sources
class Emissive extends Material {
    constructor(color, intensity = 1) {
        super();
        this.color = color;
        this.intensity = intensity;
    }
    
    scatter(ray, rec) { return null; }
    emitted(u, v, p) { return this.color.mul(this.intensity); }
}

// Textured versions of materials
class TexturedLambertian extends Material {
    constructor(texture) {
        super();
        this.texture = texture;
    }
    
    scatter(ray, rec) {
        const scatterDirection = rec.normal.add(Vec3.randomInUnitSphere().normalize());
        const scattered = new Ray(rec.point, scatterDirection);
        const attenuation = this.texture.value(rec.u, rec.v, rec.point);
        return { scattered, attenuation };
    }
}

class TexturedMetal extends Material {
    constructor(texture, roughness = 0) {
        super();
        this.texture = texture;
        this.roughness = Math.min(roughness, 1);
    }
    
    scatter(ray, rec) {
        const reflected = ray.direction.normalize().reflect(rec.normal);
        const scattered = new Ray(rec.point, reflected.add(Vec3.randomInUnitSphere().mul(this.roughness)));
        const attenuation = this.texture.value(rec.u, rec.v, rec.point);
        return scattered.direction.dot(rec.normal) > 0 ? { scattered, attenuation } : null;
    }
}

export { 
    Material, 
    Lambertian, 
    Metal, 
    Dielectric, 
    Emissive, 
    TexturedLambertian, 
    TexturedMetal 
};
