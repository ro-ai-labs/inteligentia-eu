"""inteligentia box, path-traced in Blender Cycles, modelled on the product film.
The case: matte bead-blasted blue aluminium, low and wide, a top shell on a base tray (seam),
two clusters of large flat-top hex vents on the front (clipped at their edges, solid below),
hex vents on the sides, a field of round holes on top. In the middle of the front, a round
dial window (chrome bezel, smoked glass) the page animates behind. Inside, a real computer you
can see through the vents: carrier board, compute module under a finned heatsink and fan,
NVMe SSD, GPIO header, rear I/O, cables, and board LEDs, softly lit from within.

usage: python box.py test [yaw]       -> one frame, quick
       python box.py all [start end]  -> the turntable frames + positions json
"""
import bpy, bmesh, json, math, os, sys
from mathutils import Matrix, Vector
from bpy_extras.object_utils import world_to_camera_view

HERE = os.path.dirname(os.path.abspath(__file__))
MODE = sys.argv[1] if len(sys.argv) > 1 else "test"
OUT = os.path.join(HERE, "out")
os.makedirs(OUT, exist_ok=True)

# ---------------- real-world size (metres) ----------------
W, D, H = 0.130, 0.110, 0.058       # width (x), depth (y), height (z): the film's ~2.2:1 front
T = 0.0016                          # wall
BEV = 0.0014                        # outer edge radius
SEAM = -H / 2 + 0.0048              # shell / base tray parting line
FOOT = 0.0012                       # rubber feet lift the box
YAWS = [-36 + 3 * i for i in range(25)]  # turntable: -36..+36 degrees

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene

def srgb(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def mat(name, **p):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    for k, v in p.items():
        b.inputs[k].default_value = v
    return m, b

# ---------------- materials ----------------
case_m, case_b = mat("anodized", **{"Base Color": (srgb(22), srgb(108), srgb(200), 1), "Metallic": 1.0, "Roughness": 0.5,
                                     "Coat Weight": 0.08, "Coat Roughness": 0.35})
# bead-blasted micro texture
nt = case_m.node_tree
noise = nt.nodes.new("ShaderNodeTexNoise"); noise.inputs["Scale"].default_value = 2600; noise.inputs["Detail"].default_value = 2
bump = nt.nodes.new("ShaderNodeBump"); bump.inputs["Strength"].default_value = 0.035; bump.inputs["Distance"].default_value = 0.0002
nt.links.new(noise.outputs["Fac"], bump.inputs["Height"]); nt.links.new(bump.outputs["Normal"], case_b.inputs["Normal"])

chrome_m, _ = mat("chrome", **{"Base Color": (0.86, 0.87, 0.89, 1), "Metallic": 1.0, "Roughness": 0.1})
black_m, _ = mat("black plastic", **{"Base Color": (0.012, 0.012, 0.014, 1), "Roughness": 0.45})
sink_m, _ = mat("heatsink", **{"Base Color": (0.03, 0.03, 0.035, 1), "Metallic": 0.9, "Roughness": 0.45})
pcb_m, _ = mat("pcb", **{"Base Color": (0.008, 0.03, 0.016, 1), "Roughness": 0.32, "Coat Weight": 0.4, "Coat Roughness": 0.15})
som_m, _ = mat("module pcb", **{"Base Color": (0.01, 0.045, 0.02, 1), "Roughness": 0.3, "Coat Weight": 0.4})
chip_m, _ = mat("chip", **{"Base Color": (0.02, 0.02, 0.022, 1), "Roughness": 0.55})
metal_m, _ = mat("connector metal", **{"Base Color": (0.7, 0.71, 0.73, 1), "Metallic": 1.0, "Roughness": 0.28})
brass_m, _ = mat("brass", **{"Base Color": (0.75, 0.56, 0.25, 1), "Metallic": 1.0, "Roughness": 0.3})
gold_m, _ = mat("gold pins", **{"Base Color": (0.95, 0.72, 0.3, 1), "Metallic": 1.0, "Roughness": 0.2})
label_m, _ = mat("ssd label", **{"Base Color": (0.75, 0.76, 0.78, 1), "Roughness": 0.45})
wire_r, _ = mat("wire red", **{"Base Color": (0.5, 0.02, 0.02, 1), "Roughness": 0.4})
wire_k, _ = mat("wire black", **{"Base Color": (0.01, 0.01, 0.01, 1), "Roughness": 0.4})
def emit(name, rgb, strength):
    m = bpy.data.materials.new(name); m.use_nodes = True; nt2 = m.node_tree
    for n in list(nt2.nodes):
        if n.type != "OUTPUT_MATERIAL": nt2.nodes.remove(n)
    e = nt2.nodes.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (*rgb, 1); e.inputs["Strength"].default_value = strength
    nt2.links.new(e.outputs["Emission"], nt2.nodes["Material Output"].inputs["Surface"]); return m
led_g = emit("board led green", (0.2, 1.0, 0.45), 40); led_b = emit("board led blue", (0.3, 0.6, 1.0), 40)
glass_m, _ = mat("smoked glass", **{"Base Color": (0.004, 0.006, 0.01, 1), "Roughness": 0.06, "Coat Weight": 0.0, "Specular IOR Level": 0.06})
lens_m, _ = mat("led lens", **{"Base Color": (0.03, 0.035, 0.04, 1), "Roughness": 0.08, "Coat Weight": 1.0, "Coat Roughness": 0.02})

def link(ob):
    bpy.context.collection.objects.link(ob); return ob

def mesh_obj(name, bm, material):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me)); ob.data.materials.append(material)
    return ob

