bl_info = {
    "name": "RayCast Exporter",
    "author": "Your Name",
    "version": (1, 0, 7),
    "blender": (4, 4, 0),
    "location": "View3D > Sidebar > RayCast Tab",
    "description": "Export scenes to RayCast ray tracer format",
    "category": "Import-Export",
}

import bpy
import json
import os
import math
from mathutils import Vector
from bpy.props import StringProperty, BoolProperty, FloatProperty, EnumProperty, IntProperty
from bpy.types import Operator, Panel, AddonPreferences

def vec_to_array(v):
    """Convert a vector to a simple array"""
    return [v.x, v.y, v.z]

def transformed_vec_to_array(v):
    """
    Converts a Blender Z-up vector to a Y-up vector and returns it as an array.
    
    Standard transformation from Blender (Z-up) to renderer (Y-up):
    - Blender X (+right) → Renderer X (+right)
    - Blender Y (+forward) → Renderer Z (+back, so forward is -Z)
    - Blender Z (+up) → Renderer Y (+up)
    
    But since Blender cameras look down -Y and renderer cameras look down -Z,
    the transformation should map the coordinate systems properly.
    """
    # Standard Z-up to Y-up transformation
    return [v.x, v.z, -v.y]

def color_to_array(c):
    """Convert a color to a simple array"""
    return [c.r, c.g, c.b]

