# RayCast Scene Format Documentation

This document describes the JSON format used by the RayCast ray tracer for scene description.

## Overview

The scene file is a JSON document that contains information about objects, lights, camera settings, and background.

## Top-Level Structure

```json
{
  "name": "Scene Name",
  "objects": [ ... ],
  "lights": [ ... ],
  "camera": { ... },
  "background": { ... }
}
```

## Objects

Each object must have a `type` and a `material`.

### Sphere

```json
{
  "type": "sphere",
  "name": "Sphere1",
  "center": [0, 0, -1],
  "radius": 0.5,
  "material": { ... }
}
```

### Box

```json
{
  "type": "box",
  "name": "Box1",
  "min": [-1, -1, -1],
  "max": [1, 1, 1],
  "material": { ... }
}
```

### Plane

```json
{
  "type": "plane",
  "name": "Ground",
  "point": [0, -0.5, 0],
  "normal": [0, 1, 0],
  "material": { ... }
}
```

### Triangle

```json
{
  "type": "triangle",
  "name": "Triangle1",
  "v0": [0, 0, 0],
  "v1": [1, 0, 0],
  "v2": [0, 1, 0],
  "material": { ... }
}
```

### Triangle Mesh

```json
{
  "type": "mesh",
  "name": "Mesh1",
  "vertices": [
    [0, 0, 0],
    [1, 0, 0],
    [0, 1, 0],
    [1, 1, 1]
  ],
  "indices": [0, 1, 2, 1, 3, 2],
  "material": { ... }
}
```

- `vertices`: Array of 3D points [x, y, z]
- `indices`: Array of indices to form triangles (3 indices per triangle)

## Materials

Each material must have a `type`.

### Lambertian (Diffuse)

```json
{
  "type": "lambertian",
  "color": [0.8, 0.2, 0.2]
}
```

### Metal

```json
{
  "type": "metal",
  "color": [0.8, 0.8, 0.8],
  "roughness": 0.1
}
```

### Dielectric (Glass)

```json
{
  "type": "dielectric",
  "ior": 1.5
}
```

### Emissive (Light Source)

```json
{
  "type": "emissive",
  "color": [1.0, 0.9, 0.8],
  "intensity": 5.0
}
```

## Lights

Lights are separate from emissive materials and add lighting to the scene without physical representation.

### Point Light

```json
{
  "type": "point",
  "position": [0, 4, 0],
  "color": [1, 1, 1],
  "intensity": 10.0
}
```

### Directional Light

```json
{
  "type": "directional",
  "direction": [-1, -1, -1],
  "color": [1, 0.9, 0.7],
  "intensity": 2.0
}
```

## Camera

```json
{
  "position": [0, 1, 3],
  "lookAt": [0, 0, -1],
  "up": [0, 1, 0],
  "fov": 40,
  "aspect": 1.5,
  "aperture": 0.05,
  "focusDist": 4.0,
  "type": "perspective" 
}
```

- `type` can be `perspective` or `orthographic`

## Background

```json
{
  "type": "gradient",
  "intensity": 1.0
}
```

- `type` can be `gradient`, `solid`, `hdri`, or `procedural_sky`
- For `solid` type, specify a `color`: `[r, g, b]` array
