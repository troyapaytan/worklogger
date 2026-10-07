import random

random.seed(42)
svg_rects = []
for y in range(16):
    for x in range(16):
        noise = random.uniform(0, 1)
        if noise > 0.5:
            # white pixel to lighten
            opacity = (noise - 0.5) * 0.4
            svg_rects.append(f"<rect x='{x}' y='{y}' width='1' height='1' fill='white' fill-opacity='{opacity:.2f}'/>")
        else:
            # black pixel to darken
            opacity = (0.5 - noise) * 0.4
            svg_rects.append(f"<rect x='{x}' y='{y}' width='1' height='1' fill='black' fill-opacity='{opacity:.2f}'/>")

svg_string = f"<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'>{''.join(svg_rects)}</svg>"
svg_encoded = svg_string.replace("'", "%27").replace("<", "%3C").replace(">", "%3E").replace("#", "%23")

css = f'''/* ===== Generic Minecraft Texture Overlay ===== */
.minecraft-texture-overlay {{
  background-image: url("data:image/svg+xml,{svg_encoded}");
  background-size: 16px 16px;
  background-repeat: repeat;
  image-rendering: pixelated;
}}'''

with open('src/minecraft_textures.css', 'w') as f:
    f.write(css)

print('Successfully generated single overlay texture!')