class RAYCAST_OT_export_scene(Operator):
    """Export the current scene to RayCast format"""
    bl_idname = "raycast.export_scene"
    bl_label = "Export Scene"
    
    filepath: StringProperty(
        subtype='FILE_PATH',
    )
    
    export_meshes: BoolProperty(
        name="Export Meshes",
        description="Export mesh objects",
        default=True,
    )
    
    export_lights: BoolProperty(
        name="Export Lights",
        description="Export light sources",
        default=True,
    )
    
    export_materials: BoolProperty(
        name="Export Materials",
        description="Export materials",
        default=True,    )
    
    def execute(self, context):
       
        scene_data = self.collect_scene_data(context)
        
        # Ensure the directory exists
        os.makedirs(os.path.dirname(self.filepath), exist_ok=True)
        
        # Write the scene data to a JSON file
        with open(self.filepath, 'w') as f:
            json.dump(scene_data, f, indent=2)
        
        self.report({'INFO'}, f"Scene exported to {self.filepath}")
        return {'FINISHED'}
    
    def invoke(self, context, event):
        self.filepath = os.path.join(
            os.path.dirname(bpy.data.filepath),
            f"{bpy.context.scene.name}_raycast.json"
        )
        context.window_manager.fileselect_add(self)
        return {'RUNNING_MODAL'}
    
    def collect_scene_data(self, context):
        """Collect all scene data"""
        scene = context.scene
        
        # Initialize scene data
        data = {
            "name": scene.name,
            "objects": [],
            "lights": [],
            "camera": self.export_camera(context.scene.camera),
            "background": {
                "type": "gradient",
                "intensity": 1.0
            }
        }
        
        # Export objects
        if self.export_meshes:
            for obj in scene.objects:
                if obj.type == 'MESH':
                    obj_data = self.export_object(obj)
                    if obj_data:
                        data["objects"].append(obj_data)
        
        # Export lights        if self.export_lights:
            for obj in scene.objects:
                if obj.type == 'LIGHT':
                    light_data = self.export_light(obj)
                    if light_data:
                        data["lights"].append(light_data)
        
        return data
    
    def export_object(self, obj):
        """Export a mesh object"""
        if not obj.data or not obj.data.vertices:
            return None
            
        # Simple sphere export for special case of spheres
        if "sphere" in obj.name.lower():
            scale = obj.scale.x  # Using X scale as radius
            return {
                "type": "sphere",
                "name": obj.name,
                "center": transformed_vec_to_array(obj.location),
                "radius": scale,
                "material": self.export_material(obj) if self.export_materials else {"type": "default"}
            }
            
        # For other objects, export as triangle mesh with fallback to box
        try:
            # Create a temporary copy of the mesh with modifiers applied
            mesh = obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).to_mesh()
            
            # Triangulate the mesh
            import bmesh
            bm = bmesh.new()
            bm.from_mesh(mesh)
            bmesh.ops.triangulate(bm, faces=bm.faces)
            bm.to_mesh(mesh)
            bm.free()
            
            # Apply world transform
            mesh.transform(obj.matrix_world)
            
            # Extract vertex positions
            vertices = [transformed_vec_to_array(v.co) for v in mesh.vertices]
            
            # Extract indices
            indices = []
            for poly in mesh.polygons:
                for i in range(2, len(poly.vertices)):
                    indices.extend([poly.vertices[0], poly.vertices[i-1], poly.vertices[i]])
            
            # Clean up temporary mesh
            obj.to_mesh_clear()
            
            # Use regular mesh export if we have enough data
            if len(vertices) > 0 and len(indices) > 0:
                return {
                    "type": "mesh",
                    "name": obj.name,
                    "vertices": vertices,
                    "indices": indices,
                    "material": self.export_material(obj) if self.export_materials else {"type": "default"}
                }
                
        except Exception as e:
            print(f"Error exporting mesh {obj.name}: {e}. Falling back to box approximation.")
            
        # Fallback to box if mesh export failed
        bbox = [obj.bound_box[0], obj.bound_box[6]]  # min/max corners
        min_pt = Vector(bbox[0]) @ obj.matrix_world
        max_pt = Vector(bbox[1]) @ obj.matrix_world
        
        return {
            "type": "box",
            "name": obj.name,            "min": transformed_vec_to_array(min_pt),
            "max": transformed_vec_to_array(max_pt),
            "material": self.export_material(obj) if self.export_materials else {"type": "default"}
        }
    
    def export_material(self, obj):
        """Export material data"""
        if not obj.active_material:
            return {"type": "lambertian", "color": [0.8, 0.8, 0.8]}
            
        mat = obj.active_material
        
        try:
            # Check for metallic materials
            if hasattr(mat, 'metallic') and mat.metallic > 0.5:
                return {
                    "type": "metal",
                    "color": color_to_array(mat.diffuse_color) if hasattr(mat, 'diffuse_color') else [0.8, 0.8, 0.8],
                    "roughness": mat.roughness if hasattr(mat, 'roughness') else 0.1
                }
            
            # Check for glass/transparent materials via nodes
            if hasattr(mat, 'use_nodes') and mat.use_nodes and mat.node_tree:
                # First check for glass nodes
                for node in mat.node_tree.nodes:
                    if node.type in ['BSDF_GLASS', 'BSDF_REFRACTION']:
                        ior_value = 1.5  # Default IOR value
                        if hasattr(node, 'inputs') and 'IOR' in node.inputs:
                            ior_value = node.inputs['IOR'].default_value
                        return {
                            "type": "dielectric",
                            "ior": ior_value
                        }
                        
                # Then check for emission nodes
                for node in mat.node_tree.nodes:
                    if node.type == 'EMISSION':
                        emission_color = [1.0, 1.0, 1.0]
                        emission_strength = 1.0
                        
                        if hasattr(node, 'inputs'):
                            if 'Color' in node.inputs and hasattr(node.inputs['Color'], 'default_value'):
                                color_value = node.inputs['Color'].default_value
                                emission_color = [color_value[0], color_value[1], color_value[2]]
                            if 'Strength' in node.inputs and hasattr(node.inputs['Strength'], 'default_value'):
                                emission_strength = node.inputs['Strength'].default_value
                        
                        return {
                            "type": "emissive",
                            "color": emission_color,
                            "intensity": emission_strength
                        }
            
            # Try to detect transparent materials based on blend method
            if hasattr(mat, 'blend_method') and mat.blend_method in ['BLEND', 'HASHED', 'CLIP']:
                return {
                    "type": "dielectric",
                    "ior": 1.5  # Default IOR since we can't easily determine it
                }
            
            # Check for emission via properties
            if hasattr(mat, 'use_emission') and mat.use_emission:
                emission_color = [1.0, 1.0, 1.0]  # Default emission color
                emission_strength = 1.0  # Default emission strength
                
                if hasattr(mat, 'emission_color'):
                    emission_color = color_to_array(mat.emission_color)
                if hasattr(mat, 'emission_strength'):
                    emission_strength = mat.emission_strength
                    
                return {
                    "type": "emissive",
                    "color": emission_color,
                    "intensity": emission_strength
                }
            
            # Default to lambertian/diffuse material
            color = [0.8, 0.8, 0.8]  # Default gray
            if hasattr(mat, 'diffuse_color'):
                color = color_to_array(mat.diffuse_color)
            
            return {
                "type": "lambertian",
                "color": color
            }
            
        except Exception as e:
            # If any error occurs, return a default material
            print(f"Error exporting material {mat.name}: {e}")
            return {
                "type": "lambertian", 
                "color": [0.8, 0.8, 0.8]
            }
    
    def export_light(self, obj):
        """Export a light"""
        light = obj.data
        
        intensity = light.energy / 100.0  # Scale for our renderer
        color = color_to_array(light.color)  # Fixed: use color_to_array instead of vec_to_array
        
        if light.type == 'POINT':
            return {
                "type": "point",
                "position": transformed_vec_to_array(obj.location),
                "color": color,
                "intensity": intensity
            }
        elif light.type == 'SUN':
            # Convert to directional light
            direction = obj.matrix_world.to_quaternion() @ Vector((0, 0, -1))
            return {
                "type": "directional",
                "direction": transformed_vec_to_array(direction.normalized()),                "color": color,
                "intensity": intensity
            }
          # Other light types could be implemented here        return None
    
    def export_camera(self, camera_obj):
        """Export camera data"""
        if not camera_obj:
            # Default camera if none exists
            scene = bpy.context.scene
            resolution_x = scene.render.resolution_x
            resolution_y = scene.render.resolution_y
            return {
                "position": [0, 0, 5],
                "lookAt": [0, 0, 0],
                "up": [0, 1, 0],
                "fov": 45,
                "aspect": resolution_x / resolution_y,
                "resolution": [resolution_x, resolution_y],
                "aperture": 0.0,
                "focusDist": 10.0,
                "type": "perspective"
            }
            
        camera = camera_obj.data
        
        # Print debug information
        print("\n=== CAMERA DEBUG INFORMATION ===")
        print(f"Camera name: {camera_obj.name}")
        print(f"Camera location (Blender): {camera_obj.location}")
        print(f"Camera rotation (Blender): {camera_obj.rotation_euler}")
        
        # Get camera basis vectors
        mat = camera_obj.matrix_world
        print(f"Camera matrix world:\n{mat}")
        
        # Debug positions in Blender coordinate system
        blender_position = vec_to_array(mat.translation)
        print(f"Camera position (Blender coords): {blender_position}")
        
        # Debug the forward and up vectors in Blender space
        blender_forward_vector = (mat.to_quaternion() @ Vector((0, 0, -1))).normalized()
        blender_up_vector = (mat.to_quaternion() @ Vector((0, 1, 0))).normalized()
        print(f"Forward vector (Blender coords): {vec_to_array(blender_forward_vector)}")
        print(f"Up vector (Blender coords): {vec_to_array(blender_up_vector)}")
        
        # Transform position to renderer coordinate system
        position = transformed_vec_to_array(mat.translation)
        print(f"Camera position (transformed for renderer): {position}")
        
        # Calculate lookAt point in Blender coordinates first, then transform
        # Use a reasonable distance for lookAt calculation (not too large)
        lookAt_distance = 10.0  # Fixed reasonable distance
        blender_lookAt = mat.translation + blender_forward_vector * lookAt_distance
        look_at = transformed_vec_to_array(blender_lookAt)
        print(f"LookAt point (Blender coords): {vec_to_array(blender_lookAt)}")
        print(f"LookAt point (transformed for renderer): {look_at}")
        
        # Transform up vector
        up = transformed_vec_to_array(blender_up_vector)
        print(f"Up vector (transformed for renderer): {up}")        
        # Get the focus distance
        focus_dist = 10.0  # Default focus distance
        
        if camera.dof.use_dof:
            # Use Blender's DOF distance
            aperture = camera.dof.aperture_fstop / 16.0  # Scale for our renderer
            focus_dist = camera.dof.focus_distance
        else:
            aperture = 0.0  # No DOF by default
            # Try to find a reasonable focus distance
            # If there's an active object, use the distance to that
            active_obj = bpy.context.active_object
            if active_obj and active_obj != camera_obj:
                dist_vec = active_obj.location - camera_obj.location
                focus_dist = dist_vec.length
                print(f"Using distance to {active_obj.name} for focus_dist: {focus_dist}")
            else:
                # Use the lookAt distance as focus distance
                focus_dist = lookAt_distance
                print(f"Using lookAt distance as focus distance: {focus_dist}")
        
        # Debug: Compare with sample scene camera
        print(f"\n--- COMPARISON WITH SAMPLE SCENE ---")
        sample_pos = [0, 1, 3]
        sample_lookAt = [0, 0, -1]
        sample_up = [0, 1, 0]
        print(f"Sample scene camera:")
        print(f"  Position: {sample_pos}")
        print(f"  LookAt:   {sample_lookAt}")
        print(f"  Up:       {sample_up}")
        print(f"Our exported camera:")
        print(f"  Position: {position}")
        print(f"  LookAt:   {look_at}")
        print(f"  Up:       {up}")
        
        # Calculate direction vectors for comparison
        our_direction = [
            look_at[0] - position[0],
            look_at[1] - position[1], 
            look_at[2] - position[2]
        ]
        # Normalize it
        length = math.sqrt(our_direction[0]**2 + our_direction[1]**2 + our_direction[2]**2)
        if length > 0:
            our_direction = [our_direction[0]/length, our_direction[1]/length, our_direction[2]/length]
        
        sample_direction = [
            sample_lookAt[0] - sample_pos[0],
            sample_lookAt[1] - sample_pos[1],
            sample_lookAt[2] - sample_pos[2]
        ]
        # Normalize it
        length = math.sqrt(sample_direction[0]**2 + sample_direction[1]**2 + sample_direction[2]**2)
        if length > 0:
            sample_direction = [sample_direction[0]/length, sample_direction[1]/length, sample_direction[2]/length]
            
        print(f"Our direction vector (normalized): {our_direction}")
        print(f"Sample direction vector (normalized): {sample_direction}")
        print("--------------------------------------")
        print("================================\n")
        
        # Calculate FOV (assumes horizontal)
        fov = math.degrees(camera.angle)
          # Aspect ratio and resolution
        scene = bpy.context.scene
        resolution_x = scene.render.resolution_x
        resolution_y = scene.render.resolution_y
        aspect = resolution_x / resolution_y
        
        # For DOF
        aperture = 0.0  # No DOF by default
        
        return {
            "position": position,
            "lookAt": look_at,
            "up": up,
            "fov": fov,
            "aspect": aspect,
            "resolution": [resolution_x, resolution_y],
            "aperture": aperture,
            "focusDist": focus_dist,
            "type": "perspective"  # Orthographic could be added later
        }

