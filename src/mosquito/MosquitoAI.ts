import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { TransformNode } from '@babylonjs/core/Meshes/transformNode'
import { Mesh } from '@babylonjs/core/Meshes/mesh'

function randRange(min: number, max: number) {
  return min + Math.random() * (max - min)
}
function randomWaypoint(): Vector3 {
  return new Vector3(randRange(-4, 4), randRange(0.5, 3.5), randRange(-4, 4))
}
function waypointNear(center: Vector3, radius: number): Vector3 {
  return new Vector3(
    center.x + randRange(-radius, radius),
    center.y + randRange(-0.3, 0.5),
    center.z + randRange(-radius, radius),
  )
}

export class MosquitoAI {
  /** Root node — .position used by hit detection, audio, and pool */
  mesh: TransformNode

  isActive = false
  speed = 1.0

  private wingL!: Mesh
  private wingR!: Mesh

  private waypoints: Vector3[] = []
  private currentWP = 0
  private t = 0
  private dashTimer = 0
  private dashInterval = 0
  private lightPos: Vector3 = Vector3.Zero()
  private travelDir = Vector3.Forward()

  constructor(scene: Scene, id: number, detailed = true) {
    this.mesh = new TransformNode(`mqRoot${id}`, scene)
    if (detailed) this.buildBody(scene, id)
    else          this.buildBodySimple(scene, id)
    this.mesh.setEnabled(false)
  }

  /** Lightweight 4-part body for mobile — same flight logic, fewer draw calls */
  private buildBodySimple(scene: Scene, id: number) {
    const mk = (n: string) => `mqS${n}${id}`

    const bodyMat = new StandardMaterial(mk('body'), scene)
    bodyMat.diffuseColor  = new Color3(0.13, 0.10, 0.07)
    bodyMat.emissiveColor = new Color3(0.05, 0.03, 0.01)

    const wingMat = new StandardMaterial(mk('wing'), scene)
    wingMat.diffuseColor    = new Color3(0.75, 0.82, 0.95)
    wingMat.alpha           = 0.45
    wingMat.backFaceCulling = false

    const thorax = MeshBuilder.CreateSphere(mk('thorax'), { diameter: 0.058, segments: 6 }, scene)
    thorax.parent   = this.mesh
    thorax.material = bodyMat

    const abdomen = MeshBuilder.CreateSphere(mk('abd'), { diameter: 0.052, segments: 6 }, scene)
    abdomen.parent   = this.mesh
    abdomen.position = new Vector3(0, -0.036, -0.048)
    abdomen.scaling  = new Vector3(0.72, 1.55, 1.1)
    abdomen.material = bodyMat

    this.wingL = MeshBuilder.CreateBox(mk('wL'), { width: 0.10, height: 0.003, depth: 0.062 }, scene)
    this.wingL.parent   = this.mesh
    this.wingL.position = new Vector3(-0.068, 0.012, 0.002)
    this.wingL.rotation = new Vector3(0, 0.1, 0.22)
    this.wingL.material = wingMat

    this.wingR = MeshBuilder.CreateBox(mk('wR'), { width: 0.10, height: 0.003, depth: 0.062 }, scene)
    this.wingR.parent   = this.mesh
    this.wingR.position = new Vector3(0.068, 0.012, 0.002)
    this.wingR.rotation = new Vector3(0, -0.1, -0.22)
    this.wingR.material = wingMat
  }