def apply_mods(ob):
    bpy.context.view_layer.objects.active = ob
    for m in list(ob.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)

# ---------------- the shell ----------------
def cube(name, size, loc=(0, 0, 0), material=None):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    ob = mesh_obj(name, bm, material or case_m); ob.location = loc; return ob
def boolean(target, tool, op="DIFFERENCE"):
    m = target.modifiers.new("b", "BOOLEAN"); m.object = tool; m.operation = op; m.solver = "EXACT"
    apply_mods(target); bpy.data.objects.remove(tool)

shell = cube("shell", (W, D, H))
bev = shell.modifiers.new("bev", "BEVEL"); bev.width = BEV; bev.segments = 5; bev.limit_method = "NONE"
apply_mods(shell)
boolean(shell, cube("inner", (W - 2 * T, D - 2 * T, H - 2 * T)))
# parting line between the top shell and the base tray
groove = cube("groove", (W + 0.004, D + 0.004, 0.00045), (0, 0, SEAM))
boolean(groove, cube("groove in", (W - 0.0007, D - 0.0007, 0.002), (0, 0, SEAM)))
boolean(shell, groove)

LOGO_R = H * 0.40                 # dial radius on the front
ZC = 0.0025                       # dial centre height (the film's logo sits a little high)
LED_X0 = W / 2 - 0.0095           # status LED row, bottom-right of the front
LED_Z = -H / 2 + 0.0085
LEDS = [(LED_X0 - i * 0.0055, LED_Z) for i in range(4)]

# a face's frame: columns u (right), v (up), n (outward), origin at the face centre
def frame(U, V, N, C):
    M = Matrix((U, V, N)).transposed().to_4x4(); M.translation = Vector(C); return M
F_FRONT = frame((1, 0, 0), (0, 0, 1), (0, -1, 0), (0, -D / 2, 0))
F_RIGHT = frame((0, 1, 0), (0, 0, 1), (1, 0, 0), (W / 2, 0, 0))
F_LEFT = frame((0, -1, 0), (0, 0, 1), (-1, 0, 0), (-W / 2, 0, 0))
F_TOP = frame((1, 0, 0), (0, 1, 0), (0, 0, 1), (0, 0, H / 2))

def hex_cluster(F, u0, u1, v0, v1, r=0.0043, bar=0.0013):
    """flat-top hex vents filling [u0,u1]x[v0,v1] of a face, clipped at the edges like the film's"""
    bm = bmesh.new()
    dx = 1.5 * r + bar * 0.866; dy = math.sqrt(3) * r + bar
    cu, cv = (u0 + u1) / 2, (v0 + v1) / 2
    nu = int((u1 - u0) / dx / 2) + 2; nv = int((v1 - v0) / dy / 2) + 2
    for a in range(-nu, nu + 1):
        for b in range(-nv, nv + 1):
            uu = cu + a * dx; vv = cv + b * dy + (a % 2) * dy / 2
            if u0 - 0.4 * r <= uu <= u1 + 0.4 * r and v0 - 0.4 * r <= vv <= v1 + 0.4 * r:
                bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r, radius2=r, depth=T * 6,
                                      matrix=F @ Matrix.Translation((uu, vv, 0)) @ Matrix.Rotation(math.pi / 6, 4, "Z"))  # flat top, like the film
    ob = mesh_obj("vents", bm, case_m)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=(u1 - u0, v1 - v0, T * 8), verts=bm.verts)
    bmesh.ops.transform(bm, matrix=F @ Matrix.Translation((cu, cv, 0)), verts=bm.verts)
    boolean(ob, mesh_obj("region", bm, case_m), "INTERSECT")
    return ob

