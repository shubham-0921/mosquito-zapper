import { Engine } from '@babylonjs/core/Engines/engine'
import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { PointLight } from '@babylonjs/core/Lights/pointLight'
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight'
import { LampManager } from './LampManager'

// 5 lamps spread around the room — each gets its own stand, shade, and bulb
const LAMP_CONFIGS = [
  { pos: new Vector3( 3.0, 1.15, -3.5), label: 'back-right' },
  { pos: new Vector3(-3.5, 1.0,  -3.0), label: 'back-left'  },
  { pos: new Vector3(-3.5, 1.0,   3.2), label: 'front-left' },
  { pos: new Vector3( 3.5, 1.0,   3.2), label: 'front-right'},
  { pos: new Vector3( 0.0, 1.0,   0.0), label: 'center'     },
]

export class SceneSetup {
  private scene: Scene
  private lampManager: LampManager

  constructor(engine: Engine, _canvas: HTMLCanvasElement) {
    this.scene = new Scene(engine)
    this.scene.clearColor = new Color4(0.02, 0.01, 0.01, 1)
    this.lampManager = new LampManager()
    this.buildRoom()
    this.buildLighting()
    this.buildFurniture()
  }

  private buildRoom() {
    const scene = this.scene

    const wallMat = new StandardMaterial('wallMat', scene)
    wallMat.diffuseColor = new Color3(0.55, 0.48, 0.38)
    wallMat.specularColor = new Color3(0.05, 0.05, 0.05)

    const floorMat = new StandardMaterial('floorMat', scene)
    floorMat.diffuseColor = new Color3(0.3, 0.2, 0.1)

    const ceilMat = new StandardMaterial('ceilMat', scene)
    ceilMat.diffuseColor = new Color3(0.6, 0.55, 0.48)

    const floor = MeshBuilder.CreateBox('floor', { width: 10, height: 0.1, depth: 10 }, scene)
    floor.position.y = -0.05
    floor.material = floorMat

    const ceiling = MeshBuilder.CreateBox('ceiling', { width: 10, height: 0.1, depth: 10 }, scene)
    ceiling.position.y = 4.05
    ceiling.material = ceilMat

    const wallDefs = [
      { pos: new Vector3( 0, 2, -5), rot: 0           },
      { pos: new Vector3( 0, 2,  5), rot: 0           },
      { pos: new Vector3(-5, 2,  0), rot: Math.PI / 2 },
      { pos: new Vector3( 5, 2,  0), rot: Math.PI / 2 },
    ]
    wallDefs.forEach((def, i) => {
      const wall = MeshBuilder.CreateBox(`wall${i}`, { width: 10, height: 4, depth: 0.1 }, scene)
      wall.position = def.pos
      wall.rotation.y = def.rot
      wall.material = wallMat
    })
  }

  private buildLighting() {
    const scene = this.scene

    // Virtually no ambient — room is dark, only lamps provide light
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene)
    ambient.diffuse = new Color3(0.06, 0.04, 0.02)
    ambient.intensity = 0.1

    const woodMat = new StandardMaterial('lampStandMat', scene)
    woodMat.diffuseColor = new Color3(0.35, 0.2, 0.08)

