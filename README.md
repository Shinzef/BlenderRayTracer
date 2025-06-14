# RayCast: Blender to JavaScript Ray Tracer

This project provides a web-based ray tracer that can render scenes exported from Blender.

## Features

- Modular JavaScript ray tracer with physically-based rendering
- Blender add-on for exporting scenes
- Interactive rendering with adjustable camera and lighting parameters
- Support for various material types: Lambertian, Metal, Dielectric, Emissive
- Background options: Sky gradient, solid color, HDRI, procedural sky
- Post-processing effects: Tone mapping, anti-aliasing, denoising

## Getting Started

### Installing the Blender Add-on

1. Launch Blender
2. Go to Edit > Preferences > Add-ons
3. Click "Install..." and select the `blender_addon/raycast_exporter.py` file
4. Enable the "Import-Export: RayCast Exporter" add-on

### Exporting a Scene from Blender

1. Create your scene in Blender
2. Go to the 3D View sidebar (press N if not visible)
3. Look for the "RayCast" tab
4. Click "Export Scene"
5. Choose where to save the JSON file

### Rendering in the Ray Tracer

1. Open `index.html` in a web browser
2. Use the "Import Blender JSON" option to select your exported scene
3. Click "Import Blender Scene"
4. Adjust rendering parameters as needed
5. Click "Render Scene"

## Supported Geometry

- Spheres
- Boxes
- Planes
- Triangles
- Triangle Meshes (for arbitrary 3D models)

## Supported Materials

- **Lambertian**: Diffuse surfaces
- **Metal**: Reflective surfaces with adjustable roughness
- **Dielectric**: Glass and other transparent materials
- **Emissive**: Light-emitting surfaces

## Scene Format

The exported JSON from Blender follows this structure:

```json
{
  "name": "Scene Name",
  "objects": [
    {
      "type": "sphere",
      "name": "Sphere1",
      "center": [0, 0, -1],
      "radius": 0.5,
      "material": {
        "type": "lambertian",
        "color": [1.0, 0.2, 0.2]
      }
    }
    // More objects...
  ],
  "lights": [
    {
      "type": "point",
      "position": [0, 5, 5],
      "color": [1, 1, 1],
      "intensity": 8.0
    }
    // More lights...
  ],
  "camera": {
    "position": [0, 1, 3],
    "lookAt": [0, 0, -1],
    "up": [0, 1, 0],
    "fov": 40,
    "aspect": 1.5,
    "aperture": 0.05,
    "focusDist": 4.0,
    "type": "perspective"
  },
  "background": {
    "type": "gradient",
    "intensity": 1.0
  }
}
```

## Future Improvements

- Improved mesh optimization (BVH acceleration structures)
- Texture mapping
- More material types
- Animation support
- Environment mapping
- Two-way integration (open ray tracer from Blender)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