class RAYCAST_PT_export_panel(Panel):
    """RayCast export panel"""
    bl_label = "RayCast Export"
    bl_idname = "RAYCAST_PT_export_panel"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = 'RayCast'
    
    def draw(self, context):
        layout = self.layout
        
        # Export button
        row = layout.row()
        row.operator("raycast.export_scene", text="Export Scene")
        
        # Add options
        box = layout.box()
        box.label(text="Export Options:")
        box.prop(context.scene, "raycast_open_browser")
        box.prop(context.scene, "raycast_auto_render")
        
        # Add render settings
        box = layout.box()
        box.label(text="Render Settings:")
        box.prop(context.scene, "raycast_samples")
        box.prop(context.scene, "raycast_max_bounces")

class RAYCAST_OT_launch_renderer(Operator):
    """Launch the RayCast renderer"""
    bl_idname = "raycast.launch_renderer"
    bl_label = "Launch RayCast Renderer"
    
    def execute(self, context):
        # In a real implementation, this would launch the web-based renderer
        # with the exported JSON file
        self.report({'INFO'}, "Launching RayCast renderer (not implemented)")
        return {'FINISHED'}

def register():
    bpy.utils.register_class(RAYCAST_OT_export_scene)
    bpy.utils.register_class(RAYCAST_PT_export_panel)
    bpy.utils.register_class(RAYCAST_OT_launch_renderer)
    
    # Add custom properties to scene
    bpy.types.Scene.raycast_open_browser = BoolProperty(
        name="Open in Browser",
        description="Open the RayCast renderer in a browser after export",
        default=True
    )
    
    bpy.types.Scene.raycast_auto_render = BoolProperty(
        name="Auto Render",
        description="Automatically start rendering after export",
        default=True
    )
    
    bpy.types.Scene.raycast_samples = IntProperty(
        name="Samples",
        description="Number of samples per pixel",
        default=4,
        min=1,
        max=100
    )
    
    bpy.types.Scene.raycast_max_bounces = IntProperty(
        name="Max Bounces",
        description="Maximum number of ray bounces",
        default=5,
        min=1,
        max=20
    )

def unregister():
    bpy.utils.unregister_class(RAYCAST_OT_export_scene)
    bpy.utils.unregister_class(RAYCAST_PT_export_panel)
    bpy.utils.unregister_class(RAYCAST_OT_launch_renderer)
    
    # Remove custom properties
    del bpy.types.Scene.raycast_open_browser
    del bpy.types.Scene.raycast_auto_render
    del bpy.types.Scene.raycast_samples
    del bpy.types.Scene.raycast_max_bounces

if __name__ == "__main__":
    print("hello world")
    register()