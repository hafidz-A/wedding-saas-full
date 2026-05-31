/* Canvas colors per palette — accent (bird) + branch wood tones. */
export const ORNAMENT_THEMES = {
  warmCream:        { accent: '#E8553E', accentSoft: '#F4A38F', branch: '#8B6F47', branchDark: '#5C4A3A' },
  darkLuxury:       { accent: '#F5C842', accentSoft: '#FBE3A6', branch: '#5C4A3A', branchDark: '#3A2D22' },
  emeraldGarden:    { accent: '#2D8C4E', accentSoft: '#8FCBA1', branch: '#6E5B3A', branchDark: '#4A3C27' },
  skyEditorial:     { accent: '#3D9BC1', accentSoft: '#A8D5E3', branch: '#7A6B55', branchDark: '#5A4D3D' },
  blossomVelvet:    { accent: '#E06B7B', accentSoft: '#F2B6C1', branch: '#7A5C50', branchDark: '#5A3E35' },
  sunsetClay:       { accent: '#C85A32', accentSoft: '#EAD0A8', branch: '#8B6F47', branchDark: '#6B5235' },
  midnightStardust: { accent: '#E3C08D', accentSoft: '#5D9CEC', branch: '#3A3545', branchDark: '#252030' },
  royalPlum:        { accent: '#F5C842', accentSoft: '#E06B7B', branch: '#6B2040', branchDark: '#3A0E1D' },
  forestMist:       { accent: '#9EE0B1', accentSoft: '#2D8C4E', branch: '#2A4A35', branchDark: '#1A3025' },
  terracottaOasis:  { accent: '#FBE3A6', accentSoft: '#FAF2EA', branch: '#6B2A15', branchDark: '#4D1A0D' },
}

export function resolveOrnamentTheme(paletteKey) {
  return ORNAMENT_THEMES[paletteKey] || ORNAMENT_THEMES.warmCream
}
