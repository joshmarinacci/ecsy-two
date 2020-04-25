import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill,
    Camera,
    Canvas,
    ECSYTwoSystem,
    FilledSprite,
    Sprite,
    SpriteSystem,
    startWorld
} from './ecsytwo.js'
import {InputState, KeyboardState, KeyboardSystem} from './keyboard.js'


let world = new World()
world.registerSystem(ECSYTwoSystem)
world.registerSystem(KeyboardSystem)
// world.registerSystem(SpriteSystem) //disabled because we will use our own renderer

class GameState {
    constructor() {
        this.enemySpeed = 10;
        this.enemyFirePercent = 10;
        this.enemyDropAmount = 1
    }
}

let game = world.createEntity()
    .addComponent(Canvas, { width: 200, height: 200})
    .addComponent(Camera, { centered:false }) /// Why is the camera required?
    .addComponent(BackgroundFill, {color: "gray"})

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

let enemy_colors = [
    "rgb(150, 7, 7)",
    "rgb(150, 89, 7)",
    "rgb(56, 150, 7)",
    "rgb(7, 150, 122)",
    "rgb(46, 7, 150)"
]


world.createEntity()
    .addComponent(Player, {})
    .addComponent(Sprite, { x: 100, y: 175, width: 20, height: 20}) // gives it x,y,w,h
    .addComponent(FilledSprite, {color: 'blue'}) // gives it a color until we put in images
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

world.createEntity()
    .addComponent(Enemy, {rank: 0})
    .addComponent(Sprite, { x: 20, y: 25, width: 10, height: 10})
    .addComponent(FilledSprite, {color: 'red'})
    .addComponent(PhysicsSprite, { speed: 20, direction: new Vector2D(0,-1)})

world.createEntity()
    .addComponent(Enemy, {rank: 1})
    .addComponent(Sprite, { x: 50, y: 25, width: 10, height: 10})
    .addComponent(FilledSprite, {color: 'red'})
    .addComponent(PhysicsSprite, { speed: 10, direction: new Vector2D(0,1)})

world.createEntity()
    .addComponent(Enemy, {rank: 2})
    .addComponent(Sprite, { x: 80, y: 25, width: 10, height: 10})
    .addComponent(FilledSprite, {color: 'red'})
    .addComponent(PhysicsSprite, { speed: 15, direction: new Vector2D(0,1)})

world.createEntity()
    .addComponent(Enemy, {rank: 3})
    .addComponent(Sprite, { x: 120, y: 25, width: 10, height: 10})
    .addComponent(FilledSprite, {color: 'red'})
    .addComponent(PhysicsSprite, { speed: 25, direction: new Vector2D(0,1)})

world.createEntity()
    .addComponent(Enemy, {rank: 4})
    .addComponent(Sprite, { x: 140, y: 25, width: 10, height: 10})
    .addComponent(FilledSprite, {color: 'red'})
    .addComponent(PhysicsSprite, { speed: 30, direction: new Vector2D(0,1)})


class GameLogic extends System {
    execute(delta, time) {
        this.queries.game.results.forEach(ent => {
            let game = ent.getComponent(GameState)

            //speed increases as there are fewer enemies
            let enemy_speed = game.enemySpeed + game.enemySpeed * (1-this.queries.enemies.length)

            // calculate bounds of the enemies
            let bounds = this.queries.enemies.results.reduce((a,b) => {
                return a.getComponent(Sprite).union(b.getComponent(Sprite))
            },undefined)
            console.log("final bounds are",bounds)
            if(this.queries.enemies.results.length === 0) {
                this.spawn_new_enemies(game,enemy_speed)
            }
        })
    }
    spawn_new_enemies(game, enemy_speed) {
        for(let i=0; i<10; i++) {
            for(let j=0; j<5; j++) {
                let dropTarget = 10+j*20
                let position = new Vector2D(50+i*20, dropTarget-100)
                let direction = new Vector2D(1, 0)
                let rank = 4-j
                this.world.createEntity()
                    .addComponent(Sprite, {
                        x:position.x,
                        y:position.y,
                        w: 10,
                        h: 10,
                    })
                    .addComponent(PhysicsSprite, {
                        direction:direction,
                        speed:enemy_speed,
                    })
                    .addComponent(Enemy, {
                        rank: rank,
                        dropTarget: dropTarget,
                        firePercent: game.enemyFirePercent,
                        dropAmount: game.dropAmount
                    })
            }
        }

        game.enemySpeed += 5;
        game.enemyFirePercent += 5;
        game.enemyDropAmount += 1;
    }
}

class SimplePhysics extends System {
    execute(delta, time) {
        this.queries.sprites.results.forEach(ent => {
            let sprite = ent.getMutableComponent(Sprite)
            let phy = ent.getMutableComponent(PhysicsSprite)

            if(ent.getComponent(InputState)) {
                let input = ent.getComponent(InputState)
                phy.direction.set(0,0)
                if(input.states.left) {
                    phy.direction.set(-1,0)
                }
                if(input.states.right) {
                    phy.direction.set(1,0)
                }
            }

            let velocity = phy.direction.scalar_mul(phy.speed)
            let pos = velocity.scalar_mul(delta/1000).add(sprite)
            sprite.x = pos.x
            sprite.y = pos.y
            if( sprite.bottom() <= 0 || sprite.top() >= 200 ) {
                phy.direction = phy.direction.scalar_mul(-1)
            }
        })
    }
}
SimplePhysics.queries = {
    sprites: { components: [Sprite, PhysicsSprite] },
}
world.registerSystem(SimplePhysics)

class SimpleRenderer extends System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            this.queries.enemies.results.forEach(ent => {
                this.draw_enemy(canvas,ent)
            })
            this.queries.players.results.forEach(ent => {
                this.draw_player(canvas,ent)
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
}
SimpleRenderer.queries = {
    canvas: { components: [Canvas]},
    players: { components: [Player, Sprite] },
    enemies: { components:[Enemy, Sprite]}
}
world.registerSystem(SimpleRenderer)

startWorld(world)
