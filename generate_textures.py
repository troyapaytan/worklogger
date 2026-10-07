import colorsys
import random

blocks = [
  {"id": "diamond_ore", "color": "#4AEDD9", "cssClass": "mc-diamond-ore"},
  {"id": "gold_block", "color": "#DFA823", "cssClass": "mc-gold-block"},
  {"id": "grass_block", "color": "#5DB75D", "cssClass": "mc-grass-block"},
  {"id": "lapis_ore", "color": "#3058B4", "cssClass": "mc-lapis-ore"},
  {"id": "cobblestone", "color": "#7F7F7F", "cssClass": "mc-cobblestone"},
  {"id": "redstone_ore", "color": "#D93636", "cssClass": "mc-redstone-ore"},
  {"id": "emerald_ore", "color": "#17BD68", "cssClass": "mc-emerald-ore"},
  {"id": "oak_planks", "color": "#B8945F", "cssClass": "mc-oak-planks"},
  {"id": "iron_ore", "color": "#A8866D", "cssClass": "mc-iron-ore"},
  {"id": "coal_ore", "color": "#4A4A4A", "cssClass": "mc-coal-ore"},
  {"id": "sandstone", "color": "#D9C77B", "cssClass": "mc-sandstone"},
  {"id": "obsidian", "color": "#1B0B29", "cssClass": "mc-obsidian"},
  {"id": "tnt", "color": "#D93636", "cssClass": "mc-tnt"},
  {"id": "nether_brick", "color": "#472A27", "cssClass": "mc-nether-brick"},
  {"id": "prismarine", "color": "#5EA4A0", "cssClass": "mc-prismarine"},
  {"id": "purpur_block", "color": "#A87CA8", "cssClass": "mc-purpur-block"}
]

def hex_to_hls(hex_color):
    hex_color = hex_color.lstrip('#')
    r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    return colorsys.rgb_to_hls(r/255.0, g/255.0, b/255.0)

def hls_to_hex(h, l, s):
    r, g, b = colorsys.hls_to_rgb(h, l, s)
    return "#{:02X}{:02X}{:02X}".format(int(r*255), int(g*255), int(b*255))

random.seed(42) # fixed seed for reproducible noise
noise_map = []
for y in range(16):
    row = []
    for x in range(16):
        # generate a random multiplier between 0.8 and 1.2
        row.append(random.uniform(0.75, 1.25))
    noise_map.append(row)

css_output = []
css_output.append("/* ===== Minecraft Block Textures (SVG Data URIs) ===== */")

for block in blocks:
    base_hex = block["color"]
    h, l, s = hex_to_hls(base_hex)
    
    svg_rects = []
    for y in range(16):
        for x in range(16):
            noise = noise_map[y][x]
            new_l = max(0, min(1, l * noise))
            color = hls_to_hex(h, new_l, s)
            svg_rects.append(f"<rect x='{x}' y='{y}' width='1' height='1' fill='{color}'/>")
    
    svg_content = "".join(svg_rects)
    svg_string = f"<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'>{svg_content}</svg>"
    
    # URL encode the SVG (minimal encoding needed for data URI)
    svg_encoded = svg_string.replace("'", "%27").replace("<", "%3C").replace(">", "%3E").replace("#", "%23")
    
    css = f""".{block["cssClass"]} {{
  background-color: {base_hex} !important;
  background-image: url("data:image/svg+xml,{svg_encoded}") !important;
  background-size: 32px 32px !important;
  image-rendering: pixelated;
  border-radius: 0 !important;
}}"""
    css_output.append(css)

with open('C:/Users/tap7325/Documents/TAP-AI/WORKLOGGER/generated_textures.css', 'w') as f:
    f.write("\n\n".join(css_output))

print("Textures generated.")
