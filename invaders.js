import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
import {
    AnimatedSprite,
    BackgroundFill,
    Camera,
    Canvas, DebugOutline,
    ECSYTwoSystem,
    FilledSprite, ImageSprite,
    Sprite,
    SpriteSystem,
    startWorld
} from './ecsytwo.js'
import {InputState, KeyboardState, KeyboardSystem} from './keyboard.js'
import {Emitter, ParticleSystem} from './particles.js'


let world = new World()
world.registerSystem(ECSYTwoSystem)
world.registerSystem(KeyboardSystem)
world.registerSystem(SpriteSystem) //disabled because we will use our own renderer

class GameState {
    constructor() {
        this.enemySpeed = 10;
        this.enemyFirePercent = 10;
        this.enemyDropAmount = 1
        this.field = new Sprite()
        this.field.x = 0
        this.field.y = 0
        this.field.width = 300
        this.field.height = 180

        this.livesRemaining = 2
        this.score = 0
        this.highScores = []

        if (typeof(Storage) !== "undefined") {
            try {
                this.highScores = JSON.parse(localStorage.invadersScores);
                console.log("successfully loaded highscores", this.highScores)
            }
            catch(e) {
                console.log("failed to load highscores")
                this.highScores = [];
            }
        }
    }
    addScore(score) {
        this.highScores.push(score)
        this.highScores.sort((a,b)=>b-a)
        this.highScores = this.highScores.slice(0,10)
        if (typeof(Storage) !== "undefined") {
            localStorage.invadersScores = JSON.stringify(this.highScores);
        }
    }
}

let game = world.createEntity()
    .addComponent(Canvas, { width: 300, height: 180})
    .addComponent(Camera, { centered:false }) /// Why is the camera required?
    .addComponent(BackgroundFill, {color: "gray"})
    .addComponent(GameState)

class Vector2D {
    constructor(x,y) {
        this.x = x
        this.y = y
    }
    scalar_mul(sc) {
        return new Vector2D(this.x*sc,this.y*sc)
    }
    add(v2) {
        return new Vector2D(
            this.x+v2.x,
            this.y+v2.y
        )
    }
    set(x,y) {
        this.x = x
        this.y = y
    }
}

class Player {
    constructor() {
        this.hp = 0
    }
}
class Enemy {
    constructor() {
        this.hp = 0
        this.rank = 0
        this.dropTarget = 0
        this.dropAmount = 1
        this.timer = 0
        this.firePercent = 10
        this.fireWait = Math.random()*5
    }
}
class PhysicsSprite {
    constructor() {
        this.direction = new Vector2D(0,0)
        this.speed = 0
    }
}
class PlayerProjectile {}
class EnemyProjectile {}
class Lose{}

// world.createEntity()
//     .addComponent(Sprite, { width: 1, height: 5})


let enemy_colors = [
    "rgb(150, 7, 7)",
    "rgb(150, 89, 7)",
    "rgb(56, 150, 7)",
    "rgb(7, 150, 122)",
    "rgb(46, 7, 150)"
]


world.createEntity()
    .addComponent(Player, {hp: 10})
    .addComponent(Sprite, { x: 100, y: 150-20, width: 40, height: 20}) // gives it x,y,w,h
    // .addComponent(FilledSprite, {color: 'blue'}) // gives it a color until we put in images
    .addComponent(ImageSprite, {src:'imgs/invaders/player.png'} )
    .addComponent(PhysicsSprite, { speed: 90, direction: new Vector2D(0,0)})
    .addComponent(InputState)
    .addComponent(KeyboardState, {
        mapping:{
            ' ':'fire',
            'ArrowLeft':'left',
            'ArrowRight':'right',
            'ArrowUp':'up',
            'ArrowDown':'down',
        }
    })
    // .addComponent(DebugOutline, { color: 'magenta'})