V0, V1 = -0.0075, H / 2 - 0.0065                 # the vent band: upper part of the walls, solid below
inner_u = LOGO_R + 0.0035
clusters = [hex_cluster(F_FRONT, -W / 2 + 0.0065, -inner_u, V0, V1), hex_cluster(F_FRONT, inner_u, W / 2 - 0.0065, V0, V1),
            hex_cluster(F_RIGHT, -D / 2 + 0.009, D / 2 - 0.009, V0, V1), hex_cluster(F_LEFT, -D / 2 + 0.009, D / 2 - 0.009, V0, V1)]
cut = bmesh.new()
for ob in clusters:
    cut.from_mesh(ob.data); bpy.data.objects.remove(ob)
# the top: a field of round holes, staggered
p = 0.0047
for j in range(-12, 13):
    for i in range(-15, 16):
        u = i * p + (j % 2) * p / 2; v = j * p * 0.866
        if abs(u) <= W / 2 - 0.009 and abs(v) <= D / 2 - 0.009:
            bmesh.ops.create_cone(cut, cap_ends=True, segments=16, radius1=0.00155, radius2=0.00155, depth=T * 6,
                                  matrix=F_TOP @ Matrix.Translation((u, v, 0)))
# status LED windows and the dial opening
for x, z in LEDS:
    bmesh.ops.create_cone(cut, cap_ends=True, segments=24, radius1=0.0011, radius2=0.0011, depth=T * 6,
                          matrix=Matrix.Translation((x, -D / 2, z)) @ Matrix.Rotation(math.radians(90), 4, "X"))
bmesh.ops.create_cone(cut, cap_ends=True, segments=128, radius1=LOGO_R - 0.0004, radius2=LOGO_R - 0.0004, depth=T * 6,
                      matrix=Matrix.Translation((0, -D / 2, ZC)) @ Matrix.Rotation(math.radians(90), 4, "X"))
boolean(shell, mesh_obj("cutter", cut, case_m))
bpy.context.view_layer.objects.active = shell
shell.select_set(True); bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))

# ---------------- the dial window: chrome bezel + smoked glass ----------------
# the animated icon (LED ring + spiral) is drawn live by the page behind this glass
GLASS_R = LOGO_R - 0.0028                # visible glass radius
BEZ_IN, BEZ_OUT = GLASS_R, LOGO_R        # bezel ring
GLASS_Y = -D / 2 + 0.0004                # glass sits just behind the face
def disc(name, r, depth, y, material, segs=128):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=depth)
    ob = mesh_obj(name, bm, material); ob.rotation_euler = (math.radians(90), 0, 0); ob.location = (0, y, ZC); return ob
bezel_m, _ = mat("bezel", **{"Base Color": (0.62, 0.65, 0.7, 1), "Metallic": 1.0, "Roughness": 0.2})
bez = disc("bezel", BEZ_OUT, 0.0022, -D / 2 - 0.0002, bezel_m)
bore = disc("bezel bore", BEZ_IN, 0.01, -D / 2, chrome_m)
m = bez.modifiers.new("bore", "BOOLEAN"); m.object = bore; m.solver = "EXACT"; apply_mods(bez)
bv = bez.modifiers.new("bev", "BEVEL"); bv.width = 0.00045; bv.segments = 4; bv.limit_method = "ANGLE"
apply_mods(bez); bpy.data.objects.remove(bore)
bpy.context.view_layer.objects.active = bez; bez.select_set(True); bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
glass = disc("glass", GLASS_R + 0.0004, 0.0008, GLASS_Y, glass_m)
backing = disc("display", GLASS_R + 0.0004, 0.0006, GLASS_Y + 0.0012, black_m)

