/**
 * Color and gradient utilities for shifts and calendar cards.
 * Generates dynamic, high-contrast, harmonious two-tone gradients
 * from a single user-selected HEX color.
 */

export interface ShiftGradient {
  background: string;
  gradientStart: string;
  gradientEnd: string;
  borderColor: string;
  textColor: string;
}

/**
 * Converts a hex color (#RRGGBB) to HSL components.
 */
export function hexToHsl(hex: string): [number, number, number] {
  let clean = (hex || '').replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  if (clean.length !== 6) {
    return [175, 84, 32]; // Default teal fallback
  }

  const num = parseInt(clean, 16);
  const r = (num >> 16) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Converts HSL components to hex string.
 */
export function hslToHex(h: number, s: number, l: number): string {
  const hNorm = ((h % 360) + 360) % 360;
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const lNorm = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs(((hNorm / 60) % 2) - 1));
  const m = lNorm - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;

  if (hNorm >= 0 && hNorm < 60) {
    r = c; g = x; b = 0;
  } else if (hNorm >= 60 && hNorm < 120) {
    r = x; g = c; b = 0;
  } else if (hNorm >= 120 && hNorm < 180) {
    r = 0; g = c; b = x;
  } else if (hNorm >= 180 && hNorm < 240) {
    r = 0; g = x; b = c;
  } else if (hNorm >= 240 && hNorm < 300) {
    r = x; g = 0; b = c;
  } else {
    r = c; g = 0; b = x;
  }

  const toHex = (val: number) => {
    const hex = Math.round((val + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Generates a two-tone harmonious gradient and styles based on a single hex color.
 */
export function getShiftGradient(baseHex: string): ShiftGradient {
  const cleanHex = (baseHex || '#0d9488').trim();
  const [h, s, l] = hexToHsl(cleanHex);

  // If low saturation (grayscale/black/white)
  if (s < 12) {
    const startL = Math.min(85, l + 12);
    const endL = Math.max(15, l - 12);
    const startColor = hslToHex(h, s, startL);
    const endColor = hslToHex(h, s, endL);
    return {
      background: `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`,
      gradientStart: startColor,
      gradientEnd: endColor,
      borderColor: 'rgba(255, 255, 255, 0.22)',
      textColor: l > 65 ? '#0f172a' : '#ffffff',
    };
  }

  // Chromatic color: Harmonious Hue Shift + Lightness gradient
  // Top-left is slightly brighter (+7% to +10%) with a gentle hue shift
  // Bottom-right is deeper (-8% to -12%) with opposite hue shift
  const startHue = (h + 8) % 360;
  const startLightness = Math.min(75, Math.max(35, l + 8));
  const startSat = Math.min(100, s + 4);
  const startColor = hslToHex(startHue, startSat, startLightness);

  const endHue = (h - 8 + 360) % 360;
  const endLightness = Math.max(22, l - 9);
  const endSat = Math.min(100, Math.max(45, s - 3));
  const endColor = hslToHex(endHue, endSat, endLightness);

  // Text color based on perceived lightness of the base color
  const textColor = l > 68 ? '#090d16' : '#ffffff';

  return {
    background: `linear-gradient(135deg, ${startColor} 0%, ${endColor} 100%)`,
    gradientStart: startColor,
    gradientEnd: endColor,
    borderColor: 'rgba(255, 255, 255, 0.22)',
    textColor,
  };
}
