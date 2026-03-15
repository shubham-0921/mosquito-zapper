import { Scene } from '@babylonjs/core/scene'
import { Vector3 } from '@babylonjs/core/Maths/math.vector'
import { Color3 } from '@babylonjs/core/Maths/math.color'
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder'
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial'
import { Mesh } from '@babylonjs/core/Meshes/mesh'
import { PointLight } from '@babylonjs/core/Lights/pointLight'

const MAX_ACTIVE      = 2    // fewer pickups on the floor at once
const SPAWN_INTERVAL  = 10   // slightly more frequent — player needs them
const FIRST_SPAWN     = 4    // first one appears sooner
const COLLECT_RADIUS  = 0.9
export const HEAL_AMOUNT = 18  // smaller heals — never feel fully safe

interface Pickup {
  mesh: Mesh
  light: PointLight
  crossA: Mesh   // + cross arm A
  crossB: Mesh   // + cross arm B
  active: boolean
  bobT: number
  baseY: number
}

export class HealthPickup {
  private pickups: Pickup[] = []
  private spawnTimer = FIRST_SPAWN
  private collectCallbacks: Array<(amount: number) => void> = []

  constructor(private scene: Scene) {
    for (let i = 0; i < MAX_ACTIVE; i++) {
      this.pickups.push(this.createPickup(i))
    }
  }

  private createPickup(i: number): Pickup {
    const scene = this.scene

    const mat = new StandardMaterial(`hpMat${i}`, scene)
    mat.diffuseColor  = new Color3(0.15, 0.9, 0.25)
    mat.emissiveColor = new Color3(0.08, 0.55, 0.12)
    mat.specularColor = new Color3(1, 1, 1)
    mat.specularPower = 64

    // Glowing orb
    const mesh = MeshBuilder.CreateSphere(`hpOrb${i}`, { diameter: 0.2, segments: 10 }, scene)
    mesh.material  = mesh.material = mat
    mesh.isVisible = false

    // Red cross (+) on top — two thin boxes
    const crossMat = new StandardMaterial(`hpCrossMat${i}`, scene)
    crossMat.diffuseColor  = new Color3(0.9, 0.1, 0.1)
    crossMat.emissiveColor = new Color3(0.6, 0.05, 0.05)

    const crossA = MeshBuilder.CreateBox(`hpCrossA${i}`, { width: 0.18, height: 0.04, depth: 0.04 }, scene)
    crossA.material  = crossMat
    crossA.isVisible = false

    const crossB = MeshBuilder.CreateBox(`hpCrossB${i}`, { width: 0.04, height: 0.18, depth: 0.04 }, scene)
    crossB.material  = crossMat
    crossB.isVisible = false

    // Green point light
    const light = new PointLight(`hpLight${i}`, Vector3.Zero(), scene)
    light.diffuse    = new Color3(0.2, 1.0, 0.3)
    light.specular   = new Color3(0.2, 1.0, 0.3)
    light.intensity  = 0
    light.range      = 2.5
    light.setEnabled(false)

    return { mesh, light, crossA, crossB, active: false, bobT: 0, baseY: 0.35 }
  }

  start() {
    this.spawnTimer = FIRST_SPAWN
    for (const p of this.pickups) this.deactivate(p)
  }

  update(dt: number, playerPos: Vector3) {
    this.spawnTimer -= dt
    if (this.spawnTimer <= 0) {
      this.trySpawn()
      this.spawnTimer = SPAWN_INTERVAL
    }

    for (const p of this.pickups) {
      if (!p.active) continue

      // Bob up and down + slow rotate
      p.bobT += dt * 1.8
      const y = p.baseY + Math.sin(p.bobT) * 0.07
      p.mesh.position.y  = y
      p.crossA.position  = new Vector3(p.mesh.position.x, y + 0.12, p.mesh.position.z)
      p.crossB.position  = new Vector3(p.mesh.position.x, y + 0.12, p.mesh.position.z)

      // Spin the cross
      p.crossA.rotation.y += dt * 1.2
      p.crossB.rotation.y += dt * 1.2

      // Pulse glow
      p.light.position = new Vector3(p.mesh.position.x, y, p.mesh.position.z)
      p.light.intensity = 0.45 + 0.2 * Math.sin(p.bobT * 2.5)

      // Collect on proximity — use XZ only; playerPos.y is camera height (1.7),
      // pickup is on the floor (0.35), so 3D distance is always > 1.3 and never triggers.
      const dx = playerPos.x - p.mesh.position.x
      const dz = playerPos.z - p.mesh.position.z
      if (Math.sqrt(dx * dx + dz * dz) < COLLECT_RADIUS) {
        this.collect(p)
      }
    }
  }

  private trySpawn() {
    const inactive = this.pickups.find(p => !p.active)
    if (!inactive) return
    const activeCount = this.pickups.filter(p => p.active).length
    if (activeCount >= MAX_ACTIVE) return

    // Random position on the floor (avoid corners that clip into walls)
    const x = Math.random() * 7 - 3.5
    const z = Math.random() * 7 - 3.5

    inactive.mesh.position  = new Vector3(x, inactive.baseY, z)
    inactive.crossA.position = new Vector3(x, inactive.baseY + 0.12, z)
    inactive.crossB.position = new Vector3(x, inactive.baseY + 0.12, z)
    inactive.bobT = Math.random() * Math.PI * 2

    inactive.mesh.isVisible  = true
    inactive.crossA.isVisible = true
    inactive.crossB.isVisible = true
    inactive.light.setEnabled(true)
    inactive.active = true
  }

  private collect(p: Pickup) {
    this.collectCallbacks.forEach(cb => cb(HEAL_AMOUNT))
    this.deactivate(p)
  }

  private deactivate(p: Pickup) {
    p.active           = false
    p.mesh.isVisible   = false
    p.crossA.isVisible = false
    p.crossB.isVisible = false
    p.light.intensity  = 0
    p.light.setEnabled(false)
  }

  stop() {
    for (const p of this.pickups) this.deactivate(p)
  }

  onCollect(cb: (amount: number) => void) {
    this.collectCallbacks.push(cb)
  }
}
