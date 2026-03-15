import { Engine } from '@babylonjs/core/Engines/engine'
import { SceneSetup } from './scene/SceneSetup'
import { PlayerController } from './player/PlayerController'
import { HealthManager } from './player/HealthManager'
import { MosquitoPool } from './mosquito/MosquitoPool'
import { SpawnManager } from './mosquito/SpawnManager'
import { HitDetection } from './combat/HitDetection'
import { ScoreManager } from './scoring/ScoreManager'
import { AudioManager } from './audio/AudioManager'
import { VFXManager } from './vfx/VFXManager'
import { HealthPickup } from './vfx/HealthPickup'
import { HUD } from './ui/HUD'
import { TitleScreen } from './ui/TitleScreen'
import { ResultsScreen } from './ui/ResultsScreen'
import { isMobile } from './input/DeviceDetect'
import { TouchControls } from './input/TouchControls'

type GameState = 'title' | 'playing' | 'results'

export class Game {
  private state: GameState = 'title'
  private sceneSetup:    SceneSetup
  private player!:       PlayerController
  private health!:       HealthManager
  private mosquitoPool!: MosquitoPool
  private spawnManager!: SpawnManager
  private hitDetection!: HitDetection
  private scoreManager!: ScoreManager
  private audioManager!: AudioManager
  private vfxManager!:   VFXManager
  private healthPickup!: HealthPickup
  private hud!:          HUD
  private titleScreen:   TitleScreen
  private resultsScreen!: ResultsScreen
  private touchControls: TouchControls | null = null

  private gameTimer = 0
  private readonly GAME_DURATION = 25

  constructor(
    engine: Engine,
    private canvas: HTMLCanvasElement,
    private uiRoot: HTMLDivElement,
  ) {
    this.sceneSetup = new SceneSetup(engine, canvas)
    const scene      = this.sceneSetup.getScene()
    const lampMgr    = this.sceneSetup.getLampManager()
    const mobile     = isMobile()

    this.scoreManager  = new ScoreManager()
    this.audioManager  = new AudioManager()
    this.vfxManager    = new VFXManager(scene)
    this.mosquitoPool  = new MosquitoPool(scene, !mobile)   // simplified mesh on mobile
    this.spawnManager  = new SpawnManager(this.mosquitoPool, () => lampMgr.getActiveLampPosition())
    this.health        = new HealthManager()
    this.healthPickup  = new HealthPickup(scene)
    this.player        = new PlayerController(scene, canvas)
    this.hitDetection  = new HitDetection(
      this.player, this.mosquitoPool, this.scoreManager, this.audioManager, this.vfxManager,
    )
    this.hud           = new HUD(uiRoot)
    this.titleScreen   = new TitleScreen(uiRoot, () => this.startGame())
    this.resultsScreen = new ResultsScreen(uiRoot, () => this.restartGame())

    if (mobile) {
      this.touchControls = new TouchControls(this.player)
    }

    lampMgr.onSwitch(pos => this.mosquitoPool.updateAllLightPos(pos))
    this.health.onDamage(() => this.hud.flashDamage())
    this.health.onDeath (() => this.endGame())
    this.healthPickup.onCollect(amount => {
      this.health.heal(amount)
      this.hud.flashHeal()
    })
  }

  private startGame() {
    this.state     = 'playing'
    this.gameTimer = this.GAME_DURATION
    this.scoreManager.reset()
    this.health.reset()

    this.sceneSetup.getLampManager().start()
    this.spawnManager.start()
    this.healthPickup.start()
    this.hud.show()

    if (this.touchControls) {
      this.player.enableMobile()
      this.touchControls.show()
    } else {
      this.player.enable()
    }

    this.audioManager.startAmbience()
  }

  private endGame() {
    if (this.state !== 'playing') return
    this.state = 'results'

    this.sceneSetup.getLampManager().stop()
    this.spawnManager.stop()
    this.mosquitoPool.releaseAll()
    this.healthPickup.stop()
    this.hud.hide()

    if (this.touchControls) this.touchControls.hide()
    this.player.disable()
    this.audioManager.stopAmbience()

    const { score, kills, bestCombo } = this.scoreManager.getStats()
    this.resultsScreen.show(score, kills, bestCombo)

    const stored = parseInt(localStorage.getItem('mz_highscore') ?? '0', 10)
    if (score > stored) localStorage.setItem('mz_highscore', String(score))
  }

  private restartGame() {
    this.resultsScreen.hide()
    this.titleScreen.show()
    this.state = 'title'
  }

  update() {
    const scene = this.sceneSetup.getScene()

    if (this.state === 'playing') {
      const dt = scene.getEngine().getDeltaTime() / 1000

      this.gameTimer -= dt
      if (this.gameTimer <= 0) {
        this.gameTimer = 0
        this.endGame()
      } else {
        const playerPos  = this.player.getPosition()
        const mosquitoes = this.mosquitoPool.getActiveMosquitoes()

        this.touchControls?.update(dt)          // mobile movement
        this.sceneSetup.getLampManager().update(dt)
        this.spawnManager.update(this.GAME_DURATION - this.gameTimer)
        this.mosquitoPool.updateAll(dt)
        this.health.update(dt, mosquitoes, playerPos)
        this.healthPickup.update(dt, playerPos)
        this.hitDetection.update()

        const { score, kills, combo } = this.scoreManager.getStats()
        this.hud.update(score, kills, combo, this.gameTimer, this.health.getHP(), this.health.getMaxHP())
        this.audioManager.update(mosquitoes, playerPos)
      }
    }

    scene.render()
  }
}
