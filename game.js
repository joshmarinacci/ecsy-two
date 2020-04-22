import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
import {
    SpriteLocation,
    Canvas,
    ECSYTwoSystem,
    Sprite,
    AnimatedSprite,
    startWorld,
    SpriteSystem,
    BackgroundFill,
    Camera, CameraFollowsSprite, SpriteBounds
} from "./ecsytwo.js"
import {KeyboardSystem, KeyboardState, InputState} from './keyboard.js'
import {make_bounds, make_map, make_tile, TileMap, TileMapSystem} from './tiles.js'
import {BackgroundMusic, MusicSystem, Sound} from './music.js'
import {Emitter, ParticleSystem} from './particles.js'
import {load_image_from_url, SpriteSheet} from './image.js'
import {Player, PlayerControlSystem} from './overhead_controls.js'
import {PlatformerPhysicsSystem, PlayerPhysics} from './platformer_controls.js'
import {FadeTransition, TransitionSystem} from './transitions.js'
import {
    Dialog,
    DialogSystem,
    FixedWidthFont,
    StateMachine,
    StateMachineSystem,
    VariableWidthFont,
    WaitForInput
} from './dialogs.js'

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
            let loc = ent.getMutableComponent(SpriteLocation)
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
        components:[Fish, Sprite, SpriteLocation]
    }
}

world.registerSystem(ECSYTwoSystem)
world.registerSystem(KeyboardSystem)
world.registerSystem(TileMapSystem)
world.registerSystem(SpriteSystem)
// world.registerSystem(MusicSystem)
world.registerSystem(FishSystem)
world.registerSystem(ParticleSystem)
// world.registerSystem(PlayerControlSystem)
world.registerSystem(PlatformerPhysicsSystem)
world.registerSystem(TransitionSystem)
world.registerSystem(StateMachineSystem)
world.registerSystem(DialogSystem)

let TILE_SIZE = 8
let EMPTY = 0
let EGG = 1
let GROUND = 2
let WALL = 3
let TUBE = 4
let SEAWEED1 = 5
let SEAWEED2 = 6
let FLOOR = 7
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

let player = world.createEntity()

class EggSystem extends System {
    execute(delta, time) {
        this.queries.player.results.forEach(player => {
            let sprite_location = player.getComponent(SpriteLocation)
            let sprite_bounds = player.getComponent(SpriteBounds)
            this.queries.map.results.forEach(ent => {
                let map = ent.getComponent(TileMap)
                //don't enter if type is wall
                let bounds = make_bounds(sprite_location.x, sprite_location.y, sprite_bounds.width, sprite_bounds.height)
                let cols = map.collide_bounds(bounds, [EGG])
                cols.forEach(col => {
                    map.set_tile_at(col.tile_coords,EMPTY)
                    ent.addComponent(Sound, {notes:["A4","E5"], noteLength:'16n'})
                })
            })
        })
    }
}
EggSystem.queries = {
    player: {
        components:[Player]
    },
    map: {
        components: [TileMap]
    }
}
// world.registerSystem(EggSystem)

let prom1 = load_image_from_url("./imgs/blocks@1x.png").then(blocks_img=>{
    let sheet = new SpriteSheet(blocks_img,8,8,4,2)
    TILE_INDEX[WALL] = sheet.sprite_to_image(0,0)
    TILE_INDEX[TUBE] = sheet.sprite_to_image(1,0)
})
let prom2 = load_image_from_url("./imgs/dialog@1x.png").then(img => {
    let sheet = new SpriteSheet(img)
    sheet.sprite_to_image(0,0)

})
let prom3 = load_image_from_url("imgs/lucky_block@1x.png").then(img =>{
    TILE_INDEX[EGG] = img
})
let prom4 = load_image_from_url("imgs/seaman_sheet.png").then(img => {
    let sheet = new SpriteSheet(img,8,8,4,2)
    player.addComponent(Player)
        .addComponent(SpriteLocation, { x: 20, y: 30 })
        .addComponent(SpriteBounds, { width: 8, height: 8})
        .addComponent(AnimatedSprite, {
            frames:sheet.sprites_to_frames(0,0,4),
            width:8,
            height:8,
            frame_duration: 250,
        })
        .addComponent(InputState)
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
})
let prom5 = load_image_from_url("imgs/fish@1x.png").then(img => {
    let sheet = new SpriteSheet(img,8,8,4,2)
    TILE_INDEX[SEAWEED1] = sheet.sprite_to_image(3,0)
    TILE_INDEX[SEAWEED2] = sheet.sprite_to_image(3,1)
    TILE_INDEX[FLOOR]    = sheet.sprite_to_image(3, 2)
    TILE_INDEX[FISH1]    = sheet.sprite_to_image(0, 0)

    let fish = world.createEntity()
        .addComponent(Sprite, { image:sheet.sprite_to_image(0,0), width: 8, height: 8})
        .addComponent(SpriteLocation)
        .addComponent(Fish, {start: new Point(8,32), end: new Point(50,32), duration: 5000})

    player.addComponent(Emitter, {
            image:sheet.sprite_to_image(2,1),
            velocityStart: new Point(0,100), // move down and to the right, pixels per second
            velocityJitter: 0.1, //jitter the velocity
            accelerationStart: new Point(0,-1), //move them up, pixels per second per second
            rate:1, // one sprite per second
            lifetime:2, //lifetime in seconds
        })
})

