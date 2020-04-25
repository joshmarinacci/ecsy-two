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


let world = new World()
world.registerSystem(ECSYTwoSystem)
world.registerSystem(SpriteSystem)

let game = world.createEntity()
    .addComponent(Canvas, { width: 200, height: 200})
    .addComponent(Camera, { centered:false }) /// Why is the camera required?
    .addComponent(BackgroundFill, {color: "gray"})


class Player {
    constructor() {
        this.direction = 0
        this.hp = 0
        this.speed = 0
    }
}
class Enemy {
    constructor() {
        this.direction = 0
        this.hp = 0
        this.speed = 0
        this.rank = 0
    }
}


world.createEntity()
    .addComponent(Player, {direction: -1})
    .addComponent(Sprite, { x: 100, y: 175, width: 20, height: 20}) // gives it x,y,w,h
    .addComponent(FilledSprite, {color: 'blue'}) // gives it a color until we put in images

world.createEntity()
    .addComponent(Enemy, {direction: 1})
    .addComponent(Sprite, { x: 20, y: 25, width: 10, height: 10})
    .addComponent(FilledSprite, {color: 'red'})
world.createEntity()
    .addComponent(Enemy, {direction: 1})
    .addComponent(Sprite, { x: 80, y: 25, width: 10, height: 10})
    .addComponent(FilledSprite, {color: 'red'})
world.createEntity()
    .addComponent(Enemy, {direction: 1})
    .addComponent(Sprite, { x: 160, y: 25, width: 10, height: 10})
    .addComponent(FilledSprite, {color: 'red'})



class SimplePhysics extends System {
    execute(delta, time) {
        this.queries.players.results.forEach(ent => {
            let player = ent.getMutableComponent(Player)
            let sprite = ent.getMutableComponent(Sprite)
            sprite.y += player.direction
            if( sprite.bottom() <= 0 || sprite.top() >= 200 ) {
                player.direction *= -1;
            }
        })
        this.queries.enemies.results.forEach(ent => {
            let enemy = ent.getMutableComponent(Enemy)
            let sprite = ent.getMutableComponent(Sprite)
            sprite.y += enemy.direction
            if( sprite.bottom() <= 0 || sprite.top() >= 200 ) {
                enemy.direction *= -1;
            }
        })
    }
}
SimplePhysics.queries = {
    players: {
        components: [Player, Sprite],
    },
    enemies: { components:[Enemy, Sprite]}
}

world.registerSystem(SimplePhysics)

startWorld(world)
