/**
 * Camera class for the ray tracer
 */

import { Vec3, Ray } from './math.js';

class Camera {
    constructor(lookFrom, lookAt, vup, vfov, aspect, aperture, focusDist, type = 'perspective') {
        this.type = type;
        this.aperture = aperture;
        this.focusDist = focusDist;
        
        const theta = vfov * Math.PI / 180;
        const h = Math.tan(theta / 2);
        const viewportHeight = 2.0 * h;
        const viewportWidth = aspect * viewportHeight;
        
        this.w = lookFrom.sub(lookAt).normalize();
        this.u = vup.cross(this.w).normalize();
        this.v = this.w.cross(this.u);
        
        this.origin = lookFrom;
        
        if (type === 'perspective') {
            this.horizontal = this.u.mul(viewportWidth * focusDist);
            this.vertical = this.v.mul(viewportHeight * focusDist);
            this.lowerLeftCorner = this.origin.sub(this.horizontal.div(2)).sub(this.vertical.div(2)).sub(this.w.mul(focusDist));
        } else {
            this.horizontal = this.u.mul(viewportWidth);
            this.vertical = this.v.mul(viewportHeight);
            this.lowerLeftCorner = this.origin.sub(this.horizontal.div(2)).sub(this.vertical.div(2));
        }
        
        this.lensRadius = aperture / 2;
    }
    
    getRay(s, t) {
        if (this.type === 'orthographic') {
            const offset = Vec3.randomInUnitDisk().mul(this.lensRadius);
            const rayOrigin = this.origin.add(this.u.mul(offset.x)).add(this.v.mul(offset.y));
            const rayDirection = this.lowerLeftCorner.add(this.horizontal.mul(s)).add(this.vertical.mul(t)).sub(rayOrigin).add(this.w.mul(-1));
            return new Ray(rayOrigin, rayDirection.normalize());
        } else {
            const rd = Vec3.randomInUnitDisk().mul(this.lensRadius);
            const offset = this.u.mul(rd.x).add(this.v.mul(rd.y));
            const rayOrigin = this.origin.add(offset);
            const rayDirection = this.lowerLeftCorner.add(this.horizontal.mul(s)).add(this.vertical.mul(t)).sub(rayOrigin);
            return new Ray(rayOrigin, rayDirection);
        }
    }
}

export { Camera };
