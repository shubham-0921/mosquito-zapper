/** Returns true on phones/tablets — used to branch controls and LOD */
export function isMobile(): boolean {
  return navigator.maxTouchPoints > 1 || /Mobi|Android/i.test(navigator.userAgent)
}