class GameLogic extends System {
    execute(delta, time) {
        this.queries.game.results.forEach(ent => {
            let game = ent.getComponent(GameState)
            let enemies = this.queries.enemies.results
            //speed increases as there are fewer enemies
            let enemy_speed = game.enemySpeed + game.enemySpeed * (1-enemies.length)

            // calculate bounds of the enemies
            if(enemies.length === 0) {
                this.spawn_new_enemies(game,enemy_speed)
            }
            // console.log("enemy count is", this.queries.enemies.results.length)

            //calc bounds of all of the enemies as a group
            let bounds = enemies
                .map((ent)=> ent.getComponent(Sprite))
                .reduce((a,b) =>  a?a.union(b):b,undefined)
            // console.log("final bounds are",bounds)
            enemies.forEach(ent => {
                this.move_enemy(game,bounds, ent, delta)
            })
            if(bounds.bottom() > game.field.bottom()) {
                ent.addComponent(Lose)
            }

            if(ent.hasComponent(Lose)) {
                console.log("really lost")
                game.addScore(game.score)
                ent.removeComponent(Lose)
                this.world.stop() // just do a hard stop for now
            }
        })
    }
    spawn_new_enemies(game, enemy_speed) {
        for(let i=0; i<10; i++) {
            for(let j=0; j<5; j++) {
                let dropTarget = 10+j*20
                let position = new Vector2D(50+i*20, dropTarget-10)
                let direction = new Vector2D(1, 0)
                let rank = 4-j

                this.world.createEntity()
                    .addComponent(Enemy, {
                        hp: 1,
                        rank: rank,
                        dropTarget: dropTarget,
                        firePercent: game.enemyFirePercent,
                        dropAmount: game.enemyDropAmount
                    })
                    .addComponent(Sprite, {
                        x:position.x,
                        y:position.y,
                        w: 26,
                        h: 20,
                    })
                    .addComponent(AnimatedSprite, {
                        width: 26,
                        height: 20,
                        frame_count: 2,
                        src: 'imgs/invaders/enemy0.png'
                    })
                    .addComponent(PhysicsSprite, {
                        direction:direction,
                        speed:enemy_speed*3,
                    })
            }
        }

        game.enemySpeed += 5;
        game.enemyFirePercent += 5;
        game.enemyDropAmount += 1;
    }

    move_enemy(game, bounds, ent, delta) {
        let edgeMargin = 5
        let gameLeftEdge = game.field.left() + edgeMargin
        let gameRightEdge = game.field.right() + edgeMargin
        let enemy = ent.getComponent(Enemy)
        let sprite = ent.getComponent(Sprite)
        let phys = ent.getComponent(PhysicsSprite)

        // drop down if if hit an edge
        if( (phys.direction.x < 0 && bounds.left() < gameLeftEdge) ||
            (phys.direction.x > 0 && bounds.right() > gameRightEdge) ) {
            enemy.dropTarget += enemy.dropAmount
        }

        //determine direction
        if( sprite.y < enemy.dropTarget) {
            phys.direction = new Vector2D(0,1)
        } else if (phys.direction.y > 0) {
            phys.direction = (bounds.right() > gameRightEdge)
                    ? new Vector2D(-1,0):new Vector2D(1,0)
        }

        //determine firing weapon
        let p = new Vector2D(enemy.x, enemy.y).add(new Vector2D(0,5))
        function existsUnderneath(e) {
            let rect = e.getComponent(Sprite)
            return p.y <= rect.top() && rect.left() < p.x && p.x <= rect.right()
        }

        // see if it should fire a shot
        enemy.timer += delta
        if(enemy.timer > enemy.fireWait) {
            enemy.timer = 0
            enemy.fireWait = 1000 + Math.random() * 1000
            if(Math.floor(Math.random()*100) < enemy.firePercent &&
                !this.queries.enemies.results.find(existsUnderneath)) {
                this.world.createEntity()
                    .addComponent(EnemyProjectile)
                    .addComponent(Sprite, { x: sprite.x, y: sprite.y, width: 1, height: 5})
                    .addComponent(PhysicsSprite, { speed: 60, direction: new Vector2D(0,1)})
            }
        }
    }
}
GameLogic.queries = {
    game: { components: [GameState]},
    enemies: { components: [ Enemy, Sprite]}
}
world.registerSystem(GameLogic)

class SimplePhysics extends System {
    execute(delta, time) {
        this.queries.sprites.results.forEach(ent => {
            let sprite = ent.getMutableComponent(Sprite)
            let phy = ent.getMutableComponent(PhysicsSprite)

            // move left, right, and fire
            if(ent.getComponent(InputState)) {
                let input = ent.getComponent(InputState)
                phy.direction.set(0,0)
                if(input.states.left) {
                    phy.direction.set(-1,0)
                }
                if(input.states.right) {
                    phy.direction.set(1,0)
                }
                if(input.states.fire) {
                    this.fire_player_projectile(sprite)
                }
            }

            // move all sprites
            let velocity = phy.direction.scalar_mul(phy.speed)
            let pos = velocity.scalar_mul(delta/1000).add(sprite)
            sprite.x = pos.x
            sprite.y = pos.y
        })
    }

    fire_player_projectile(sprite) {
        let count = this.queries.player_projectiles.results.length
        if(count === 0) {
            this.world.createEntity()
                .addComponent(PlayerProjectile)
                .addComponent(Sprite, {width:1, height:5, x: sprite.x, y: sprite.y})
                .addComponent(PhysicsSprite, {speed:180, direction: new Vector2D(0,-1)})
        }
    }
}
SimplePhysics.queries = {
    sprites: { components: [Sprite, PhysicsSprite] },
    player_projectiles: { components: [PlayerProjectile]}
}
world.registerSystem(SimplePhysics)


