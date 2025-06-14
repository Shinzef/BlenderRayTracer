/**
 * Post-processing utilities for the ray tracer
 */

import { Vec3 } from './math.js';

class PostProcessor {
    // Reinhard tone mapping operator
    static reinhardToneMap(color, exposure = 1.0) {
        const mapped = color.mul(exposure);
        return new Vec3(
            mapped.x / (1.0 + mapped.x),
            mapped.y / (1.0 + mapped.y),
            mapped.z / (1.0 + mapped.z)
        );
    }
    
    // ACES filmic tone mapping operator (approximation)
    static acesToneMap(color, exposure = 1.0) {
        const exposedColor = color.mul(exposure);
        const a = 2.51;
        const b = 0.03;
        const c = 2.43;
        const d = 0.59;
        const e = 0.14;
        
        return new Vec3(
            Math.max(0, (exposedColor.x * (a * exposedColor.x + b)) / (exposedColor.x * (c * exposedColor.x + d) + e)),
            Math.max(0, (exposedColor.y * (a * exposedColor.y + b)) / (exposedColor.y * (c * exposedColor.y + d) + e)),
            Math.max(0, (exposedColor.z * (a * exposedColor.z + b)) / (exposedColor.z * (c * exposedColor.z + d) + e))
        );
    }
    
    // Gamma correction
    static gammaCorrect(color, gamma = 2.2) {
        const invGamma = 1.0 / gamma;
        return new Vec3(
            Math.pow(Math.max(0, color.x), invGamma),
            Math.pow(Math.max(0, color.y), invGamma),
            Math.pow(Math.max(0, color.z), invGamma)
        );
    }
    
    // Simple denoising using a gaussian blur
    static denoise(imageData, width, height, strength = 0.5) {
        const result = new Float32Array(imageData.length);
        const kernelSize = 3;
        const halfKernel = Math.floor(kernelSize / 2);
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, weight = 0;
                
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const nx = Math.max(0, Math.min(width - 1, x + kx));
                        const ny = Math.max(0, Math.min(height - 1, y + ky));
                        const idx = (ny * width + nx) * 4;
                        
                        const w = Math.exp(-(kx * kx + ky * ky) / (2 * strength * strength));
                        r += imageData[idx] * w;
                        g += imageData[idx + 1] * w;
                        b += imageData[idx + 2] * w;
                        weight += w;
                    }
                }
                
                const idx = (y * width + x) * 4;
                result[idx] = r / weight;
                result[idx + 1] = g / weight;
                result[idx + 2] = b / weight;
                result[idx + 3] = imageData[idx + 3];
            }
        }
        
        return result;
    }
}

export { PostProcessor };
