import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill, Canvas,
    ECSYTwoSystem,
    Sprite, startWorld,
    FilledSprite, SpriteSystem, InputState, KeyboardState,
    KeyboardSystem,
} from '../../src/index.js'


let world = new World()
world.registerSystem(ECSYTwoSystem)
world.registerSystem(SpriteSystem)
world.registerSystem(KeyboardSystem)


let view = world.createEntity()
    .addComponent(Canvas, { width: 300, height: 300})
    .addComponent(BackgroundFill, {color: 'black'})
    .addComponent(InputState)
    .addComponent(KeyboardState)


class Player {
    constructor() {
        this.speed = 10
    }
}

//create the player
world.createEntity()
    .addComponent(Player, { speed: 4})
    .addComponent(Sprite, { x: 10, y: 10, width: 50, height:50})
    .addComponent(FilledSprite, { color: 'red'})


function clamp(min, val, max) {
    if(val < min) return min
    if(val > max) return max
    return val
}

// system to move player using input directions
class PlayerControls extends System {
    execute(delta, time) {
        this.queries.input.results.forEach(ent => {
            let input = ent.getComponent(InputState)
            this.queries.player.results.forEach(ent => {
                let player = ent.getComponent(Player)
                let sprite = ent.getComponent(Sprite)
                if(input.states.left)  sprite.x -= player.speed
                if(input.states.right) sprite.x += player.speed
                if(input.states.up)    sprite.y -= player.speed
                if(input.states.down)  sprite.y += player.speed

                sprite.x = clamp(0,sprite.x,300-50)
                sprite.y = clamp(0,sprite.y,300-50)
            })
        })
    }
}
PlayerControls.queries = {
    input: { components: [ InputState]},
    player: {components: [Player, Sprite] },
}

// PlayerControls won't work until we register it
world.registerSystem(PlayerControls)


world.createEntity()
    .addComponent(Sprite, { x: 100, y: 10, width:50, height:50})
    .addComponent(FilledSprite, { color: 'green'})

world.createEntity()
    .addComponent(Sprite, { x: 200, y: 10, width:50, height:50})
    .addComponent(FilledSprite, { color: 'yellow'})

startWorld(world)