  private buildBody(scene: Scene, id: number) {
    // ── Shared materials ────────────────────────────────────────────
    const bodyMat = new StandardMaterial(`mqBody${id}`, scene)
    bodyMat.diffuseColor  = new Color3(0.13, 0.10, 0.07)
    bodyMat.specularColor = new Color3(0.35, 0.30, 0.20)
    bodyMat.emissiveColor = new Color3(0.04, 0.03, 0.01)

    const abdomenMat = new StandardMaterial(`mqAbd${id}`, scene)
    abdomenMat.diffuseColor  = new Color3(0.18, 0.14, 0.06)   // warmer banding
    abdomenMat.specularColor = new Color3(0.25, 0.20, 0.10)
    abdomenMat.emissiveColor = new Color3(0.04, 0.03, 0.01)

    const eyeMat = new StandardMaterial(`mqEye${id}`, scene)
    eyeMat.diffuseColor  = new Color3(0.55, 0.0, 0.0)
    eyeMat.emissiveColor = new Color3(0.35, 0.0, 0.0)         // faintly glowing red eyes

    const darkMat = new StandardMaterial(`mqDark${id}`, scene)
    darkMat.diffuseColor = new Color3(0.07, 0.06, 0.04)

    const wingMat = new StandardMaterial(`mqWing${id}`, scene)
    wingMat.diffuseColor    = new Color3(0.75, 0.82, 0.95)
    wingMat.emissiveColor   = new Color3(0.06, 0.08, 0.15)    // iridescent hint
    wingMat.specularColor   = new Color3(1.0, 1.0, 1.0)
    wingMat.specularPower   = 256
    wingMat.alpha           = 0.45
    wingMat.backFaceCulling = false

    const mk = (name: string) => `mq${name}${id}`

    // ── Thorax ──────────────────────────────────────────────────────
    const thorax = MeshBuilder.CreateSphere(mk('Thorax'), { diameter: 0.055, segments: 10 }, scene)
    thorax.parent   = this.mesh
    thorax.material = bodyMat

    // ── Abdomen (elongated, angled rearward-downward) ───────────────
    const abdomen = MeshBuilder.CreateSphere(mk('Abd'), { diameter: 0.052, segments: 10 }, scene)
    abdomen.parent   = this.mesh
    abdomen.position = new Vector3(0, -0.036, -0.048)
    abdomen.scaling  = new Vector3(0.72, 1.55, 1.1)
    abdomen.material = abdomenMat

    // ── Head ────────────────────────────────────────────────────────
    const head = MeshBuilder.CreateSphere(mk('Head'), { diameter: 0.032, segments: 8 }, scene)
    head.parent   = this.mesh
    head.position = new Vector3(0, 0.010, 0.040)
    head.material = bodyMat

    // ── Compound eyes ───────────────────────────────────────────────
    const eyeL = MeshBuilder.CreateSphere(mk('EyeL'), { diameter: 0.014, segments: 6 }, scene)
    eyeL.parent   = this.mesh
    eyeL.position = new Vector3(-0.013, 0.014, 0.050)
    eyeL.material = eyeMat

    const eyeR = MeshBuilder.CreateSphere(mk('EyeR'), { diameter: 0.014, segments: 6 }, scene)
    eyeR.parent   = this.mesh
    eyeR.position = new Vector3(0.013, 0.014, 0.050)
    eyeR.material = eyeMat

    // ── Proboscis (long thin needle) ─────────────────────────────────
    const probe = MeshBuilder.CreateCylinder(mk('Probe'), {
      diameterTop: 0.001, diameterBottom: 0.005, height: 0.065, tessellation: 6,
    }, scene)
    probe.parent   = this.mesh
    probe.position = new Vector3(0, 0.004, 0.082)
    probe.rotation.x = Math.PI / 2
    probe.material = bodyMat

    // ── Antennae ─────────────────────────────────────────────────────
    const antL = MeshBuilder.CreateCylinder(mk('AntL'), { diameter: 0.003, height: 0.048, tessellation: 5 }, scene)
    antL.parent   = this.mesh
    antL.position = new Vector3(-0.010, 0.028, 0.042)
    antL.rotation = new Vector3(-0.3, 0, 0.45)
    antL.material = darkMat

    const antR = MeshBuilder.CreateCylinder(mk('AntR'), { diameter: 0.003, height: 0.048, tessellation: 5 }, scene)
    antR.parent   = this.mesh
    antR.position = new Vector3(0.010, 0.028, 0.042)
    antR.rotation = new Vector3(-0.3, 0, -0.45)
    antR.material = darkMat

    // ── Wings ────────────────────────────────────────────────────────
    // Each wing is a thin flat box, angled slightly upward at rest
    this.wingL = MeshBuilder.CreateBox(mk('WingL'), { width: 0.10, height: 0.003, depth: 0.062 }, scene)
    this.wingL.parent   = this.mesh
    this.wingL.position = new Vector3(-0.068, 0.012, 0.002)
    this.wingL.rotation = new Vector3(0, 0.1, 0.22)
    this.wingL.material = wingMat

    this.wingR = MeshBuilder.CreateBox(mk('WingR'), { width: 0.10, height: 0.003, depth: 0.062 }, scene)
    this.wingR.parent   = this.mesh
    this.wingR.position = new Vector3(0.068, 0.012, 0.002)
    this.wingR.rotation = new Vector3(0, -0.1, -0.22)
    this.wingR.material = wingMat

    // ── Legs (3 pairs — thin, angled outward) ───────────────────────
    const legDefs = [
      { x: -0.028, z:  0.012, side: -1 },
      { x:  0.028, z:  0.012, side:  1 },
      { x: -0.028, z: -0.008, side: -1 },
      { x:  0.028, z: -0.008, side:  1 },
      { x: -0.024, z: -0.028, side: -1 },
      { x:  0.024, z: -0.028, side:  1 },
    ]
    legDefs.forEach((def, li) => {
      const leg = MeshBuilder.CreateCylinder(mk(`Leg${li}`), {
        diameter: 0.003, height: 0.038, tessellation: 5,
      }, scene)
      leg.parent   = this.mesh
      leg.position = new Vector3(def.x, -0.022, def.z)
      leg.rotation = new Vector3(0.2, 0, def.side * 0.65)
      leg.material = darkMat
    })
  }

