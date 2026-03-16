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

    // Warm atmospheric fog — adds depth and hides harsh edges
    this.scene.fogMode    = Scene.FOGMODE_EXP2
    this.scene.fogColor   = new Color3(0.20, 0.13, 0.06)
    this.scene.fogDensity = 0.07

    this.lampManager = new LampManager()
    this.buildRoom()
    this.buildLighting()
    this.buildFurniture()

    // Raise per-material light cap so all diya/lamp lights render correctly
    this.scene.materials.forEach(mat => {
      if (mat instanceof StandardMaterial) mat.maxSimultaneousLights = 12
    })
  }

  private buildRoom() {
    const scene = this.scene

    // ── Walls ────────────────────────────────────────────────────────────
    const wallMat = new StandardMaterial('wallMat', scene)
    wallMat.diffuseColor  = new Color3(0.72, 0.50, 0.25)   // warm turmeric/ochre
    wallMat.specularColor = new Color3(0.04, 0.03, 0.01)

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

    // ── Ceiling ───────────────────────────────────────────────────────────
    const ceilMat = new StandardMaterial('ceilMat', scene)
    ceilMat.diffuseColor  = new Color3(0.58, 0.52, 0.44)
    ceilMat.specularColor = new Color3(0.05, 0.04, 0.02)
    const ceiling = MeshBuilder.CreateBox('ceiling', { width: 10, height: 0.1, depth: 10 }, scene)
    ceiling.position.y = 4.05
    ceiling.material = ceilMat

    // ── Ceiling cornice — decorative border ───────────────────────────────
    const corniceMat = new StandardMaterial('corniceMat', scene)
    corniceMat.diffuseColor  = new Color3(0.80, 0.70, 0.50)
    corniceMat.specularColor = new Color3(0.25, 0.18, 0.06)
    corniceMat.specularPower = 60
    const cornices = [
      { pos: new Vector3( 0,    3.93, -4.95), rot: 0           },
      { pos: new Vector3( 0,    3.93,  4.95), rot: 0           },
      { pos: new Vector3(-4.95, 3.93,  0   ), rot: Math.PI / 2 },
      { pos: new Vector3( 4.95, 3.93,  0   ), rot: Math.PI / 2 },
    ]
    cornices.forEach((c, i) => {
      const cornice = MeshBuilder.CreateBox(`cornice${i}`, { width: 10, height: 0.22, depth: 0.20 }, scene)
      cornice.position = c.pos
      cornice.rotation.y = c.rot
      cornice.material = corniceMat
    })

    // ── Wood-plank floor — 5 alternating-tone planks ─────────────────────
    const plankTones: Color3[] = [
      new Color3(0.30, 0.19, 0.09),
      new Color3(0.26, 0.16, 0.07),
      new Color3(0.33, 0.21, 0.10),
      new Color3(0.25, 0.15, 0.07),
      new Color3(0.28, 0.18, 0.085),
    ]
    for (let i = 0; i < 5; i++) {
      const pMat = new StandardMaterial(`plankMat${i}`, scene)
      pMat.diffuseColor  = plankTones[i]
      pMat.specularColor = new Color3(0.18, 0.12, 0.05)
      pMat.specularPower = 55
      const plank = MeshBuilder.CreateBox(`plank${i}`, { width: 1.99, height: 0.1, depth: 10 }, scene)
      plank.position = new Vector3(-4 + i * 2, -0.05, 0)
      plank.material = pMat
    }

    // ── Skirting boards — trim at base of every wall ──────────────────────
    const skirtMat = new StandardMaterial('skirtMat', scene)
    skirtMat.diffuseColor  = new Color3(0.52, 0.36, 0.16)
    skirtMat.specularColor = new Color3(0.15, 0.10, 0.04)
    skirtMat.specularPower = 40
    const skirts = [
      { pos: new Vector3( 0,    0.12, -4.94), rot: 0           },
      { pos: new Vector3( 0,    0.12,  4.94), rot: 0           },
      { pos: new Vector3(-4.94, 0.12,  0   ), rot: Math.PI / 2 },
      { pos: new Vector3( 4.94, 0.12,  0   ), rot: Math.PI / 2 },
    ]
    skirts.forEach((s, i) => {
      const board = MeshBuilder.CreateBox(`skirt${i}`, { width: 10, height: 0.22, depth: 0.08 }, scene)
      board.position = s.pos
      board.rotation.y = s.rot
      board.material = skirtMat
    })

    // ── Window on right wall (x = 5) ─────────────────────────────────────
    const frameMat = new StandardMaterial('frameMat', scene)
    frameMat.diffuseColor  = new Color3(0.52, 0.33, 0.14)
    frameMat.specularColor = new Color3(0.15, 0.10, 0.04)
    frameMat.specularPower = 40

    const WX = 4.95, WY = 2.2, WZ = 1.6   // window centre on right wall
    const WW = 1.4, WH = 1.5               // width (along Z) and height
    const THICK = 0.10                      // frame bar thickness

    // Glass pane — slightly blue, semi-transparent, emissive moonlight tint
    const glassMat = new StandardMaterial('glassMat', scene)
    glassMat.diffuseColor  = new Color3(0.45, 0.60, 0.85)
    glassMat.specularColor = new Color3(0.9,  0.95,  1.0)
    glassMat.specularPower = 300
    glassMat.emissiveColor = new Color3(0.04, 0.06, 0.12)
    glassMat.alpha         = 0.28
    const glass = MeshBuilder.CreateBox('winGlass', { width: 0.03, height: WH, depth: WW }, scene)
    glass.position = new Vector3(WX, WY, WZ)
    glass.material = glassMat

    // Frame bars: top, bottom, left, right
    const frameBars = [
      { pos: new Vector3(WX, WY + WH / 2 + THICK / 2, WZ),          sz: { width: 0.08, height: THICK, depth: WW + THICK * 2 } },
      { pos: new Vector3(WX, WY - WH / 2 - THICK / 2, WZ),          sz: { width: 0.08, height: THICK, depth: WW + THICK * 2 } },
      { pos: new Vector3(WX, WY, WZ - WW / 2 - THICK / 2),          sz: { width: 0.08, height: WH,    depth: THICK           } },
      { pos: new Vector3(WX, WY, WZ + WW / 2 + THICK / 2),          sz: { width: 0.08, height: WH,    depth: THICK           } },
      // Cross bar (gives it a traditional look)
      { pos: new Vector3(WX, WY, WZ),                                sz: { width: 0.06, height: WH,    depth: 0.06            } },
      { pos: new Vector3(WX, WY, WZ),                                sz: { width: 0.06, height: 0.06,  depth: WW              } },
    ]
    frameBars.forEach((b, i) => {
      const bar = MeshBuilder.CreateBox(`wfbar${i}`, b.sz, scene)
      bar.position = b.pos
      bar.material = frameMat
    })

    // ── Curtains flanking the window ──────────────────────────────────────
    const curtainMat = new StandardMaterial('curtainMat', scene)
    curtainMat.diffuseColor  = new Color3(0.72, 0.10, 0.06)   // deep red
    curtainMat.specularColor = new Color3(0.05, 0.01, 0.01)
    curtainMat.emissiveColor = new Color3(0.04, 0.00, 0.00)
    const CURD = 0.48   // curtain half-width in Z
    ;[WZ - WW / 2 - CURD / 2, WZ + WW / 2 + CURD / 2].forEach((cz, i) => {
      const curt = MeshBuilder.CreateBox(`curtain${i}`, { width: 0.05, height: WH + 0.4, depth: CURD }, scene)
      curt.position = new Vector3(WX, WY + 0.1, cz)
      curt.material = curtainMat
    })
    // Curtain rod
    const rodMat = new StandardMaterial('rodMat', scene)
    rodMat.diffuseColor  = new Color3(0.75, 0.58, 0.12)
    rodMat.specularColor = new Color3(1.0, 0.85, 0.2)
    rodMat.specularPower = 120
    const rod = MeshBuilder.CreateCylinder('curtainRod', { diameter: 0.04, height: WW + CURD * 2 + 0.2, tessellation: 8 }, scene)
    rod.position = new Vector3(WX, WY + WH / 2 + THICK + 0.08, WZ)
    rod.rotation.x = Math.PI / 2
    rod.material = rodMat
  }

  private buildLighting() {
    const scene = this.scene

    // Very faint amber ambient — room should feel dark except near light sources
    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene)
    ambient.diffuse    = new Color3(0.08, 0.05, 0.02)
    ambient.groundColor = new Color3(0.03, 0.02, 0.01)
    ambient.intensity  = 0.12

    // Moonlight streaming through the window — cool blue-white
    const moonLight = new PointLight('moonLight', new Vector3(6.5, 2.2, 1.6), scene)
    moonLight.diffuse    = new Color3(0.55, 0.68, 1.0)
    moonLight.specular   = new Color3(0.35, 0.50, 0.85)
    moonLight.intensity  = 0.65
    moonLight.range      = 7

    // Subtle slow moon-shimmer (clouds passing)
    let moonT = 0
    scene.registerBeforeRender(() => {
      moonT += scene.getEngine().getDeltaTime() / 1000
      moonLight.intensity = 0.65 + 0.08 * Math.sin(moonT * 0.4) + 0.04 * Math.sin(moonT * 1.1)
    })

    const woodMat = new StandardMaterial('lampStandMat', scene)
    woodMat.diffuseColor = new Color3(0.35, 0.20, 0.08)

    LAMP_CONFIGS.forEach((cfg, i) => {
      const p = cfg.pos

      // Stand
      const base = MeshBuilder.CreateBox(`lampBase${i}`, { width: 0.08, height: 0.28, depth: 0.08 }, scene)
      base.position = new Vector3(p.x, p.y - 0.22, p.z)
      base.material = woodMat

      const baseDisc = MeshBuilder.CreateCylinder(`lampFoot${i}`, { diameter: 0.18, height: 0.04, tessellation: 12 }, scene)
      baseDisc.position = new Vector3(p.x, p.y - 0.35, p.z)
      baseDisc.material = woodMat

      // Shade — tapered cylinder
      const shade = MeshBuilder.CreateCylinder(`lampShade${i}`, {
        diameterTop: 0.30, diameterBottom: 0.08, height: 0.24, tessellation: 14,
      }, scene)
      shade.position = new Vector3(p.x, p.y + 0.02, p.z)
      const shadeMat = new StandardMaterial(`shadeMat${i}`, scene)
      shadeMat.diffuseColor  = new Color3(0.85, 0.72, 0.38)
      shadeMat.emissiveColor = Color3.Black()
      shade.material = shadeMat

      // Bulb
      const bulb = MeshBuilder.CreateSphere(`bulb${i}`, { diameter: 0.08, segments: 8 }, scene)
      bulb.position = new Vector3(p.x, p.y - 0.04, p.z)
      const bulbMat = new StandardMaterial(`bulbMat${i}`, scene)
      bulbMat.diffuseColor  = new Color3(1, 0.95, 0.6)
      bulbMat.emissiveColor = new Color3(0.05, 0.04, 0.02)
      bulb.material = bulbMat

      // PointLight — LampManager enables the active one
      const light = new PointLight(`lampLight${i}`, p.clone(), scene)
      light.diffuse    = new Color3(1.0, 0.72, 0.28)
      light.specular   = new Color3(0.9, 0.55, 0.10)
      light.intensity  = 0
      light.range      = 9
      light.setEnabled(false)

      // Flicker while active
      let t = Math.random() * 100
      scene.registerBeforeRender(() => {
        if (!light.isEnabled()) return
        t += scene.getEngine().getDeltaTime() / 1000
        light.intensity = 1.6
          + 0.06 * Math.sin(t *  7.3)
          + 0.04 * Math.sin(t * 19.1)
          + 0.02 * Math.sin(t *  3.7)
          + 0.02 * Math.sin(t * 41.3)
      })

      this.lampManager.addLamp({ position: p.clone(), light, bulbMat, shadeMat })
    })
  }

  private buildFurniture() {
    const scene = this.scene

    const woodMat = new StandardMaterial('woodMat', scene)
    woodMat.diffuseColor  = new Color3(0.35, 0.20, 0.08)
    woodMat.specularColor = new Color3(0.10, 0.06, 0.02)
    woodMat.specularPower = 30

    // ── Charpai bed frame ─────────────────────────────────────────────────
    const bedMat = new StandardMaterial('bedMat', scene)
    bedMat.diffuseColor  = new Color3(0.28, 0.11, 0.04)
    bedMat.specularColor = new Color3(0.08, 0.04, 0.01)
    bedMat.specularPower = 20
    const bed = MeshBuilder.CreateBox('bed', { width: 2, height: 0.5, depth: 3.5 }, scene)
    bed.position = new Vector3(-3, 0.25, -2)
    bed.material = bedMat

    // Saffron bedsheet
    const bedsheetMat = new StandardMaterial('bedsheetMat', scene)
    bedsheetMat.diffuseColor  = new Color3(0.88, 0.38, 0.05)
    bedsheetMat.specularColor = new Color3(0.12, 0.04, 0.00)
    bedsheetMat.specularPower = 15
    const bedsheet = MeshBuilder.CreateBox('bedsheet', { width: 1.95, height: 0.07, depth: 3.45 }, scene)
    bedsheet.position = new Vector3(-3, 0.535, -2)
    bedsheet.material = bedsheetMat

    // Golden pillow
    const pillowMat = new StandardMaterial('pillowMat', scene)
    pillowMat.diffuseColor  = new Color3(0.88, 0.73, 0.14)
    pillowMat.specularColor = new Color3(0.30, 0.22, 0.04)
    pillowMat.specularPower = 50
    const pillow = MeshBuilder.CreateBox('pillow', { width: 1.5, height: 0.14, depth: 0.55 }, scene)
    pillow.position = new Vector3(-3, 0.625, -3.4)
    pillow.material = pillowMat

    // Bed legs
    const legPositions = [
      new Vector3(-2.1, 0.05, -3.6), new Vector3(-1.9, 0.05, -3.6),
      new Vector3(-2.1, 0.05, -0.3), new Vector3(-1.9, 0.05, -0.3),
    ]
    legPositions.forEach((lp, i) => {
      const leg = MeshBuilder.CreateBox(`bedleg${i}`, { width: 0.08, height: 0.5, depth: 0.08 }, scene)
      leg.position = lp
      leg.material = bedMat
    })

    // ── Small tables / stands at each lamp position ───────────────────────
    const tablePositions = [
      new Vector3( 3.0, 0.35, -3.5),
      new Vector3(-3.5, 0.35, -3.0),
      new Vector3(-3.5, 0.35,  3.2),
      new Vector3( 3.5, 0.35,  3.2),
      new Vector3( 0.0, 0.35,  0.0),
    ]
    const tableSizes = [
      { w: 1.2, d: 0.7 },
      { w: 0.7, d: 0.5 },
      { w: 0.7, d: 0.5 },
      { w: 0.7, d: 0.5 },
      { w: 0.5, d: 0.5 },
    ]
    tablePositions.forEach((pos, i) => {
      const tbl = MeshBuilder.CreateBox(`stand${i}`, { width: tableSizes[i].w, height: 0.7, depth: tableSizes[i].d }, scene)
      tbl.position = pos
      tbl.material = woodMat
    })

    // ── Wardrobe with door panel detail ──────────────────────────────────
    const wardrobeMat = new StandardMaterial('wardrobeMat', scene)
    wardrobeMat.diffuseColor  = new Color3(0.28, 0.16, 0.06)
    wardrobeMat.specularColor = new Color3(0.12, 0.07, 0.02)
    wardrobeMat.specularPower = 25
    const wardrobe = MeshBuilder.CreateBox('wardrobe', { width: 1.5, height: 2.5, depth: 0.6 }, scene)
    wardrobe.position = new Vector3(4, 1.25, -1)
    wardrobe.material = wardrobeMat

    // Door panel inset — slightly lighter tone
    const doorPanelMat = new StandardMaterial('doorPanelMat', scene)
    doorPanelMat.diffuseColor  = new Color3(0.34, 0.20, 0.08)
    doorPanelMat.specularColor = new Color3(0.15, 0.09, 0.03)
    doorPanelMat.specularPower = 35
    const doorPanel = MeshBuilder.CreateBox('doorPanel', { width: 0.02, height: 2.1, depth: 0.52 }, scene)
    doorPanel.position = new Vector3(3.75, 1.3, -1)
    doorPanel.material = doorPanelMat

    // Handle — brass knob
    const brassMat = new StandardMaterial('brassMat', scene)
    brassMat.diffuseColor  = new Color3(0.78, 0.58, 0.10)
    brassMat.specularColor = new Color3(1.0, 0.85, 0.20)
    brassMat.specularPower = 120
    const handle = MeshBuilder.CreateSphere('wardrobeHandle', { diameter: 0.055, segments: 8 }, scene)
    handle.position = new Vector3(3.74, 1.3, -0.62)
    handle.material = brassMat

    // ── Chair near center table ───────────────────────────────────────────
    const chairMat = new StandardMaterial('chairMat', scene)
    chairMat.diffuseColor = new Color3(0.38, 0.22, 0.09)
    const chair = MeshBuilder.CreateBox('chair', { width: 0.6, height: 0.4, depth: 0.6 }, scene)
    chair.position = new Vector3(1.0, 0.2, 0.6)
    chair.material = chairMat
    // Chair back
    const chairBack = MeshBuilder.CreateBox('chairBack', { width: 0.6, height: 0.7, depth: 0.06 }, scene)
    chairBack.position = new Vector3(1.0, 0.55, 0.32)
    chairBack.material = chairMat

    // ── Ceiling fan ───────────────────────────────────────────────────────
    const fanMat = new StandardMaterial('fanMat', scene)
    fanMat.diffuseColor  = new Color3(0.32, 0.18, 0.07)
    fanMat.specularColor = new Color3(0.10, 0.06, 0.02)
    const fanHub = MeshBuilder.CreateCylinder('fanHub', { diameter: 0.22, height: 0.32, tessellation: 12 }, scene)
    fanHub.position = new Vector3(0, 3.84, 0)
    fanHub.material = fanMat

    // Drop rod connecting hub to ceiling
    const fanRod = MeshBuilder.CreateCylinder('fanRod', { diameter: 0.04, height: 0.22, tessellation: 6 }, scene)
    fanRod.position = new Vector3(0, 3.97, 0)
    fanRod.material = fanMat

    for (let i = 0; i < 4; i++) {
      const blade = MeshBuilder.CreateBox(`blade${i}`, { width: 1.3, height: 0.04, depth: 0.28 }, scene)
      const angle = (i / 4) * Math.PI * 2
      blade.position = new Vector3(Math.cos(angle) * 0.65, 3.80, Math.sin(angle) * 0.65)
      blade.rotation.y = angle
      blade.parent = fanHub
      blade.material = fanMat
    }
    scene.registerBeforeRender(() => { fanHub.rotation.y += 0.012 })

    // ── Indian Artifacts ──────────────────────────────────────────────────

    // Red rug / dari beside the bed
    const rugMat = new StandardMaterial('rugMat', scene)
    rugMat.diffuseColor  = new Color3(0.60, 0.10, 0.06)
    rugMat.specularColor = new Color3(0.04, 0.01, 0.00)
    const rug = MeshBuilder.CreateBox('rug', { width: 2.5, height: 0.025, depth: 1.8 }, scene)
    rug.position = new Vector3(-3, 0.012, 0.6)
    rug.material = rugMat

    // Rug border stripe — gold
    const rugBorderMat = new StandardMaterial('rugBorderMat', scene)
    rugBorderMat.diffuseColor  = new Color3(0.78, 0.62, 0.10)
    rugBorderMat.emissiveColor = new Color3(0.05, 0.04, 0)
    ;[
      { pos: new Vector3(-3, 0.025, 0.6), sz: { width: 2.5, height: 0.01, depth: 1.80 } },
      { pos: new Vector3(-3, 0.025, 0.6), sz: { width: 2.3, height: 0.012, depth: 1.60 } },
    ].forEach((b, i) => {
      const border = MeshBuilder.CreateBox(`rugBorder${i}`, b.sz, scene)
      border.position = b.pos
      border.material = i === 0 ? rugBorderMat : rugMat   // outer gold stripe, inner red
    })

    // Wall tapestry — on back wall
    const tapestryMat = new StandardMaterial('tapestryMat', scene)
    tapestryMat.diffuseColor  = new Color3(0.80, 0.16, 0.05)
    tapestryMat.emissiveColor = new Color3(0.06, 0.01, 0)
    const tapestry = MeshBuilder.CreateBox('tapestry', { width: 1.8, height: 2.2, depth: 0.04 }, scene)
    tapestry.position = new Vector3(1.5, 2.0, -4.94)
    tapestry.material = tapestryMat

    // Gold border on tapestry
    const tapBorderMat = new StandardMaterial('tapBorderMat', scene)
    tapBorderMat.diffuseColor  = new Color3(0.85, 0.70, 0.12)
    tapBorderMat.emissiveColor = new Color3(0.08, 0.06, 0)
    tapBorderMat.specularColor = new Color3(1.0, 0.85, 0.2)
    tapBorderMat.specularPower = 80
    const tapBorder = MeshBuilder.CreateBox('tapBorder', { width: 1.86, height: 2.26, depth: 0.02 }, scene)
    tapBorder.position = new Vector3(1.5, 2.0, -4.96)
    tapBorder.material = tapBorderMat

    // ── Rangoli on floor — smooth rings + 8 petal rays ───────────────────
    const rangoliPos = new Vector3(2.6, 0.012, 1.5)

    const rOrangeMat = new StandardMaterial('rOrange', scene)
    rOrangeMat.diffuseColor  = new Color3(0.95, 0.35, 0.05)
    rOrangeMat.emissiveColor = new Color3(0.14, 0.05, 0)
    const rYellowMat = new StandardMaterial('rYellow', scene)
    rYellowMat.diffuseColor  = new Color3(0.95, 0.82, 0.06)
    rYellowMat.emissiveColor = new Color3(0.12, 0.10, 0)
    const rPinkMat = new StandardMaterial('rPink', scene)
    rPinkMat.diffuseColor  = new Color3(0.85, 0.12, 0.45)
    rPinkMat.emissiveColor = new Color3(0.10, 0.01, 0.05)
    const rWhiteMat = new StandardMaterial('rWhite', scene)
    rWhiteMat.diffuseColor  = new Color3(0.92, 0.88, 0.82)
    rWhiteMat.emissiveColor = new Color3(0.08, 0.07, 0.05)

    // Concentric rings — tessellation 16 for smooth circles
    const outerRing = MeshBuilder.CreateTorus('rangoliOuter', { diameter: 2.2, thickness: 0.10, tessellation: 16 }, scene)
    outerRing.position = rangoliPos.clone()
    outerRing.rotation.x = Math.PI / 2
    outerRing.material = rOrangeMat

    const midRing = MeshBuilder.CreateTorus('rangoliMid', { diameter: 1.5, thickness: 0.08, tessellation: 16 }, scene)
    midRing.position = rangoliPos.clone()
    midRing.rotation.x = Math.PI / 2
    midRing.material = rYellowMat

    const innerRing = MeshBuilder.CreateTorus('rangoliInner', { diameter: 0.9, thickness: 0.07, tessellation: 16 }, scene)
    innerRing.position = rangoliPos.clone()
    innerRing.rotation.x = Math.PI / 2
    innerRing.material = rOrangeMat

    const innerDisc = MeshBuilder.CreateCylinder('rangoliDisc', { diameter: 0.5, height: 0.016, tessellation: 16 }, scene)
    innerDisc.position = rangoliPos.clone()
    innerDisc.material = rPinkMat

    // 8 petal rays radiating outward from centre
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2
      const petalMat = i % 2 === 0 ? rOrangeMat : rYellowMat
      const ray = MeshBuilder.CreateBox(`rangoliRay${i}`, { width: 0.06, height: 0.014, depth: 0.65 }, scene)
      ray.position = new Vector3(
        rangoliPos.x + Math.sin(angle) * 0.45,
        0.013,
        rangoliPos.z + Math.cos(angle) * 0.45,
      )
      ray.rotation.y = angle
      ray.material = petalMat

      // Petal dot at tip
      const dot = MeshBuilder.CreateCylinder(`rangoliDot${i}`, { diameter: 0.10, height: 0.015, tessellation: 10 }, scene)
      dot.position = new Vector3(
        rangoliPos.x + Math.sin(angle) * 0.95,
        0.013,
        rangoliPos.z + Math.cos(angle) * 0.95,
      )
      dot.material = i % 2 === 0 ? rPinkMat : rWhiteMat
    }

    // ── Brass Kalash (sacred water vessel) ───────────────────────────────
    const kalashBody = MeshBuilder.CreateCylinder('kalashBody', { diameterTop: 0.22, diameterBottom: 0.14, height: 0.38, tessellation: 14 }, scene)
    kalashBody.position = new Vector3(2.5, 0.19, -4.5)
    kalashBody.material = brassMat
    const kalashNeck = MeshBuilder.CreateCylinder('kalashNeck', { diameter: 0.09, height: 0.10, tessellation: 10 }, scene)
    kalashNeck.position = new Vector3(2.5, 0.43, -4.5)
    kalashNeck.material = brassMat
    const kalashLid = MeshBuilder.CreateSphere('kalashLid', { diameter: 0.14, segments: 10 }, scene)
    kalashLid.position = new Vector3(2.5, 0.53, -4.5)
    kalashLid.material = brassMat
    // Decorative band
    const kalashBand = MeshBuilder.CreateCylinder('kalashBand', { diameter: 0.235, height: 0.04, tessellation: 14 }, scene)
    kalashBand.position = new Vector3(2.5, 0.28, -4.5)
    kalashBand.material = brassMat

    // ── Terracotta matka (clay pot) ───────────────────────────────────────
    const terracottaMat = new StandardMaterial('terracottaMat', scene)
    terracottaMat.diffuseColor  = new Color3(0.62, 0.28, 0.13)
    terracottaMat.specularColor = new Color3(0.15, 0.08, 0.03)
    terracottaMat.specularPower = 20
    const matka = MeshBuilder.CreateSphere('matka', { diameter: 0.55, segments: 12 }, scene)
    matka.position = new Vector3(-4.2, 0.27, 3.5)
    matka.scaling = new Vector3(1, 1.15, 1)
    matka.material = terracottaMat
    const matkaNeck = MeshBuilder.CreateCylinder('matkaNeck', { diameter: 0.14, height: 0.12, tessellation: 10 }, scene)
    matkaNeck.position = new Vector3(-4.2, 0.58, 3.5)
    matkaNeck.material = terracottaMat
    // Matka rim
    const matkaRim = MeshBuilder.CreateTorus('matkaRim', { diameter: 0.16, thickness: 0.025, tessellation: 10 }, scene)
    matkaRim.position = new Vector3(-4.2, 0.64, 3.5)
    matkaRim.material = terracottaMat

    // ── Diyas (clay oil lamps) along back wall ────────────────────────────
    const diyaMat = new StandardMaterial('diyaMat', scene)
    diyaMat.diffuseColor  = new Color3(0.58, 0.25, 0.11)
    diyaMat.specularColor = new Color3(0.15, 0.08, 0.03)
    diyaMat.specularPower = 20

    const diyaPositions = [
      new Vector3(-0.8, 0.025, -4.7),
      new Vector3(-0.3, 0.025, -4.7),
      new Vector3( 0.2, 0.025, -4.7),
    ]
    diyaPositions.forEach((dPos, i) => {
      const diyaBase = MeshBuilder.CreateCylinder(`diyaBase${i}`, { diameterTop: 0.14, diameterBottom: 0.09, height: 0.05, tessellation: 10 }, scene)
      diyaBase.position = dPos.clone()
      diyaBase.material = diyaMat

      const flameMat = new StandardMaterial(`flameMat${i}`, scene)
      flameMat.diffuseColor  = new Color3(1.0, 0.65, 0.1)
      flameMat.emissiveColor = new Color3(0.95, 0.48, 0.06)
      const flame = MeshBuilder.CreateSphere(`diyaFlame${i}`, { diameter: 0.06, segments: 5 }, scene)
      flame.position = new Vector3(dPos.x, dPos.y + 0.06, dPos.z)
      flame.scaling = new Vector3(0.5, 1.6, 0.5)
      flame.material = flameMat

      const diyaLight = new PointLight(`diyaLight${i}`, new Vector3(dPos.x, dPos.y + 0.12, dPos.z), scene)
      diyaLight.diffuse    = new Color3(1.0, 0.58, 0.10)
      diyaLight.specular   = new Color3(0.85, 0.40, 0.05)
      diyaLight.intensity  = 0.40
      diyaLight.range      = 2.2

      let ft = Math.random() * 100
      scene.registerBeforeRender(() => {
        ft += scene.getEngine().getDeltaTime() / 1000
        diyaLight.intensity = 0.40 + 0.20 * Math.sin(ft *  9.2) + 0.10 * Math.sin(ft * 21.7)
        const flicker = 0.82 + 0.18 * Math.sin(ft * 11.3)
        flame.scaling.x = 0.5 * flicker
        flame.scaling.z = 0.5 * flicker
        flame.scaling.y = 1.6 + 0.35 * Math.sin(ft * 7.1)
      })
    })

    // ── Mandir (prayer shelf) on left wall ────────────────────────────────
    const mandirMat = new StandardMaterial('mandirMat', scene)
    mandirMat.diffuseColor  = new Color3(0.42, 0.26, 0.10)
    mandirMat.specularColor = new Color3(0.15, 0.09, 0.03)
    mandirMat.specularPower = 30

    const mandirShelf = MeshBuilder.CreateBox('mandirShelf', { width: 0.06, height: 0.08, depth: 0.70 }, scene)
    mandirShelf.position = new Vector3(-4.87, 2.0, -3.0)
    mandirShelf.material = mandirMat

    const mandirBack = MeshBuilder.CreateBox('mandirBack', { width: 0.06, height: 0.90, depth: 0.70 }, scene)
    mandirBack.position = new Vector3(-4.87, 2.48, -3.0)
    mandirBack.material = mandirMat

    // Side panels
    ;[-3.38, -2.62].forEach((sz, i) => {
      const panel = MeshBuilder.CreateBox(`mandirSide${i}`, { width: 0.06, height: 0.90, depth: 0.06 }, scene)
      panel.position = new Vector3(-4.87, 2.48, sz)
      panel.material = mandirMat
    })

    const goldMat = new StandardMaterial('goldMat', scene)
    goldMat.diffuseColor  = new Color3(0.82, 0.62, 0.08)
    goldMat.specularColor = new Color3(1.0, 0.88, 0.22)
    goldMat.specularPower = 110
    goldMat.emissiveColor = new Color3(0.10, 0.07, 0)

    const shikhara = MeshBuilder.CreateCylinder('shikhara', { diameterTop: 0.0, diameterBottom: 0.30, height: 0.45, tessellation: 10 }, scene)
    shikhara.position = new Vector3(-4.65, 3.02, -3.0)
    shikhara.material = goldMat

    // Small golden idol platform
    const idolBase = MeshBuilder.CreateBox('idolBase', { width: 0.04, height: 0.08, depth: 0.18 }, scene)
    idolBase.position = new Vector3(-4.82, 2.12, -3.0)
    idolBase.material = goldMat

    // ── Incense sticks near mandir ────────────────────────────────────────
    const stickMat = new StandardMaterial('stickMat', scene)
    stickMat.diffuseColor = new Color3(0.35, 0.22, 0.08)

    const tipMat = new StandardMaterial('agarbattiTip', scene)
    tipMat.emissiveColor = new Color3(0.9, 0.38, 0)
    tipMat.diffuseColor  = new Color3(0.6, 0.25, 0)

    for (let i = 0; i < 3; i++) {
      const stick = MeshBuilder.CreateCylinder(`agarbatti${i}`, { diameter: 0.012, height: 0.38, tessellation: 4 }, scene)
      stick.position = new Vector3(-4.78 + i * 0.07, 2.23, -2.76)
      stick.rotation.z = (i - 1) * 0.18
      stick.material = stickMat

      const tip = MeshBuilder.CreateSphere(`agarbattiTip${i}`, { diameter: 0.028, segments: 4 }, scene)
      tip.position = new Vector3(-4.78 + i * 0.07, 2.42 + Math.abs(i - 1) * -0.03, -2.76)
      tip.material = tipMat

      // Very tiny incense glow
      const incenseLight = new PointLight(`incenseLight${i}`, new Vector3(-4.78 + i * 0.07, 2.45, -2.76), scene)
      incenseLight.diffuse   = new Color3(1.0, 0.45, 0.05)
      incenseLight.intensity = 0.08
      incenseLight.range     = 0.8
    }

    // ── Marigold garland along back wall ─────────────────────────────────
    const marigoldMat = new StandardMaterial('marigoldMat', scene)
    marigoldMat.diffuseColor  = new Color3(0.95, 0.58, 0.04)
    marigoldMat.emissiveColor = new Color3(0.18, 0.09, 0)

    const leafMat = new StandardMaterial('leafMat', scene)
    leafMat.diffuseColor  = new Color3(0.15, 0.48, 0.08)
    leafMat.emissiveColor = new Color3(0.02, 0.06, 0)

    for (let i = 0; i < 20; i++) {
      const t   = i / 19
      const gx  = -3.8 + t * 7.6
      const sag = Math.sin(t * Math.PI) * 0.55
      const gy  = 3.65 - sag
      const flower = MeshBuilder.CreateSphere(`marigold${i}`, { diameter: 0.12 + (i % 3) * 0.02, segments: 5 }, scene)
      flower.position = new Vector3(gx, gy, -4.87)
      flower.material = i % 5 === 2 ? leafMat : marigoldMat
    }
  }

  getLampManager(): LampManager {
    return this.lampManager
  }

  getScene() {
    return this.scene
  }
}
