import {System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import ECSYTWO, {
    BackgroundFill, Canvas, Layer,
    Sprite, InputState, ImageSprite,
    TextBox, TextSystem, CanvasFont,
    MouseState, MouseInputSystem, make_point,
} from '../../build/ecsy-two.module.js'
import {TouchInputSystem, TouchState} from './touch.js'




// make the world
let world = new World()
ECSYTWO.initialize(world)
world.registerSystem(TextSystem)
world.registerSystem(MouseInputSystem)
world.registerSystem(TouchInputSystem)

// make game state

class GameState {
    constructor() {
        this.score = 0
    }
}

// make a canvas

let canvas = world.createEntity()
    .addComponent(Canvas, { width: 1024, height: 768-100})
    .addComponent(BackgroundFill, { color: 'gray'})
    .addComponent(GameState)
    .addComponent(MouseState)
    .addComponent(InputState)
    .addComponent(TouchState)

// draw the score
let score = world.createEntity()
    .addComponent(TextBox, { text: "cats: "})
    .addComponent(CanvasFont, )
    .addComponent(Sprite, { x: 10, y: 10})


// create a cat sprite

const rand = (min,max) => min + Math.random()*(max-min)

class Kitten {
    constructor() {
        this.speed = 1
    }
}

for(let i=0; i<5; i++) {
    let can = canvas.getComponent(Canvas)
    let cat = world.createEntity()
    cat.addComponent(Sprite, {x: 50, y: 50, width: 200, height: 200})
    cat.addComponent(ImageSprite, {src: "./kitten.png"})
    cat.addComponent(Kitten, { speed: rand(5, 10)})

    // set a random position
    cat.getComponent(Sprite).x = i*200
    cat.getComponent(Sprite).y = rand(0,can.height)
}

// animate it down
class KittenRain extends System {
    execute(delta, time) {
        let can = canvas.getComponent(Canvas)
        this.queries.kittens.results.forEach(ent => {
            let sprite = ent.getComponent(Sprite)
            let kitten = ent.getComponent(Kitten)
            sprite.y += kitten.speed

            if(sprite.y > can.height) {
                sprite.x = rand(0, can.width)
                sprite.y = rand(-400, 0)
            }
        })
    }
}
KittenRain.queries = {
    kittens: {
        components:[ImageSprite]
    }
}
world.registerSystem(KittenRain)


class KittenClicker extends System {
    execute(delta, time) {
        let mouse = canvas.getComponent(MouseState)
        let input = canvas.getComponent(InputState)
        let touch = canvas.getComponent(TouchState)
        if(input.states['left-button'] === true) {
            this.checkit(mouse.clientX, mouse.clientY)
        }
        touch.points.forEach(pt => {
            this.checkit(pt.x, pt.y)
        })
    }

    checkit(clientX, clientY) {
        let point = make_point(clientX, clientY)
        this.queries.kittens.results.forEach(ent => {
            let sprite = ent.getComponent(Sprite)
            if(sprite.contains(point)) {
                // every time you click
                let state = canvas.getComponent(GameState)
                state.score += 1
                score.getComponent(TextBox).text = "cats " + state.score
                sprite.x = -1000
            }
        })
    }
}
KittenClicker.queries = {
    kittens: {
        components: [Kitten]
    }
}

world.registerSystem(KittenClicker)

// play da da da

// make hundreds of cats with different sizes


// start the world


ECSYTWO.start(world)