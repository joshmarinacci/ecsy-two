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
import {KeyboardSystem, KeyboardState} from './keyboard.js'
import {make_map, make_tile, TileMap, TileMapSystem} from './tiles.js'
import {load_image_from_url} from './sprite.js'
import {BackgroundMusic, MusicSystem, Sound} from './music.js'

let world = new World()

class Player extends Component {

}

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

function make_bounds(x, y, width, height) {
    return {
        x:x,
        y:y,
        width:width,
        height:height,
        type:'screen'
    }
}

class PlayerControlSystem extends System {
    execute(delta, time) {
        this.queries.player.results.forEach(ent => {
            let kb = ent.getComponent(KeyboardState)
            let loc = ent.getMutableComponent(SpriteLocation)
            let sprite = ent.getComponent(SpriteBounds)

            let oldx = loc.x
            let oldy = loc.y
            if (kb.isPressed('ArrowRight')) loc.x += 1
            if (kb.isPressed('ArrowLeft')) loc.x -= 1
            if (kb.isPressed('ArrowUp')) loc.y -= 1
            if (kb.isPressed('ArrowDown')) loc.y += 1

            this.queries.map.results.forEach(ent => {
                let map = ent.getComponent(TileMap)
                //don't enter if type is wall
                let bounds = make_bounds(loc.x,loc.y,sprite.width,sprite.height)
                let cols = map.collide_bounds(bounds, [WALL,EGG, TUBE, FLOOR, SEAWEED1, SEAWEED2])
                cols.forEach(col=>{
                    // console.log("collision ",col)
                    if([WALL, FLOOR, SEAWEED1, SEAWEED2].indexOf(col.tile_type) >= 0) {
                        //go back to previous position
                        loc.x = oldx
                        loc.y = oldy
                    }
                    if(col.tile_type === EGG) {
                        //clear the egg
                        map.set_tile_at(col.tile_coords,EMPTY)
                        ent.addComponent(Sound, {notes:["A4","E5"], noteLength:'16n'})
                    }
                })
                cols = map.collide_bounds(bounds, [TUBE])
                cols.forEach(col => {
                    if(col.tile_type === TUBE) {
                        console.log("need to go into the tube", loc)
                        ent.removeComponent(TileMap)
                        if(map.name === 'area1') {
                            ent.addComponent(TileMap, make_area_2())
                            loc.y -= TILE_SIZE*1
                        } else {
                            ent.addComponent(TileMap, make_area_1())
                            loc.y -= TILE_SIZE*1
                        }
                    }
                })
            })
        })
    }
}
PlayerControlSystem.queries = {
    player: {
        components: [Player, KeyboardState, SpriteLocation, SpriteBounds]
    },
    map: {
        components: [TileMap]
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
world.registerSystem(PlayerControlSystem)
world.registerSystem(TileMapSystem)
world.registerSystem(SpriteSystem)
world.registerSystem(MusicSystem)
world.registerSystem(FishSystem)

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

class SpriteSheet {
    constructor(img,tw,th,w,h) {
        this.image = img
        this.tw = tw
        this.th = th
        this.ssw = w
        this.ssh = h
    }

    sprite_to_image(x, y) {
        let canvas = document.createElement('canvas')
        canvas.width = this.tw
        canvas.height = this.th
        let ctx = canvas.getContext('2d')
        ctx.drawImage(this.image,
            x*this.tw,
            y*this.th,
            this.tw,
            this.th,
            0,0,this.tw,this.th)
        return canvas
    }

    sprites_to_frames(x, y, w) {
        let arr = []
        for(let i=0; i<w; i++) {
            arr.push(this.sprite_to_image(x+i,y))
        }
        return arr
    }
}

let player = world.createEntity()

let prom1 = load_image_from_url("./imgs/blocks@1x.png").then(blocks_img=>{
    let sheet = new SpriteSheet(blocks_img,8,8,4,2)
    TILE_INDEX[WALL] = sheet.sprite_to_image(0,0)
    TILE_INDEX[TUBE] = sheet.sprite_to_image(1,0)
})
// let prom2 = load_image_from_url("./imgs/rainbow@1x.png").then((img)=>{
        // player.addComponent(Player)
        // .addComponent(SpriteLocation, { x: 8, y: 8 })
        // .addComponent(Sprite, {image:img, width:8, height:8})
        // .addComponent(KeyboardState)
// })
let prom3 = load_image_from_url("imgs/lucky_block@1x.png").then(img =>{
    TILE_INDEX[EGG] = img
})
let prom4 = load_image_from_url("imgs/seaman_sheet.png").then(img => {
    let sheet = new SpriteSheet(img,8,8,4,2)
    player.addComponent(Player)
        .addComponent(SpriteLocation, { x: 8, y: 8 })
        .addComponent(SpriteBounds, { width: 8, height: 8})
        .addComponent(AnimatedSprite, {
            frames:sheet.sprites_to_frames(0,0,4),
            width:8,
            height:8,
            frame_duration: 250,
        })
        .addComponent(KeyboardState)
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

    return {
        name:'area1',
        tileSize:TILE_SIZE,
        width:TILE_MAP.width,
        height:TILE_MAP.height,
        map:TILE_MAP.data,
        index:TILE_INDEX,
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
    }
}
Promise.all([prom1,prom3, prom4, prom5]).then(()=>{
    console.log('all images loaded')
    view.addComponent(TileMap,make_area_1())
})




let view = world.createEntity()
    .addComponent(Canvas, { scale: 10, width:TILE_SIZE*10, height: TILE_SIZE*8})
    .addComponent(BackgroundFill, {color: PALETTE[0xC]})
    .addComponent(Camera, { x:1*TILE_SIZE, y:0*TILE_SIZE})
    .addComponent(CameraFollowsSprite, { target: player})

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
