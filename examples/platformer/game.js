import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {
    Canvas,
    ECSYTwoSystem,
    Sprite,
    startWorld,
    BackgroundFill,
    Camera,
    CameraFollowsSprite, InputState,
    KeyboardState, KeyboardSystem,
    FullscreenButton, FullscreenSystem,
    AnimatedSprite, ImageSprite, SpriteSystem, LayerParent, LayerRenderingSystem
} from "../../src/index.js"

import {load_tilemap_from_url, TileMap, TileMapSystem} from '../../src/extensions/tiles.js'
import {BackgroundNotes} from '../../src/music.js'
import {ParticleSystem} from '../../src/extensions/particles.js'
import {PlatformerPhysicsSystem, PlayerPhysics} from '../../src/extensions/platformer_controls.js'
import {
    Dialog,
    DialogSystem,
    StateMachine,
    StateMachineSystem,
    WaitForInput
} from '../../src/extensions/dialogs.js'
import {PixelFont, TextBox, TextSystem} from '../../src/extensions/text.js'

class Player extends Component {}

let world = new World()

class Point {
    constructor(x,y) {
        this.x = x
        this.y = y
    }
}
class Size {
    constructor(w,h) {
        this.w = w
        this.h = h
    }
}



class Fish extends Component {
    constructor() {
        super();
        this.start = new Point(0,30)
        this.end = new Point(10,30)
        this.duration = 1000
        this.start_time = 0
        this.forward = true
    }
}

const fract = (n) => n - Math.floor(n)

class FishSystem extends System {
    execute(delta, time) {
        this.queries.fish.results.forEach(ent => {
            let fish = ent.getComponent(Fish)
            let loc = ent.getMutableComponent(Sprite)
            let diff = time - fish.start_time
            let t = fract(diff/fish.duration)
            if(diff > fish.duration) {
                fish.start_time = time
                fish.forward = !fish.forward
            }
            if(!fish.forward) {
                t = 1-t
            }
            loc.x = fish.start.x + (fish.end.x - fish.start.x)*t
            loc.y = fish.start.y + (fish.end.y - fish.start.y)*t
            let sprite = ent.getComponent(Sprite)
            sprite.flipY = fish.forward
        })
    }
}
FishSystem.queries = {
    fish: {
        components:[Fish, Sprite]
    }
}

world.registerSystem(ECSYTwoSystem)
world.registerSystem(LayerRenderingSystem)
world.registerSystem(KeyboardSystem)
world.registerSystem(TileMapSystem)
world.registerSystem(SpriteSystem)
// world.registerSystem(MusicSystem)
world.registerSystem(FishSystem)
world.registerSystem(ParticleSystem)
world.registerSystem(PlatformerPhysicsSystem)
// world.registerSystem(TransitionSystem)
world.registerSystem(StateMachineSystem)
world.registerSystem(DialogSystem)
world.registerSystem(FullscreenSystem)
world.registerSystem(TextSystem)

let TILE_SIZE = 8
let FISH1 = 8
let PALETTE = [
    'transparent',//'#000000',
    '#1D2B53', //1
    '#7E2553', //2
    '#008751', //3
    '#AB5236', //4
    '#5F574F', //5
    '#C2C3C7', //6
    '#FFF1E8', //7
    '#FF004D', //8
    '#FFA300', //9
    '#FFEC27', //A
    '#00E436', //B
    '#29ADFF', //C
    '#83769C', //D
    '#FF77A8', //E
    '#FFCCAA', //F
]
let TILE_INDEX = {}


// let prom4 = load_image_from_url("imgs/seaman_sheet.png").then(img => {
//     let sheet = new SpriteSheet(img,8,8,4,2)
//     player.addComponent(AnimatedSprite, {
//             frames:sheet.sprites_to_frames(0,0,4),
//             width:8,
//             height:8,
//             frame_duration: 250,
//         })
// })
// let prom5 = load_image_from_url("imgs/fish@1x.png").then(img => {
//     let sheet = new SpriteSheet(img,8,8,4,2)
//     TILE_INDEX[FISH1]    = sheet.sprite_to_image(0, 0)
//
//     let fish = world.createEntity()
//         .addComponent(ImageSprite, { image:sheet.sprite_to_image(0,0)})
//         .addComponent(Sprite, {width: 8, height: 8})
//         .addComponent(Fish, {start: new Point(8,32), end: new Point(50,32), duration: 5000})
//
//     player.addComponent(Emitter, {
//             image:sheet.sprite_to_image(2,1),
//             velocityStart: new Point(0,100), // move down and to the right, pixels per second
//             velocityJitter: 0.1, //jitter the velocity
//             accelerationStart: new Point(0,-1), //move them up, pixels per second per second
//             rate:1, // one sprite per second
//             lifetime:2, //lifetime in seconds
//         })
// })


const LEVELS = {}

let prom6 =
    // load_image_from_url("./imgs/castle@1x.png").then(img=>{
    // let sheet = new SpriteSheet(img,8,8,8,8)
    load_tilemap_from_url("./maps/vertical.json").then((data)=> {
        LEVELS.vertical = {
            data: data,
            start: {
                x: 3*8,
                y: 60 * 8,
            }
        }
        LEVELS.vertical.data.tileSize = 8
    }).then(()=>{
        load_tilemap_from_url("./maps/simple.json").then(data => {
            LEVELS.simple = {
                data:data,
                start: {
                    x: 3*8,
                    y: 10*8,
                }
            }
            LEVELS.simple.data.tileSize = 8
        })
    })


