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
        this.field = new Sprite()
        this.field.x = 0
        this.field.y = 0
        this.field.width = 300
        this.field.height = 180
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
        })
    }
    spawn_new_enemies(game, enemy_speed) {
        console.log("making new enemies", enemy_speed)
        for(let i=0; i<10; i++) {
            for(let j=0; j<5; j++) {
                let dropTarget = 10+j*20
                let position = new Vector2D(50+i*20, dropTarget-10)
                let direction = new Vector2D(1, 0)
                let rank = 4-j

                this.world.createEntity()
                    .addComponent(Enemy, {
                        rank: rank,
                        dropTarget: dropTarget,
                        firePercent: game.enemyFirePercent,
                        dropAmount: game.enemyDropAmount
                    })
                    .addComponent(Sprite, {
                        x:position.x,
                        y:position.y,
                        w: 10,
                        h: 10,
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

        enemy.timer += delta
        if(enemy.timer > enemy.fireWait) {
            enemy.timer = 0
            enemy.fireWait = 1 + Math.random() * 4
            if(Math.floor(Math.random()*100) < enemy.firePercent &&
                !this.queries.enemies.results.find(existsUnderneath)) {
                // console.log("enemy is firing")
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

            // console.log(phy.speed)
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