# ---------------- the computer inside (what you see through the vents) ----------------
import random
rnd = random.Random(7)
def box(name, size, loc, material, rot=(0, 0, 0)):
    ob = cube(name, size, loc, material); ob.rotation_euler = rot; return ob
def cyl(name, r, h, loc, material, axis="Z", segs=24):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=segs, radius1=r, radius2=r, depth=h)
    ob = mesh_obj(name, bm, material); ob.location = loc
    if axis == "Y": ob.rotation_euler = (math.radians(90), 0, 0)
    return ob
Z0 = -H / 2 + T                              # inside floor
CB_W, CB_D, PCB_T = 0.100, 0.079, 0.0016     # carrier board, dev-kit size
CB_Z = Z0 + 0.0045                           # on standoffs
CB_Y = 0.006                                 # toward the back, where the ports are
top = CB_Z + PCB_T
for sx in (-1, 1):
    for sy in (-1, 1):
        cyl("standoff", 0.0022, 0.0045, (sx * 0.045, CB_Y + sy * 0.0345, Z0 + 0.00225), brass_m, segs=6)
box("carrier", (CB_W, CB_D, PCB_T), (0, CB_Y, CB_Z + PCB_T / 2), pcb_m)
# rear I/O: two USB stacks, Ethernet, DisplayPort, DC jack
yb = CB_Y + CB_D / 2 - 0.007
for k, (w, d, h, x) in enumerate([(0.0145, 0.014, 0.0155, -0.036), (0.0145, 0.014, 0.0155, -0.019), (0.016, 0.021, 0.0135, 0.001), (0.019, 0.009, 0.008, 0.022), (0.009, 0.008, 0.0065, 0.040)]):
    box(f"port{k}", (w, d, h), (x, yb + (0.014 - d) / 2, top + h / 2), metal_m)
# 40-pin GPIO header along the front edge
yf = CB_Y - CB_D / 2 + 0.004
box("gpio base", (0.051, 0.005, 0.0025), (0.012, yf, top + 0.00125), chip_m)
for i in range(20):
    for j in range(2):
        box("pin", (0.00064, 0.00064, 0.0085), (0.012 - 0.0241 + i * 0.00254, yf - 0.00127 + j * 0.00254, top + 0.0045), gold_m)
# NVMe SSD, front-left, with its label
ssd_x, ssd_y = -0.03, CB_Y - 0.012
box("ssd pcb", (0.022, 0.042, 0.0008), (ssd_x, ssd_y, top + 0.0032), som_m)
box("ssd controller", (0.009, 0.009, 0.0012), (ssd_x, ssd_y - 0.013, top + 0.0042), chip_m)
box("ssd label", (0.019, 0.026, 0.0002), (ssd_x, ssd_y + 0.004, top + 0.0037), label_m)
box("m2 socket", (0.022, 0.004, 0.0035), (ssd_x, ssd_y + 0.022, top + 0.00175), chip_m)
# scattered parts
for i in range(60):
    x = rnd.uniform(-CB_W / 2 + 0.004, CB_W / 2 - 0.004); y = rnd.uniform(CB_Y - CB_D / 2 + 0.008, CB_Y + CB_D / 2 - 0.016)
    if abs(x - 0.002) < 0.037 and abs(y - (CB_Y + 0.002)) < 0.027: continue
    if abs(x - ssd_x) < 0.013 and abs(y - ssd_y) < 0.025: continue
    if rnd.random() < 0.35:
        cyl("cap", rnd.uniform(0.0012, 0.0025), 0.0035, (x, y, top + 0.00175), metal_m, segs=12)
    else:
        w = rnd.uniform(0.0015, 0.006); box("ic", (w, w * rnd.uniform(0.6, 1.4), rnd.uniform(0.0006, 0.0014)), (x, y, top + 0.0005), chip_m)
# the compute module, its heatsink and fan
mx, my = 0.002, CB_Y + 0.002
box("module connector", (0.06, 0.006, 0.004), (mx, my + 0.018, top + 0.002), chip_m)
som_z = top + 0.0045
box("module", (0.0696, 0.045, 0.0012), (mx, my, som_z + 0.0006), som_m)
for k in range(6):
    box("module chip", (0.007, 0.005, 0.0009), (mx - 0.03 + k * 0.0075, my - 0.0195, som_z + 0.0016), chip_m)