let prom7 = load_tilemap_from_url("./maps/dialog.json").then((data)=> {
    console.log("loaded dialog")
    console.log('we have the tile-map data',data)
    LEVELS.dialog = {
        data:data,
        start: {x:0, y:0}
    }
})

let TUBE = 62
class TubeSystem extends System {
    execute(delta, time) {
        let layer_name = "Tile Layer 1"
        this.queries.player.results.forEach(ent => {
            let loc = ent.getComponent(Sprite)
            let input = ent.getComponent(InputState)
            this.queries.map.results.forEach(ent => {
                let map = ent.getComponent(TileMap)
                let px = Math.floor(loc.x/map.tileSize)
                let py = Math.floor(loc.y/map.tileSize)
                let tile = map.tile_at(layer_name,{x:loc.x, y:loc.y+map.tileSize})
                if(tile === TUBE && input.states.down) {
                    console.log("pressed down on a tube!")
                    console.log("player location is",px,py)
                    console.log("map is",map)
                    if(px === 58 && py === 13 && map.source === "./maps/simple.json") {
                        console.log("going to vertical")
                        view.removeComponent(TileMap)
                        view.addComponent(TileMap, LEVELS.vertical.data)
                        player.getMutableComponent(Sprite).x = LEVELS.vertical.start.x
                        player.getMutableComponent(Sprite).y = LEVELS.vertical.start.y
                    }
                    if(px === 13 && py === 60 && map.source === "./maps/vertical.json") {
                        console.log("we won!")
                    }
                }
            })
        })
    }
}
TubeSystem.queries = {
    player: {
        components:[Player, Sprite, InputState]
    },
    map: {
        components:[TileMap]
    }
}
world.registerSystem(TubeSystem)

let view = world.createEntity()
    .addComponent(Canvas, { scale: 10, width:TILE_SIZE*8, height: TILE_SIZE*8, pixelMode:true})
    .addComponent(BackgroundFill, {color: PALETTE[0xC]})
    .addComponent(Camera, { x:1*TILE_SIZE, y:0*TILE_SIZE})
    .addComponent(FullscreenButton)

let player = world.createEntity()
    .addComponent(Player)
    .addComponent(Sprite, { x:0, y: 0, width: 8, height: 8})
    .addComponent(InputState)
    .addComponent(AnimatedSprite, {
        width:8,
        height:8,
        frame_duration: 250,
        src: 'imgs/seaman_sheet.png'
    })
    .addComponent(KeyboardState, {
        mapping: {
            'w':'up',
            'a':'left',
            's':'down',
            'd':'right',
            ' ':'jump',
            'ArrowLeft':'left',
            'ArrowRight':'right',
            'ArrowUp':'up',
            'ArrowDown':'down',
        }
    })
    .addComponent(PlayerPhysics, {
        ay: 200,
        max_vx:50,
        max_vy:50,
        jump_y: 100,
        ground_friction: 0.95,
        h_accel: 3,
        debug:false,
    })

view.addComponent(CameraFollowsSprite, { target: player})

Promise.all([
    // prom4,
    // prom5,
    prom6,
    prom7]).then(()=>{
    let splash = null
    view.addComponent(StateMachine, {states:[
            (machine)=>{
                world.getSystem(PlatformerPhysicsSystem).enabled = false
                splash = world.createEntity()
                splash.addComponent(Sprite, { x: 0, y:0, fixed:true})
                splash.addComponent(ImageSprite, { src:"./imgs/splash@1x.png"})
                view.addComponent(WaitForInput)
                console.log("making splash")
            },
            machine => {
                console.log("showing a dialog")
                splash.removeAllComponents()
                view.addComponent(Sprite, { x:0, y: 0, width: 200, height: 200, fixed:true})
                view.addComponent(PixelFont, {src:"fonts/BitScript.png", metrics_src:'fonts/BitScript.json'})
                view.addComponent(TextBox, { text:'CA', })
                view.addComponent(WaitForInput)
            },
            () => {
                console.log("showing a dialog")
                view.removeComponent(Dialog)
                view.addComponent(Dialog, { text:"Your father \nthe Cat King \nhas been\nkidnapped!", tilemap:LEVELS.dialog.data })
                view.addComponent(WaitForInput)
            },
            (machine) => {
                console.log("showing a dialog")
                view.removeComponent(Dialog)
                view.addComponent(Dialog, { text:"Please rescue\nhim!", tilemap:LEVELS.dialog.data })
                view.addComponent(WaitForInput)
            },
            machine => {
                console.log("done with the state machine")
                view.removeComponent(Dialog)
                view.removeComponent(StateMachine)
                player.getMutableComponent(Sprite).x = LEVELS.simple.start.x
                player.getMutableComponent(Sprite).y = LEVELS.simple.start.y
                view.removeComponent(TileMap)
                view.addComponent(TileMap, LEVELS.simple.data)
                view.addComponent(LayerParent)
                world.getSystem(PlatformerPhysicsSystem).enabled = true
            }
        ]})

    // view.addComponent(FadeTransition,{
    //     direction:'in',
    //     color:'black',
    //     duration:0.5,
    // })
    console.log('all images loaded')
})

startWorld(world)

// document.addEventListener('mousedown',()=>{
    view.addComponent(BackgroundNotes, {notes:[
            "C3","D3","E3",
            "C3","D3","E3",
            "C3","D3","E3",
            "C3","D3","E3",

            "D3","E3","F3",
            "D3","E3","F3",
            "D3","E3","F3",
            "D3","E3","F3",
        ]})
// })