TILE_INDEX[EMPTY] = make_tile(TILE_SIZE, PALETTE,`
   00000000
   00000000
   00000000
   00000000
   00000000
   00000000
   00000000
   00000000
   `)
TILE_INDEX[GROUND] = make_tile(TILE_SIZE, PALETTE, `
   1010
   0101
   1010
   0101
    `)

function make_area_1() {
    player.addComponent(PlayerPhysics, {
        ay: 200,
        max_vx:50,
        max_vy:50,
        jump_y: 100,
        ground_friction: 0.95,
        h_accel: 3,
        debug:false,
    })

    let TILE_MAP = {
        width:20,
        height:8,
        data:[]
    }
    TILE_MAP.data.fill(0,0,TILE_MAP.width*TILE_MAP.height)
    for(let i=0; i<TILE_MAP.width;i++) {
        for(let j=0; j<TILE_MAP.height;j++) {
            let n = j*TILE_MAP.width+i
            let v = 1
            if(i===0 || i===TILE_MAP.width-1) v = 3
            if(j===0 || j===TILE_MAP.height-1) v = 3
            TILE_MAP.data[n] = v
        }
    }

    TILE_MAP.data[4+7*TILE_MAP.width] = TUBE
    TILE_MAP.data[4+6*TILE_MAP.width] = WALL
    TILE_MAP.data[5+5*TILE_MAP.width] = WALL
    TILE_MAP.data[6+4*TILE_MAP.width] = WALL

    return {
        name:'area1',
        tileSize:TILE_SIZE,
        width:TILE_MAP.width,
        height:TILE_MAP.height,
        map:TILE_MAP.data,
        index:TILE_INDEX,
        wall_types: [WALL, TUBE, FLOOR, SEAWEED1, SEAWEED2]
    }
}

function make_area_2() {
    let TILE_MAP = {
        width:8,
        height:8,
        data:[]
    }
    TILE_MAP.data.fill(0,0,TILE_MAP.width*TILE_MAP.height)
    for(let i=0; i<TILE_MAP.width;i++) {
        for(let j=0; j<TILE_MAP.height;j++) {
            let n = j*TILE_MAP.width+i
            let v = 0
            if(i===0 || i===TILE_MAP.width-1) v = j%2===0?SEAWEED1:SEAWEED2
            if(j===0 || j===TILE_MAP.height-1) v = FLOOR
            TILE_MAP.data[n] = v
        }
    }

    TILE_MAP.data[4+7*TILE_MAP.width] = TUBE
    TILE_MAP.data[4+5*TILE_MAP.width] = FISH1

    return {
        name:'area2',
        tileSize:TILE_SIZE,
        width:TILE_MAP.width,
        height:TILE_MAP.height,
        map:TILE_MAP.data,
        index:TILE_INDEX,
        wall_types: [WALL, TUBE, FLOOR, SEAWEED1, SEAWEED2]
    }
}