hs_z = som_z + 0.0012
box("heatsink base", (0.062, 0.042, 0.0028), (mx, my, hs_z + 0.0014), sink_m)
fh = 0.0135
for i in range(17):
    box("fin", (0.0007, 0.042, fh), (mx - 0.0304 + i * 0.0038, my, hs_z + 0.0028 + fh / 2), sink_m)
fan_z = hs_z + 0.0028 + fh + 0.0055
fan = box("fan frame", (0.04, 0.04, 0.011), (mx, my, fan_z), black_m)
boolean(fan, cyl("fan bore", 0.0185, 0.02, (mx, my, fan_z), black_m, segs=48))
cyl("fan hub", 0.0075, 0.009, (mx, my, fan_z), black_m, segs=32)
cyl("fan sticker", 0.0062, 0.0002, (mx, my, fan_z + 0.0046), label_m, segs=32)
for i in range(7):
    a = i * 2 * math.pi / 7
    bl = box("blade", (0.0115, 0.009, 0.0006), (mx + math.cos(a) * 0.013, my + math.sin(a) * 0.013, fan_z), black_m)
    bl.rotation_mode = "ZXY"; bl.rotation_euler = (math.radians(30), 0, a + math.pi / 2)
# fan lead: red and black wires down to the board
for k, wm in enumerate((wire_r, wire_k)):
    cu = bpy.data.curves.new("lead", "CURVE"); cu.dimensions = "3D"; cu.bevel_depth = 0.0005; cu.bevel_resolution = 2
    sp = cu.splines.new("BEZIER"); sp.bezier_points.add(2)
    pts = [(mx + 0.02, my - 0.014 + k * 0.0011, fan_z), (mx + 0.033, my - 0.02 + k * 0.0011, fan_z - 0.004), (mx + 0.037, my - 0.028 + k * 0.0011, top + 0.003)]
    for bp, q in zip(sp.bezier_points, pts):
        bp.co = q; bp.handle_left_type = bp.handle_right_type = "AUTO"
    ob = link(bpy.data.objects.new("lead", cu)); ob.data.materials.append(wm)
box("fan plug", (0.005, 0.004, 0.003), (mx + 0.037, my - 0.028, top + 0.0015), label_m)
# board LEDs, and a little light under the lid so you can see in
for x, y, mtl in [(0.044, yf + 0.004, led_g), (0.040, yf + 0.004, led_b), (-0.044, CB_Y + 0.02, led_b)]:
    box("board led", (0.0016, 0.0009, 0.0006), (x, y, top + 0.0003), mtl)
inner_light = bpy.data.lights.new("inside", "POINT"); inner_light.energy = 0.7; inner_light.color = (0.85, 0.92, 1.0); inner_light.shadow_soft_size = 0.008
link(bpy.data.objects.new("inside", inner_light)).location = (-0.012, -0.036, H / 2 - 0.007)
# rubber feet
for sx in (-1, 1):
    for sy in (-1, 1):
        cyl("foot", 0.0045, FOOT, (sx * (W / 2 - 0.012), sy * (D / 2 - 0.012), -H / 2 - FOOT / 2), black_m)
# LED lenses, just behind the status windows
for i, (x, z) in enumerate(LEDS):
    cyl(f"led{i}", 0.0011, 0.001, (x, -D / 2 + T * 0.75, z), lens_m, axis="Y")

# everything that turns with the turntable
pivot = link(bpy.data.objects.new("pivot", None))
for ob in list(scene.objects):
    if ob is not pivot and (ob.type in {"MESH", "CURVE"} or ob.name == "inside"):
        ob.parent = pivot

# ---------------- floor: shadow catcher ----------------
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=1.5)
floor = mesh_obj("floor", bm, black_m); floor.location = (0, 0, -H / 2 - FOOT); floor.is_shadow_catcher = True