    LAMP_CONFIGS.forEach((cfg, i) => {
      const p = cfg.pos

      // Stand
      const base = MeshBuilder.CreateCylinder(`lampBase${i}`, { diameter: 0.1, height: 0.3 }, scene)
      base.position = new Vector3(p.x, p.y - 0.2, p.z)
      base.material = woodMat

      // Shade
      const shade = MeshBuilder.CreateCylinder(`lampShade${i}`, {
        diameterTop: 0.26, diameterBottom: 0.08, height: 0.22,
      }, scene)
      shade.position = new Vector3(p.x, p.y + 0.0, p.z)
      const shadeMat = new StandardMaterial(`shadeMat${i}`, scene)
      shadeMat.diffuseColor = new Color3(0.85, 0.75, 0.4)
      shadeMat.emissiveColor = Color3.Black()
      shade.material = shadeMat

      // Bulb
      const bulb = MeshBuilder.CreateSphere(`bulb${i}`, { diameter: 0.07 }, scene)
      bulb.position = new Vector3(p.x, p.y - 0.05, p.z)
      const bulbMat = new StandardMaterial(`bulbMat${i}`, scene)
      bulbMat.diffuseColor = new Color3(1, 0.95, 0.6)
      bulbMat.emissiveColor = new Color3(0.05, 0.04, 0.02) // dim when off
      bulb.material = bulbMat

      // PointLight — starts disabled, LampManager enables the chosen one
      const light = new PointLight(`lampLight${i}`, p.clone(), scene)
      light.diffuse = new Color3(1.0, 0.75, 0.3)
      light.specular = new Color3(0.8, 0.5, 0.1)
      light.intensity = 0
      light.range = 8
      light.setEnabled(false)

      // Flicker animation only while active
      let t = Math.random() * 100
      scene.registerBeforeRender(() => {
        if (!light.isEnabled()) return
        t += scene.getEngine().getDeltaTime() / 1000
        light.intensity = 1.5
          + 0.05 * Math.sin(t * 7.3)
          + 0.03 * Math.sin(t * 19.1)
          + 0.02 * Math.sin(t * 3.7)
      })

      this.lampManager.addLamp({ position: p.clone(), light, bulbMat, shadeMat })
    })
  }

  private buildFurniture() {
    const scene = this.scene

    const woodMat = new StandardMaterial('woodMat', scene)
    woodMat.diffuseColor = new Color3(0.35, 0.2, 0.08)

    const bedMat = new StandardMaterial('bedMat', scene)
    bedMat.diffuseColor = new Color3(0.45, 0.08, 0.08)

    // Bed
    const bed = MeshBuilder.CreateBox('bed', { width: 2, height: 0.5, depth: 3.5 }, scene)
    bed.position = new Vector3(-3, 0.25, -2)
    bed.material = bedMat

    // Small tables / stands at each lamp position
    const tablePositions = [
      new Vector3( 3.0, 0.35, -3.5),
      new Vector3(-3.5, 0.35, -3.0),
      new Vector3(-3.5, 0.35,  3.2),
      new Vector3( 3.5, 0.35,  3.2),
      new Vector3( 0.0, 0.35,  0.0), // stool in center
    ]
    const tableSizes = [
      { w: 1.2, d: 0.7 },
      { w: 0.7, d: 0.5 }, // bedside
      { w: 0.7, d: 0.5 },
      { w: 0.7, d: 0.5 },
      { w: 0.5, d: 0.5 }, // stool
    ]
    tablePositions.forEach((pos, i) => {
      const t = MeshBuilder.CreateBox(`stand${i}`, { width: tableSizes[i].w, height: 0.7, depth: tableSizes[i].d }, scene)
      t.position = pos
      t.material = woodMat
    })

    // Wardrobe in dark corner
    const wardrobe = MeshBuilder.CreateBox('wardrobe', { width: 1.5, height: 2.5, depth: 0.6 }, scene)
    wardrobe.position = new Vector3(4, 1.25, -1)
    wardrobe.material = woodMat

    // Chair near center table
    const chair = MeshBuilder.CreateBox('chair', { width: 0.6, height: 0.8, depth: 0.6 }, scene)
    chair.position = new Vector3(1.0, 0.4, 0.6)
    chair.material = woodMat

    // Ceiling fan
    const fanHub = MeshBuilder.CreateCylinder('fanHub', { diameter: 0.2, height: 0.3 }, scene)
    fanHub.position = new Vector3(0, 3.85, 0)
    fanHub.material = woodMat
    for (let i = 0; i < 4; i++) {
      const blade = MeshBuilder.CreateBox(`blade${i}`, { width: 1.2, height: 0.05, depth: 0.3 }, scene)
      const angle = (i / 4) * Math.PI * 2
      blade.position = new Vector3(Math.cos(angle) * 0.6, 3.8, Math.sin(angle) * 0.6)
      blade.rotation.y = angle
      blade.parent = fanHub
      blade.material = woodMat
    }
    scene.registerBeforeRender(() => { fanHub.rotation.y += 0.015 })
  }

  getLampManager(): LampManager {
    return this.lampManager
  }

  getScene() {
    return this.scene
  }
}
