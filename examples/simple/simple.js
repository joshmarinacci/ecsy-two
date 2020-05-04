import {System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill, Canvas,
    ECSYTwoSystem,
    Sprite, startWorld,
    FilledSprite, SpriteSystem, InputState, KeyboardState,
    KeyboardSystem,
    Layer, LayerParent, LayerRenderingSystem,
} from '../../src/index.js'


let world = new World()
world.registerSystem(ECSYTwoSystem)
world.registerSystem(SpriteSystem)
world.registerSystem(KeyboardSystem)
world.registerSystem(LayerRenderingSystem)


let view = world.createEntity()
    .addComponent(Canvas, { width: 300, height: 300})
    .addComponent(BackgroundFill, {color: 'black'})
    .addComponent(InputState)
    .addComponent(KeyboardState)

// world.createEntity().addComponent(Layer, { name: "default", depth:0})
// world.createEntity().addComponent(Layer, { name: "middle", depth:50})
world.createEntity().addComponent(Layer, { name: "front", depth:100})

class Player {
    constructor() {
        this.speed = 10
    }
}

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
// system needs player and input
PlayerControls.queries = {
    input: { components: [ InputState]},
    player: {components: [Player, Sprite] },
}

// PlayerControls won't work until we register it
world.registerSystem(PlayerControls)


//create the player
world.createEntity()
    .addComponent(Player, { speed: 4})
    .addComponent(Sprite, { x: 10, y: 10, width: 50, height:50, layer:"front"})
    .addComponent(FilledSprite, { color: 'red'})

// create enemy 1
world.createEntity()
    .addComponent(Sprite, { x: 100, y: 10, width:50, height:50})
    .addComponent(FilledSprite, { color: 'green'})
    // .addComponent(LayerParent, { name: "middle"})

// create enemy 2
world.createEntity()
    .addComponent(Sprite, { x: 200, y: 10, width:50, height:50})
    .addComponent(FilledSprite, { color: 'yellow'})
    // .addComponent(LayerParent, { name: "back"})

startWorld(world)