# ---------------- light ----------------
world = bpy.data.worlds.new("studio"); scene.world = world; world.use_nodes = True
wn = world.node_tree
env = wn.nodes.new("ShaderNodeTexEnvironment"); env.image = bpy.data.images.load(os.path.join(HERE, "studio.hdr"))
mapping = wn.nodes.new("ShaderNodeMapping"); coord = wn.nodes.new("ShaderNodeTexCoord")
mapping.inputs["Rotation"].default_value = (0, 0, math.radians(200))
wn.links.new(coord.outputs["Generated"], mapping.inputs["Vector"]); wn.links.new(mapping.outputs["Vector"], env.inputs["Vector"])
wn.links.new(env.outputs["Color"], wn.nodes["Background"].inputs["Color"])
wn.nodes["Background"].inputs["Strength"].default_value = 0.4

def area(name, size, power, loc, color=(1, 1, 1), shape="RECTANGLE", size_y=None):
    L = bpy.data.lights.new(name, "AREA"); L.energy = power; L.color = color; L.shape = shape
    L.size = size; L.size_y = size_y or size
    ob = link(bpy.data.objects.new(name, L)); ob.location = loc
    d = Vector((0, 0, 0)) - Vector(loc); ob.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    ob.visible_camera = False
    return ob
area("key softbox", 0.45, 30, (-0.25, -0.34, 0.30))
area("top", 0.6, 4, (0.02, 0.05, 0.55), size_y=0.35)
area("strip left", 0.06, 14, (-0.42, -0.05, 0.12), shape="RECTANGLE", size_y=0.6)
area("strip right", 0.06, 10, (0.45, -0.18, 0.1), color=(0.82, 0.9, 1.0), size_y=0.6)
area("rim", 0.3, 26, (0.12, 0.45, 0.2), color=(0.55, 0.72, 1.0))

# ---------------- camera ----------------
cam_d = bpy.data.cameras.new("cam"); cam_d.lens = 85; cam_d.sensor_width = 36
cam_d.dof.use_dof = True; cam_d.dof.aperture_fstop = 8; cam_d.dof.focus_distance = 0.55
cam = link(bpy.data.objects.new("cam", cam_d)); scene.camera = cam
cam.location = (0.25, -0.516, 0.238)
tgt = Vector((0, 0, -0.004))
cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
cam_d.dof.focus_distance = (tgt - cam.location).length

# ---------------- render settings ----------------
r = scene.render
r.engine = "CYCLES"
scene.cycles.device = "CPU"
r.resolution_x = r.resolution_y = 1000
r.film_transparent = True
r.image_settings.file_format = "PNG"; r.image_settings.color_mode = "RGBA"; r.image_settings.color_depth = "8"
scene.view_settings.view_transform = "Standard"; scene.view_settings.look = "None"; scene.view_settings.exposure = -0.9
scene.cycles.use_denoising = True
scene.cycles.samples = 48 if MODE == "test" else 96
scene.cycles.adaptive_threshold = 0.02
scene.cycles.max_bounces = 8; scene.cycles.glossy_bounces = 6
scene.cycles.use_auto_tile = False

def project(point):
    p = world_to_camera_view(scene, cam, point)
    return [round(p.x, 4), round(1 - p.y, 4)]

def render(idx, yaw):
    pivot.rotation_euler = (0, 0, math.radians(yaw))
    bpy.context.view_layer.update()
    r.filepath = os.path.join(OUT, idx + ".png" if isinstance(idx, str) else f"f{idx:02d}.png")
    bpy.ops.render.render(write_still=True)
    M = pivot.matrix_world
    return {"yaw": yaw,
            "logo": project(M @ Vector((0, -D / 2, ZC))),
            "dial": [project(M @ Vector((x * GLASS_R, GLASS_Y - 0.0004, z * GLASS_R + ZC))) for x, z in ((-1, 1), (1, 1), (1, -1), (-1, -1))],
            "leds": [project(M @ Vector((x, -D / 2, z))) for x, z in LEDS]}

if MODE == "test":
    yaw = float(sys.argv[2]) if len(sys.argv) > 2 else 0
    info = render("test", yaw)
    json.dump(info, open(os.path.join(OUT, "test.json"), "w"))
    print("rendered test")
else:
    a = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    b = int(sys.argv[3]) if len(sys.argv) > 3 else len(YAWS)
    pos = {}
    for i in range(a, b):
        pos[i] = render(i, YAWS[i]); print("frame", i, flush=True)
    json.dump(pos, open(os.path.join(OUT, f"positions_{a}_{b}.json"), "w"))
