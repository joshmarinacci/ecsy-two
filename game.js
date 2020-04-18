import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
import {SpriteLocation, Canvas, ECSYTwoSystem, Sprite, startWorld} from "./ecsytwo.js"
import {KeyboardSystem, KeyboardState} from './keyboard.js'
import {make_map, make_tile, TileMap, TileMapSystem} from './tiles.js'
import {make_player_sprite} from './sprite.js'

let world = new World()

class Player extends Component {

}


class PlayerControlSystem extends System {
    execute(delta, time) {
        this.queries.player.results.forEach(ent => {
            let kb = ent.getComponent(KeyboardState)
            let loc = ent.getMutableComponent(SpriteLocation)

            let newx = loc.x
            let newy = loc.y
            if (kb.isPressed('ArrowRight')) newx += 1
            if (kb.isPressed('ArrowLeft')) newx -= 1
            if (kb.isPressed('ArrowUp')) newy -= 1
            if (kb.isPressed('ArrowDown')) newy += 1

            this.queries.map.results.forEach(ent => {
                let map = ent.getComponent(TileMap)
                let tile = map.tile_index_at_screen(newx,newy)
                if(tile !== 0) {
                    newx = loc.x
                    newy = loc.y
                }
            })
            loc.x = newx
            loc.y = newy
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
world.registerSystem(TileMapSystem)
world.registerSystem(PlayerControlSystem)



let PALETTE = ['transparent','red','green','blue']
let player_sprite_image = make_player_sprite(5,5,PALETTE,`
    00200 
    02220 
    00200
    03030
    03030
    `)

let player = world.createEntity()
    .addComponent(Player)
    .addComponent(SpriteLocation, { x: 5, y: 3 })
    .addComponent(Sprite, {image:player_sprite_image, width:5, height:5})
    // .addComponent(SpriteAnimation, { frames: idle })
    .addComponent(KeyboardState)
    // .addComponent(Score)

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
   0330
   3233
   3323
   0330
    `)
TILE_INDEX[GROUND] = make_tile(TILE_SIZE, PALETTE, `
   1010
   0101
   1010
   0101
    `)
TILE_INDEX[WALL] = make_tile(TILE_SIZE, PALETTE,`
  1111
  1111
  1111
  1111
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
        this.queries.players.forEach(ent => {
            let player = ent.getComponent(Player)
            let loc = ent.getMutableComponent(SpriteLocation)
            this.queries.tilemaps.forEach(ent => {
                let map = ent.getComponent(TileMap)
                // let loc = ent.getComponent(SpriteLocation)
                // let inter = player.overlapsTileKind(map,EGG)
                // if(inter.overlaps === true) {
                //     map.setTileAt(GROUND, inter.tile_position)
                //     ent.getMutableComponent(Score).changeBy(1)
                // }
            })
        })
    }
}
GameLogic.queries = {
    tilemaps: {
        components: [TileMap],
    },
    players: {
        components: [Player],
    }
}
*/

startWorld(world)
