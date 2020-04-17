import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
const $ = (sel) => document.querySelector(sel)

import {SpriteLocation, Canvas, ECSYTwoSystem, Sprite, startWorld, Viewport} from "./ecsytwo.js"




let world = new World()
world.registerSystem(ECSYTwoSystem)

class Player extends Component {

}

class KeyboardState extends Component {
    constructor() {
        super();
        this.states = {}
        this.on_keydown = (e) => {
            if(!this.states[e.key]) this.states[e.key] = false
            this.states[e.key] = true
        }
        this.on_keyup = (e) => {
            if(!this.states[e.key]) this.states[e.key] = false
            this.states[e.key] = false
        }
    }
    isPressed(name) {
        if(this.states[name]) return this.states[name]
        return false
    }
}
class KeyboardSystem extends System {
    execute(delta, time) {
        this.queries.controls.added.forEach( ent => {
            let cont = ent.getMutableComponent(KeyboardState)
            document.addEventListener('keydown',cont.on_keydown)
            document.addEventListener('keyup',cont.on_keyup)
        })
    }
}
KeyboardSystem.queries = {
    controls: {
        components:[KeyboardState],
        listen: { added:true, removed: true},
    },
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
            let loc = ent.getMutableComponent(Location)
            if (kb.isPressed('ArrowRight')) loc.x += 1
            if (kb.isPressed('ArrowLeft')) loc.x -= 1
            if (kb.isPressed('ArrowUp')) loc.y -= 1
            if (kb.isPressed('ArrowDown')) loc.y += 1
        })
    }
}
PlayerControlSystem.queries = {
    player: {
        components: [Player, KeyboardState, Location]
    }
}
world.registerSystem(PlayerControlSystem)





startWorld(world)



let EMPTY = 0
let EGG = 1
let GROUND = 2
let WALL = 3

let TILE_INDEX = {}
let TILE_SIZE = 3

function make_tile(TILE_SIZE, s) {
    let image = new Image(TILE_SIZE, TILE_SIZE)
    return image
}

TILE_INDEX[EMPTY] = make_tile(TILE_SIZE,`
   000
   000
   000
   `)
TILE_INDEX[EGG] = make_tile(TILE_SIZE,`
   000
   010
   000
    `)
TILE_INDEX[GROUND] = make_tile(TILE_SIZE, `
   101
   000
   101
    `)
TILE_INDEX[WALL] = make_tile(TILE_SIZE),`
  111
  111
  111
`

function make_map(width, height, s) {
    return {
        width: width,
        height: height,
        data:[],
    }
}

let TILE_MAP = make_map(10,8, `
   3333333333
   3222222223
   3222222223
   3221222223
   3222222223
   3222222213
   3222222223
   3333333333
`)




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

let player_sprite_image = make_player_sprite(3,3,`
    010 
    111 
    010
    `)

let player = world.createEntity()
    .addComponent(Player)
    .addComponent(SpriteLocation, { x: 50, y: 30 })
    .addComponent(Sprite, {image:player_sprite_image})
    // .addComponent(SpriteAnimation, { frames: idle })
    .addComponent(KeyboardState)
    .addComponent(StandardKeyboardControls)
    // .addComponent(Score)

let view = world.createEntity()
    .addComponent(Canvas)
    .addComponent(Viewport, { tileSize: 16, width: 10, height: 8 })
    // .addComponent(CameraFollowsPlayer, { player:player})
    // .addComponent(TileMap, { index:TILE_INDEX, map:TILE_MAP })

class GameLogic extends System {
    execute(delta, time) {
        this.queries.tilemaps.forEach(ent => {
            let map = ent.getComponent(TileMap)
            this.queries.players.forEach(ent => {
                let player = ent.getComponent(Player)
                let loc = ent.getComponent(Location)
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