class CollisionSystem extends System {
    execute(delta, time) {
        this.queries.player_projectiles.results.forEach(proj_ent => {
            let proj_sprite = proj_ent.getComponent(Sprite)

            //if projectile leaves the play field
            this.queries.game.results.forEach(ent => {
                if(!proj_sprite.intersects(ent.getComponent(GameState).field)) {
                    proj_ent.removeAllComponents()
                }
            })

            this.queries.enemies.results.forEach(enemy_ent => {
                let en = enemy_ent.getComponent(Sprite)
                if(proj_sprite.intersects(en)) {
                    //damage the enemy and remove if dead
                    let enemy = enemy_ent.getComponent(Enemy)
                    enemy.hp--
                    world.createEntity()
                        .addComponent(Sprite, { x:en.x, y: en.y, width: 2, height: 2})
                        .addComponent(FilledSprite, { color: 'yellow'})
                        .addComponent(Emitter, {
                            velocity: 10, velocity_jitter:100,
                            angle: 0, angle_jitter: 2*Math.PI,
                            duration: 0.3, lifetime: 1,
                            tick_rate: 1
                        })
                    if(enemy.hp <=0) {
                        enemy_ent.removeAllComponents()
                        this.queries.game.results.forEach(ent => {
                            ent.getComponent(GameState).score++
                        })
                    }
                    //also destroy the bullet
                    proj_ent.removeAllComponents()
                }
            })
        })
        this.queries.enemy_projectiles.results.forEach(proj_ent => {
            let proj_sprite = proj_ent.getComponent(Sprite)

            //if projectile leaves the play field
            this.queries.game.results.forEach(ent => {
                if(!proj_sprite.intersects(ent.getComponent(GameState).field)) {
                    proj_ent.removeAllComponents()
                }
            })

            // projectile collides with player
            this.queries.players.results.forEach(player_ent => {
                if(player_ent.getComponent(Sprite).intersects(proj_sprite)) {
                    //remove the projectile
                    proj_ent.removeAllComponents()
                    //damage the player
                    let player = player_ent.getComponent(Player)
                    player.hp--
                    if(player.hp <=0 ) this.queries.game.results.forEach(ent => ent.addComponent(Lose))
                }
            })
        })
    }
}
CollisionSystem.queries = {
    player_projectiles: { components:[PlayerProjectile, Sprite] },
    enemies: { components: [Enemy, Sprite]},
    enemy_projectiles: { components:[EnemyProjectile, Sprite] },
    players: { components: [Player]},
    game: { components: [GameState]}
}
world.registerSystem(CollisionSystem)

world.registerSystem(ParticleSystem)

class SimpleRenderer extends System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            this.queries.enemies.results.forEach(ent => {
                // this.draw_enemy(canvas,ent)
            })
            this.queries.players.results.forEach(ent => {
                // this.draw_player(canvas,ent)
            })
            this.queries.player_projectiles.results.forEach(ent=>{
                this.draw_player_projectile(canvas,ent)
            })
            this.queries.enemy_projectiles.results.forEach(ent=>{
                this.draw_enemy_projectile(canvas,ent)
            })

            this.queries.game.results.forEach(ent => {
                let game = ent.getComponent(GameState)
                this.draw_score(canvas, game)

            })
        })
    }

    draw_enemy(canvas, ent) {
        let enemy = ent.getComponent(Enemy)
        let sprite = ent.getComponent(Sprite)
        let ctx = canvas.dom.getContext('2d')
        ctx.fillStyle = enemy_colors[enemy.rank]
        ctx.fillRect(sprite.x,sprite.y,sprite.width, sprite.height)
    }

    draw_player(canvas, ent) {
        let player = ent.getComponent(Player)
        let sprite = ent.getComponent(Sprite)
        let ctx = canvas.dom.getContext('2d')
        ctx.fillStyle = 'rgb(255,255,0)'
        ctx.fillRect(sprite.x,sprite.y,sprite.width, sprite.height)
    }

    draw_player_projectile(canvas, ent) {
        let sprite = ent.getComponent(Sprite)
        let ctx = canvas.dom.getContext('2d')
        ctx.fillStyle = 'rgb(196,208,106)'
        ctx.fillRect(sprite.x,sprite.y,sprite.width, sprite.height)
    }
    draw_enemy_projectile(canvas, ent) {
        let sprite = ent.getComponent(Sprite)
        let ctx = canvas.dom.getContext('2d')
        ctx.fillStyle = 'rgb(96,195,96)'
        ctx.fillRect(sprite.x,sprite.y,sprite.width, sprite.height)
    }

    draw_score(canvas, game) {
        let ctx = canvas.dom.getContext('2d')
        ctx.fillStyle = 'red'
        ctx.fillText("Score: "+game.score, 20, 10)
        ctx.fillText("Lives: "+game.livesRemaining, 20, 30)
    }
}
SimpleRenderer.queries = {
    canvas: { components: [Canvas]},
    players: { components: [Player, Sprite] },
    enemies: { components:[Enemy, Sprite]},
    player_projectiles: { components: [PlayerProjectile, Sprite]},
    enemy_projectiles: { components: [EnemyProjectile, Sprite]},
    game: { components: [GameState]}
}
world.registerSystem(SimpleRenderer)

startWorld(world)
