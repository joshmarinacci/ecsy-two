import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
const $ = (sel) => document.querySelector(sel)
import {SpriteLocation, Canvas, ECSYTwoSystem, Sprite, startWorld} from "./ecsytwo.js"
import {KeyboardSystem, KeyboardState} from './keyboard.js'

let world = new World()
world.registerSystem(ECSYTwoSystem)

class Player extends Component {

}

world.registerSystem(KeyboardSystem)

class StandardKeyboardControls extends  Component {
    constructor() {
        super();
    }
}

class PlayerControlSystem extends System {
    execute(delta, time) {
        this.queries.player.results.forEach(ent => {
            let kb = ent.getComponent(KeyboardState)
            let loc = ent.getMutableComponent(SpriteLocation)

            if (kb.isPressed('ArrowRight')) loc.x += 1
            if (kb.isPressed('ArrowLeft')) loc.x -= 1
            if (kb.isPressed('ArrowUp')) loc.y -= 1
            if (kb.isPressed('ArrowDown')) loc.y += 1
        })
    }
}
PlayerControlSystem.queries = {
    player: {
        components: [Player, KeyboardState, SpriteLocation]
    }
}
world.registerSystem(PlayerControlSystem)








function make_player_sprite(width,height,data) {
    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    let ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0,0,width,height)

    let x = 0
    let y = 0
    for (let i=0; i<data.length; i++) {
        let ch = data[i]
        if (ch === ' ') continue;
        if (ch === '\t') continue;
        if (ch === '\n') continue;
        console.log("char",ch)
        if (ch === '0') ctx.fillStyle = 'white'
        if (ch === '1') ctx.fillStyle = 'red'
        if (ch === '2') ctx.fillStyle = 'green'
        if (ch === '3') ctx.fillStyle = 'blue'
        ctx.fillRect(x,y,1,1)
        x = x + 1
        if( x >= width) {
            x = 0
            y = y + 1
        }
    }
    return canvas
}

let player_sprite_image = make_player_sprite(5,5,`
    00100 
    11111 
    00100
    01010
    01010
    `)

let player = world.createEntity()
    .addComponent(Player)
    .addComponent(SpriteLocation, { x: 50, y: 30 })
    .addComponent(Sprite, {image:player_sprite_image, width:5, height:5})
    // .addComponent(SpriteAnimation, { frames: idle })
    .addComponent(KeyboardState)
    .addComponent(StandardKeyboardControls)
    // .addComponent(Score)



let EMPTY = 0
let EGG = 1
let GROUND = 2
let WALL = 3

let TILE_INDEX = {}
let TILE_SIZE = 4

function make_tile(size, data) {
    let canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    let ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.fillRect(0,0,size,size)

    let x = 0
    let y = 0
    let count = 0
    for (let i=0; i<data.length; i++) {
        let ch = data[i]
        if (ch === ' ') continue;
        if (ch === '\t') continue;
        if (ch === '\n') continue;
        // console.log("char",ch)
        if (ch === '0') ctx.fillStyle = 'white'
        if (ch === '1') ctx.fillStyle = 'red'
        if (ch === '2') ctx.fillStyle = 'green'
        if (ch === '3') ctx.fillStyle = 'blue'
        ctx.fillRect(x,y,1,1)
        x = x + 1
        count = count + 1
        if( x >= size) {
            x = 0
            y = y + 1
        }
    }
    if(count !== size*size) {
        console.warn("pixel count less than width x height",count,size*size)
    }
    return canvas
}

TILE_INDEX[EMPTY] = make_tile(TILE_SIZE,`
   0000
   0000
   0000
   0000
   `)
TILE_INDEX[EGG] = make_tile(TILE_SIZE,`
   0330
   3233
   3323
   0330
    `)
TILE_INDEX[GROUND] = make_tile(TILE_SIZE, `
   1010
   0101
   1010
   0101
    `)
TILE_INDEX[WALL] = make_tile(TILE_SIZE,`
  1111
  1111
  1111
  1111
`)

function is_whitespace(ch) {
    if(ch === ' ') return true
    if(ch === '\t') return true
    if(ch === '\n') return true
    return false
}
function make_map(width, height, data) {
    let nums = []
    for(let i=0; i<data.length; i++) {
        let ch = data[i]
        if(is_whitespace(ch)) continue
        nums.push(parseInt(ch,16))
    }
    console.log(nums)
    return {
        width: width,
        height: height,
        data:nums,
    }
}

let TILE_MAP = make_map(10,8, `
   3333333333
   3222222223
   3222222223
   3221222223
   3222222223
   3222222213
   3222122223
   3333333333
`)

class TileMap extends Component {
    constructor() {
        super();
        this.tileSize = 16
        this.width = -1
        this.height = -1
        this.map = []
        this.index = []
    }
}

class TileMapSystem extends System {
    execute(delta, time) {
        this.queries.maps.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let map = ent.getComponent(TileMap)
            let ctx = canvas.dom.getContext('2d')
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            for(let y=0; y<map.height; y++) {
                for(let x=0; x<map.width; x++) {
                    let n = y*map.width+x
                    let tile_index = map.map[n]
                    let tile = map.index[tile_index]
                    ctx.drawImage(tile,x*map.tileSize, y*map.tileSize)
                }
            }
            ctx.restore()
        })
    }
}

TileMapSystem.queries = {
    maps: {
        components:[TileMap, Canvas],
    }
}
world.registerSystem(TileMapSystem)

let view = world.createEntity()
    .addComponent(Canvas, { scale: 5, width:TILE_SIZE*10, height: TILE_SIZE*8})
    // .addComponent(CameraFollowsPlayer, { player:player})
    .addComponent(TileMap, {
        tileSize:4,
        width:TILE_MAP.width,
        height:TILE_MAP.height,
        map:TILE_MAP.data,
        index:TILE_INDEX,
    })
/*
class GameLogic extends System {
    execute(delta, time) {
        this.queries.tilemaps.forEach(ent => {
            let map = ent.getComponent(TileMap)
            this.queries.players.forEach(ent => {
                let player = ent.getComponent(Player)
                let loc = ent.getComponent(SpriteLocation)
                let inter = player.overlapsTileKind(map,EGG)
                if(inter.overlaps === true) {
                    map.setTileAt(GROUND, inter.tile_position)
                    ent.getMutableComponent(Score).changeBy(1)
                }

            })
        })
    }
}
GameLogic.queries = {
    // tilemaps: {
    //     components: [TileMap],
    // },
    // players: {
    //     components: [Player],
    // }
}
*/



startWorld(world)
