import {System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import ECSYTWO, {
    BackgroundFill, Canvas, Layer,
    Sprite, FilledSprite,
    InputState, KeyboardState,
} from '../../build/ecsy-two.module.js'

let world = new World()
ECSYTWO.initialize(world)

let view = world.createEntity()
    .addComponent(Canvas, { width: 300, height: 300})
    .addComponent(BackgroundFill, {color: 'black'})
    .addComponent(InputState)
    .addComponent(KeyboardState)

// create a front layer so the player can always be above the others
world.createEntity().addComponent(Layer, { name: "front", depth:100})


// the player has a speed
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

// system to move player using input directions at player.speed
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
    // set size, position, and put on the front layer
    .addComponent(Sprite, { x: 10, y: 10, width: 50, height:50, layer:"front"})
    .addComponent(FilledSprite, { color: 'red'})

// create enemy 1
world.createEntity()
    // no layer set, so using the default layer at depth=0
    .addComponent(Sprite, { x: 100, y: 10, width:50, height:50})
    .addComponent(FilledSprite, { color: 'green'})

// create enemy 2
world.createEntity()
    // no layer set, so using the default layer at depth=0
    .addComponent(Sprite, { x: 200, y: 10, width:50, height:50})
    .addComponent(FilledSprite, { color: 'yellow'})

//start everything
ECSYTWO.start(world)
