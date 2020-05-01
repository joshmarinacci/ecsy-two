import {Component, System} from "../node_modules/ecsy/build/ecsy.module.js"
import {KeyboardState} from '../src/keyboard.js'
import {AnimatedSprite, SpriteBounds, SpriteLocation} from '../src/ecsy-two.js'
import {make_bounds, TileMap} from './tiles.js'
import {Notes} from '../src/music.js'

export class Player extends Component {}




export class PlayerControlSystem extends System {
    execute(delta, time) {
        this.queries.player.results.forEach(player => {
            let kb = player.getComponent(KeyboardState)
            let loc = player.getMutableComponent(SpriteLocation)
            let sprite = player.getComponent(SpriteBounds)

            let oldx = loc.x
            let oldy = loc.y
            if (kb.isPressed('ArrowRight')) loc.x += 1
            if (kb.isPressed('ArrowLeft')) loc.x -= 1
            if (kb.isPressed('ArrowUp')) loc.y -= 1
            if (kb.isPressed('ArrowDown')) loc.y += 1
            if(kb.isPressed('ArrowRight')) {
                player.getMutableComponent(AnimatedSprite).flipY = false
            }
            if(kb.isPressed('ArrowLeft')) {
                player.getMutableComponent(AnimatedSprite).flipY = true
            }

            this.queries.map.results.forEach(ent => {
                let map = ent.getComponent(TileMap)
                //don't enter if type is wall
                let bounds = make_bounds(loc.x,loc.y,sprite.width,sprite.height)
                let cols = map.collide_bounds(bounds, map.wall_types)
                cols.forEach(col=>{
                    // console.log("collision ",col)
                    if(map.wall_types.indexOf(col.tile_type) >= 0) {
                        //go back to previous position
                        loc.x = oldx
                        loc.y = oldy
                    }
                })
                /*
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
                })*/
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