  activate(position: Vector3, speed: number, lightPos: Vector3) {
    this.isActive  = true
    this.speed     = speed
    this.lightPos  = lightPos
    this.mesh.setEnabled(true)
    this.mesh.position  = position.clone()
    this.waypoints = [position, waypointNear(lightPos, 0.6), randomWaypoint(), randomWaypoint()]
    this.currentWP = 0
    this.t         = 0
    this.dashTimer    = 0
    this.dashInterval = randRange(0.25, 0.7)
  }

  updateLightPos(pos: Vector3) {
    this.lightPos = pos
    const nextWP  = (this.currentWP + 1) % this.waypoints.length
    this.waypoints[nextWP] = waypointNear(pos, 0.9)
  }

  deactivate() {
    this.isActive = false
    this.mesh.setEnabled(false)
    this.mesh.position = new Vector3(100, 100, 100)
  }

  update(dt: number) {
    if (!this.isActive) return

    // ── Erratic dash: sudden direction change ──────────────────────
    this.dashTimer += dt
    if (this.dashTimer >= this.dashInterval) {
      this.dashTimer    = 0
      this.dashInterval = randRange(0.2, 0.65)
      this.t = Math.random() * 0.3
      const nextWP = (this.currentWP + 1) % this.waypoints.length
      this.waypoints[nextWP] = Math.random() < 0.35
        ? waypointNear(this.lightPos, 0.8)
        : randomWaypoint()
    }

    // ── Waypoint movement ──────────────────────────────────────────
    const from = this.waypoints[this.currentWP]
    const to   = this.waypoints[(this.currentWP + 1) % this.waypoints.length]
    const dist = Vector3.Distance(from, to)
    this.t += (this.speed * dt) / Math.max(dist, 0.01)

    if (this.t >= 1) {
      this.t = 0
      this.currentWP = (this.currentWP + 1) % this.waypoints.length
      const nextNext = (this.currentWP + 2) % this.waypoints.length
      this.waypoints[nextNext] = Math.random() < 0.3
        ? waypointNear(this.lightPos, 1.0)
        : randomWaypoint()
    }

    const newPos = Vector3.Lerp(from, to, this.t)

    // ── Face travel direction ───────────────────────────────────────
    const dir = newPos.subtract(this.mesh.position)
    if (dir.length() > 0.0005) {
      this.travelDir = Vector3.Lerp(this.travelDir, dir.normalize(), 0.18)
      this.mesh.rotation.y = Math.atan2(this.travelDir.x, this.travelDir.z)
    }

    // ── Apply position + jitter ────────────────────────────────────
    this.mesh.position = newPos
    const j = 0.04 + this.speed * 0.02
    this.mesh.position.addInPlace(new Vector3(
      randRange(-j, j),
      randRange(-j * 0.5, j * 0.5),
      randRange(-j, j),
    ))

    // ── Wing flap (fast rotation around Z, opposite sides) ─────────
    const flapAngle = 0.45 * Math.sin(Date.now() * 0.045)
    this.wingL.rotation.z =  0.22 + flapAngle
    this.wingR.rotation.z = -0.22 - flapAngle
  }
}