function load_tilemap(url,sheet) {
    return fetch(url).then(res => res.json()).then(data => {
        console.log("data is ", data)
        let ts = data.tilesets[0]
        let TILE_MAP = {
            width: data.width,
            height: data.height,
            data: data.layers[0].data
        }

        let TILE_INDEX = []
        let start = ts.firstgid
        for (let i = 0; i < ts.tilecount; i++) {
            TILE_INDEX[start] = sheet.sprite_to_image(i % 8, Math.floor(i / 8))
            start++
        }
        let blocking = []
        if(ts.tiles) {
            ts.tiles.forEach(tile => {
                if (tile.type === 'floor') blocking.push(tile.id + 1)
                if (tile.type === 'wall') blocking.push(tile.id + 1)
                if (tile.type === 'block') blocking.push(tile.id + 1)
            })
        }

        // blocking = [2]
        console.log("blocking numbers are", blocking)
        return {
            name: 'area3',
            tileSize: ts.tilewidth,
            width: TILE_MAP.width,
            height: TILE_MAP.height,
            map: TILE_MAP.data,
            index: TILE_INDEX,
            wall_types: blocking,
        }
    })
}

let prom6 = load_image_from_url("./imgs/castle@1x.png").then(img=>{
    let sheet = new SpriteSheet(img,8,8,8,8)
    load_tilemap("./maps/simple.json",sheet).then((data)=>{
        console.log("loaded simple json")
        view.addComponent(TileMap, data)

        player.addComponent(PlayerPhysics, {
            ay: 200,
            max_vx:50,
            max_vy:50,
            jump_y: 100,
            ground_friction: 0.95,
            h_accel: 3,
            debug:false,
        })
    })
})

let dialog_tilemap = null

let prom7 = load_image_from_url("./imgs/dialog@1x.png").then(img => {
    let sheet = new SpriteSheet(img,8,8,8,8)
    load_tilemap("./maps/dialog.json",sheet).then((data)=> {
        console.log("loaded dialog")
        console.log('we have the tilemap data',data)
        dialog_tilemap = data
    })
})





let view = world.createEntity()
    .addComponent(Canvas, { scale: 10, width:TILE_SIZE*10, height: TILE_SIZE*8})
    .addComponent(BackgroundFill, {color: PALETTE[0xC]})
    .addComponent(Camera, { x:1*TILE_SIZE, y:0*TILE_SIZE})
    .addComponent(CameraFollowsSprite, { target: player})

Promise.all([prom1,prom3, prom4, prom5, prom6, prom7]).then(()=>{
    let splash = null
    view.addComponent(StateMachine, {states:[
            (machine)=>{
                console.log("starting the state machine")
                world.getSystem(PlatformerPhysicsSystem).enabled = false
                splash = world.createEntity()
                splash.addComponent(Sprite, { src:"./imgs/splash@1x.png"})
                splash.addComponent(SpriteLocation, { x: 0, y:0, fixed:true})
                view.addComponent(WaitForInput)
            },
            machine => {
                splash.removeAllComponents()
                let widths = {
                    G:4, J:4, M:5, N:4, O:4, P:4, Q:4, R:4, S:4, U:4, W:5,
                    f:2, i:1,l:1, m:5, s:2,w:5,
                    ' ':3,
                }
                view.addComponent(VariableWidthFont, {
                    src:"./imgs/font_5@1x.png",
                    charHeight: 5,
                    charWidth: 6,
                    charsPerLine: 11,
                    widths: widths,
                })
                // view.addComponent(Dialog, { text:"abcdefghijklm\nnopqrstuvwxyz" , tilemap:dialog_tilemap})
                view.addComponent(Dialog, { text:"Cat Prince!\nWe need \nyour help!" , tilemap:dialog_tilemap})
                view.addComponent(WaitForInput)
            },
            () => {
                view.removeComponent(Dialog)
                view.addComponent(Dialog, { text:"Your father \nthe Cat King \nhas been\nkidnapped!", tilemap:dialog_tilemap })
                view.addComponent(WaitForInput)
            },
            (machine) => {
                view.removeComponent(Dialog)
                view.addComponent(Dialog, { text:"Please rescue\nhim!", tilemap:dialog_tilemap })
                view.addComponent(WaitForInput)
            },
            machine => {
                console.log("done with the state machine")
                view.removeComponent(Dialog)
                view.removeComponent(StateMachine)
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
    view.addComponent(BackgroundMusic, {notes:[
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
