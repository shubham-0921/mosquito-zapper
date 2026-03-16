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

    // Raise the per-material light cap — default is 4, which gets exhausted by
    // the 3 diya PointLights + HemisphericLight before the active lamp can render
    this.scene.materials.forEach(mat => {
      if (mat instanceof StandardMaterial) mat.maxSimultaneousLights = 10
    })
  }

  private buildRoom() {
    const scene = this.scene

    const wallMat = new StandardMaterial('wallMat', scene)
    wallMat.diffuseColor = new Color3(0.72, 0.50, 0.25)  // warm turmeric/ochre
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
    bedMat.diffuseColor = new Color3(0.30, 0.12, 0.05)  // dark charpai wood

    // Bed (charpai frame)
    const bed = MeshBuilder.CreateBox('bed', { width: 2, height: 0.5, depth: 3.5 }, scene)
    bed.position = new Vector3(-3, 0.25, -2)
    bed.material = bedMat

    // Saffron bedsheet on top
    const bedsheetMat = new StandardMaterial('bedsheetMat', scene)
    bedsheetMat.diffuseColor = new Color3(0.88, 0.38, 0.05)
    const bedsheet = MeshBuilder.CreateBox('bedsheet', { width: 1.95, height: 0.07, depth: 3.45 }, scene)
    bedsheet.position = new Vector3(-3, 0.535, -2)
    bedsheet.material = bedsheetMat

    // Golden pillow at head
    const pillowMat = new StandardMaterial('pillowMat', scene)
    pillowMat.diffuseColor = new Color3(0.9, 0.75, 0.15)
    const pillow = MeshBuilder.CreateBox('pillow', { width: 1.5, height: 0.13, depth: 0.55 }, scene)
    pillow.position = new Vector3(-3, 0.625, -3.4)
    pillow.material = pillowMat

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

    // ── Indian Artifacts ──────────────────────────────────────────────────

    // Red rug / dari beside the bed
    const rugMat = new StandardMaterial('rugMat', scene)
    rugMat.diffuseColor = new Color3(0.65, 0.12, 0.07)
    const rug = MeshBuilder.CreateBox('rug', { width: 2.5, height: 0.02, depth: 1.8 }, scene)
    rug.position = new Vector3(-3, 0.01, 0.6)
    rug.material = rugMat

    // Wall tapestry (saffron cloth hanging) on back wall
    const tapestryMat = new StandardMaterial('tapestryMat', scene)
    tapestryMat.diffuseColor = new Color3(0.82, 0.18, 0.05)
    tapestryMat.emissiveColor = new Color3(0.06, 0.01, 0)
    const tapestry = MeshBuilder.CreateBox('tapestry', { width: 1.8, height: 2.2, depth: 0.04 }, scene)
    tapestry.position = new Vector3(1.5, 2.0, -4.94)
    tapestry.material = tapestryMat

    // Rangoli on floor — concentric rings, right open area
    const rangoliPos = new Vector3(2.6, 0.01, 1.5)
    const rOrangeMat = new StandardMaterial('rOrange', scene)
    rOrangeMat.diffuseColor = new Color3(0.95, 0.35, 0.05)
    rOrangeMat.emissiveColor = new Color3(0.12, 0.04, 0)
    const rYellowMat = new StandardMaterial('rYellow', scene)
    rYellowMat.diffuseColor = new Color3(0.95, 0.82, 0.06)
    rYellowMat.emissiveColor = new Color3(0.10, 0.08, 0)
    const rPinkMat = new StandardMaterial('rPink', scene)
    rPinkMat.diffuseColor = new Color3(0.85, 0.12, 0.45)
    rPinkMat.emissiveColor = new Color3(0.08, 0.01, 0.04)
    const outerRing = MeshBuilder.CreateTorus('rangoliOuter', { diameter: 2.2, thickness: 0.12, tessellation: 8 }, scene)
    outerRing.position = rangoliPos.clone()
    outerRing.rotation.x = Math.PI / 2
    outerRing.material = rOrangeMat
    const midRing = MeshBuilder.CreateTorus('rangoliMid', { diameter: 1.4, thickness: 0.10, tessellation: 8 }, scene)
    midRing.position = rangoliPos.clone()
    midRing.rotation.x = Math.PI / 2
    midRing.material = rYellowMat
    const innerDisc = MeshBuilder.CreateCylinder('rangoliDisc', { diameter: 0.65, height: 0.02, tessellation: 8 }, scene)
    innerDisc.position = new Vector3(rangoliPos.x, 0.01, rangoliPos.z)
    innerDisc.material = rPinkMat

    // Brass Kalash (sacred water vessel) near back wall
    const brassMat = new StandardMaterial('brassMat', scene)
    brassMat.diffuseColor = new Color3(0.75, 0.55, 0.08)
    brassMat.specularColor = new Color3(0.9, 0.7, 0.15)
    brassMat.specularPower = 80
    const kalashBody = MeshBuilder.CreateCylinder('kalashBody', { diameterTop: 0.22, diameterBottom: 0.14, height: 0.38, tessellation: 12 }, scene)
    kalashBody.position = new Vector3(2.5, 0.19, -4.5)
    kalashBody.material = brassMat
    const kalashNeck = MeshBuilder.CreateCylinder('kalashNeck', { diameter: 0.09, height: 0.10, tessellation: 10 }, scene)
    kalashNeck.position = new Vector3(2.5, 0.43, -4.5)
    kalashNeck.material = brassMat
    const kalashLid = MeshBuilder.CreateSphere('kalashLid', { diameter: 0.14, segments: 8 }, scene)
    kalashLid.position = new Vector3(2.5, 0.53, -4.5)
    kalashLid.material = brassMat

    // Terracotta matka (clay water pot) — front-left corner
    const terracottaMat = new StandardMaterial('terracottaMat', scene)
    terracottaMat.diffuseColor = new Color3(0.65, 0.30, 0.14)
    terracottaMat.specularColor = new Color3(0.2, 0.1, 0.05)
    const matka = MeshBuilder.CreateSphere('matka', { diameter: 0.55, segments: 10 }, scene)
    matka.position = new Vector3(-4.2, 0.27, 3.5)
    matka.scaling = new Vector3(1, 1.15, 1)
    matka.material = terracottaMat
    const matkaNeck = MeshBuilder.CreateCylinder('matkaNeck', { diameter: 0.14, height: 0.12, tessellation: 10 }, scene)
    matkaNeck.position = new Vector3(-4.2, 0.58, 3.5)
    matkaNeck.material = terracottaMat

    // Diyas (clay oil lamps) — row along back wall
    const diyaMat = new StandardMaterial('diyaMat', scene)
    diyaMat.diffuseColor = new Color3(0.60, 0.27, 0.12)
    const diyaPositions = [
      new Vector3(-0.8, 0.025, -4.7),
      new Vector3(-0.3, 0.025, -4.7),
      new Vector3( 0.2, 0.025, -4.7),
    ]
    diyaPositions.forEach((dPos, i) => {
      const diyaBase = MeshBuilder.CreateCylinder(`diyaBase${i}`, { diameterTop: 0.13, diameterBottom: 0.09, height: 0.05, tessellation: 8 }, scene)
      diyaBase.position = dPos.clone()
      diyaBase.material = diyaMat
      const flameMat = new StandardMaterial(`flameMat${i}`, scene)
      flameMat.diffuseColor = new Color3(1.0, 0.65, 0.1)
      flameMat.emissiveColor = new Color3(0.9, 0.45, 0.05)
      const flame = MeshBuilder.CreateSphere(`diyaFlame${i}`, { diameter: 0.05, segments: 4 }, scene)
      flame.position = new Vector3(dPos.x, dPos.y + 0.055, dPos.z)
      flame.scaling = new Vector3(0.55, 1.5, 0.55)
      flame.material = flameMat
      const diyaLight = new PointLight(`diyaLight${i}`, new Vector3(dPos.x, dPos.y + 0.1, dPos.z), scene)
      diyaLight.diffuse = new Color3(1.0, 0.6, 0.1)
      diyaLight.specular = new Color3(0.8, 0.4, 0.05)
      diyaLight.intensity = 0.35
      diyaLight.range = 2.0
      let ft = Math.random() * 100
      scene.registerBeforeRender(() => {
        ft += scene.getEngine().getDeltaTime() / 1000
        diyaLight.intensity = 0.35 + 0.18 * Math.sin(ft * 9.2) + 0.09 * Math.sin(ft * 21.7)
        const flicker = 0.85 + 0.15 * Math.sin(ft * 11.3)
        flame.scaling.x = 0.55 * flicker
        flame.scaling.z = 0.55 * flicker
        flame.scaling.y = 1.5 + 0.3 * Math.sin(ft * 7.1)
      })
    })

    // Mandir (prayer shelf) — on left wall
    const mandirShelf = MeshBuilder.CreateBox('mandirShelf', { width: 0.05, height: 0.06, depth: 0.65 }, scene)
    mandirShelf.position = new Vector3(-4.88, 2.0, -3.0)
    mandirShelf.material = woodMat
    const mandirBack = MeshBuilder.CreateBox('mandirBack', { width: 0.05, height: 0.85, depth: 0.65 }, scene)
    mandirBack.position = new Vector3(-4.88, 2.45, -3.0)
    mandirBack.material = woodMat
    const goldMat = new StandardMaterial('goldMat', scene)
    goldMat.diffuseColor = new Color3(0.85, 0.65, 0.08)
    goldMat.specularColor = new Color3(1.0, 0.85, 0.2)
    goldMat.specularPower = 100
    goldMat.emissiveColor = new Color3(0.08, 0.06, 0)
    const shikhara = MeshBuilder.CreateCylinder('shikhara', { diameterTop: 0.0, diameterBottom: 0.28, height: 0.42, tessellation: 8 }, scene)
    shikhara.position = new Vector3(-4.65, 3.0, -3.0)
    shikhara.material = goldMat

    // Marigold garland along back wall
    const marigoldMat = new StandardMaterial('marigoldMat', scene)
    marigoldMat.diffuseColor = new Color3(0.95, 0.60, 0.05)
    marigoldMat.emissiveColor = new Color3(0.15, 0.08, 0)
    for (let i = 0; i < 13; i++) {
      const t = i / 12
      const gx = -3.5 + t * 7.0
      const sag = Math.sin(t * Math.PI) * 0.5
      const gy = 3.6 - sag
      const flower = MeshBuilder.CreateSphere(`marigold${i}`, { diameter: 0.13, segments: 5 }, scene)
      flower.position = new Vector3(gx, gy, -4.86)
      flower.material = marigoldMat
    }
  }

  getLampManager(): LampManager {
    return this.lampManager
  }

  getScene() {
    return this.scene
  }
}
