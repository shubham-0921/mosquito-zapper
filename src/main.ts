import { Engine } from '@babylonjs/core/Engines/engine'
import { Game } from './Game'
import { isMobile } from './input/DeviceDetect'

const canvas  = document.getElementById('renderCanvas') as HTMLCanvasElement
const uiRoot  = document.getElementById('ui-root') as HTMLDivElement

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: true,
  stencil: true,
})

// On high-DPI mobile screens, render at 67% resolution then upscale —
// nearly invisible at small screen sizes, significant GPU saving.
if (isMobile()) {
  engine.setHardwareScalingLevel(1.5)
}

const game = new Game(engine, canvas, uiRoot)

engine.runRenderLoop(() => { game.update() })
window.addEventListener('resize', () => { engine.resize() })
