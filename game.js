import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
import {SpriteLocation, Canvas, ECSYTwoSystem, Sprite, startWorld, SpriteSystem, BackgroundFill} from "./ecsytwo.js"
import {KeyboardSystem, KeyboardState} from './keyboard.js'
import {make_map, make_tile, TileMap, TileMapSystem} from './tiles.js'
import {make_player_sprite} from './sprite.js'

let world = new World()

class Player extends Component {

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
            let sprite = ent.getComponent(Sprite)

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
                let cols = map.collide_bounds(bounds, [WALL,EGG])
                cols.forEach(col=>{
                    // console.log("collision ",col)
                    if(col.tile_type === WALL) {
                        //go back to previous position
                        loc.x = oldx
                        loc.y = oldy
                    }
                    if(col.tile_type === EGG) {
                        //clear the egg
                        map.set_tile_at(col.tile_coords,EMPTY)
                    }
                })
            })
        })
    }
}
PlayerControlSystem.queries = {
    player: {
        components: [Player, KeyboardState, SpriteLocation]
    },
    map: {
        components: [TileMap]
    }
}
world.registerSystem(ECSYTwoSystem)
world.registerSystem(KeyboardSystem)
world.registerSystem(PlayerControlSystem)
world.registerSystem(TileMapSystem)
world.registerSystem(SpriteSystem)


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

let player_sprite_image = make_player_sprite(3,4,PALETTE,`
    070 
    888 
    080
    C0C
    `)

let player = world.createEntity()
    .addComponent(Player)
    .addComponent(SpriteLocation, { x: 5, y: 10 })
    .addComponent(Sprite, {image:player_sprite_image, width:3, height:4})
    .addComponent(KeyboardState)

let EMPTY = 0
let EGG = 1
let GROUND = 2
let WALL = 3

let TILE_INDEX = {}
let TILE_SIZE = 4

TILE_INDEX[EMPTY] = make_tile(TILE_SIZE, PALETTE,`
   0000
   0000
   0000
   0000
   `)
TILE_INDEX[EGG] = make_tile(TILE_SIZE,PALETTE,`
   0EE0
   EFEE
   EEEE
   0EE0
    `)
TILE_INDEX[GROUND] = make_tile(TILE_SIZE, PALETTE, `
   1010
   0101
   1010
   0101
    `)
TILE_INDEX[WALL] = make_tile(TILE_SIZE, PALETTE,`
  7777
  8788
  7777
  8887
    `)

let TILE_MAP = make_map(10,8, `
   3333333333
   3000000003
   3000000003
   3001000003
   3000000003
   3000000013
   3000100003
   3333333333
`)


let view = world.createEntity()
    .addComponent(Canvas, { scale: 10, width:TILE_SIZE*10, height: TILE_SIZE*8})
    .addComponent(BackgroundFill, {color: PALETTE[1]})
    // .addComponent(CameraFollowsPlayer, { player:player})
    .addComponent(TileMap, {
        tileSize:4,
        width:TILE_MAP.width,
        height:TILE_MAP.height,
        map:TILE_MAP.data,
        index:TILE_INDEX,
    })

startWorld(world)
