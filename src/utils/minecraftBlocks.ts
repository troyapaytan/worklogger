/**
 * Minecraft Block Definitions
 * Used by the Minecraft theme for worklog block textures and the block picker.
 * Each block has an inline SVG data URI for its texture pattern.
 */

export interface MinecraftBlock {
  id: string;
  name: string;
  color: string;       // Dominant hex color (fallback & picker preview)
  cssClass: string;     // CSS class name for the texture pattern
}

export const MINECRAFT_BLOCKS: MinecraftBlock[] = [
  { id: 'diamond_ore', name: 'Diamond Ore', color: '#4AEDD9', cssClass: 'mc-diamond-ore' },
  { id: 'gold_block', name: 'Gold Block', color: '#DFA823', cssClass: 'mc-gold-block' },
  { id: 'grass_block', name: 'Grass Block', color: '#5DB75D', cssClass: 'mc-grass-block' },
  { id: 'lapis_ore', name: 'Lapis Ore', color: '#3058B4', cssClass: 'mc-lapis-ore' },
  { id: 'cobblestone', name: 'Cobblestone', color: '#7F7F7F', cssClass: 'mc-cobblestone' },
  { id: 'redstone_ore', name: 'Redstone Ore', color: '#D93636', cssClass: 'mc-redstone-ore' },
  { id: 'emerald_ore', name: 'Emerald Ore', color: '#17BD68', cssClass: 'mc-emerald-ore' },
  { id: 'oak_planks', name: 'Oak Planks', color: '#B8945F', cssClass: 'mc-oak-planks' },
  { id: 'iron_ore', name: 'Iron Ore', color: '#A8866D', cssClass: 'mc-iron-ore' },
  { id: 'coal_ore', name: 'Coal Ore', color: '#4A4A4A', cssClass: 'mc-coal-ore' },
  { id: 'sandstone', name: 'Sandstone', color: '#D9C77B', cssClass: 'mc-sandstone' },
  { id: 'obsidian', name: 'Obsidian', color: '#1B0B29', cssClass: 'mc-obsidian' },
  { id: 'tnt', name: 'TNT', color: '#D93636', cssClass: 'mc-tnt' },
  { id: 'nether_brick', name: 'Nether Brick', color: '#472A27', cssClass: 'mc-nether-brick' },
  { id: 'prismarine', name: 'Prismarine', color: '#5EA4A0', cssClass: 'mc-prismarine' },
  { id: 'purpur_block', name: 'Purpur Block', color: '#A87CA8', cssClass: 'mc-purpur-block' },
];

/** Default block mapping for built-in categories */
export const DEFAULT_CATEGORY_BLOCKS: Record<string, string> = {
  Dev: 'diamond_ore',
  Meeting: 'gold_block',
  Support: 'grass_block',
  Research: 'lapis_ore',
  Other: 'cobblestone',
};

/** Look up a block by its ID */
export function getMinecraftBlock(blockId?: string): MinecraftBlock | undefined {
  if (!blockId) return undefined;
  return MINECRAFT_BLOCKS.find((b) => b.id === blockId);
}

/** Get the CSS class for a block, with fallback to cobblestone */
export function getMinecraftBlockClass(blockId?: string, category?: string): string {
  if (blockId) {
    const block = MINECRAFT_BLOCKS.find((b) => b.id === blockId);
    if (block) return block.cssClass;
  }
  // Fallback: use category default
  const fallbackId = DEFAULT_CATEGORY_BLOCKS[category ?? 'Other'] ?? 'cobblestone';
  const fallback = MINECRAFT_BLOCKS.find((b) => b.id === fallbackId);
  return fallback?.cssClass ?? 'mc-cobblestone';
}
