import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {SpriteBounds, SpriteLocation} from './ecsytwo.js'
import {make_bounds, TileMap} from './tiles.js'
import {KeyboardState} from './keyboard.js'

export class Jumping extends Component {

}
export class PlayerPhysics extends Component {
    constructor() {
        super();
        this.vx = 0
        this.vy = 0
        this.ax = 0
        this.ay = 0
    }

}


export class PlatformerPhysicsSystem extends System {
    execute(delta, time) {
        this.queries.jump.added.forEach(ent => {
            let player_physics = ent.getComponent(PlayerPhysics)
            let jump = ent.getComponent(Jumping)
            player_physics.vy = -10
            player_physics.vx = 0
        })
        this.queries.player.results.forEach(player => {
            let kb = player.getComponent(KeyboardState)
            let player_physics = player.getComponent(PlayerPhysics)
            let sprite_location = player.getComponent(SpriteLocation)
            let sprite_bounds = player.getComponent(SpriteBounds)


            if (kb.isPressed('ArrowRight')) player_physics.vx += 1
            if (kb.isPressed('ArrowLeft')) player_physics.vx -= 1
            if (kb.isPressed(' ')) player_physics.vy = -10

            let oldx = sprite_location.x
            let oldy = sprite_location.y
            player_physics.vx += player_physics.ax*delta/1000
            player_physics.vy += player_physics.ay*delta/1000

            if(player_physics.vx > 0 && player_physics.vx > 10) {
                player_physics.vx = 10
            }

            sprite_location.x += player_physics.vx*delta/1000
            sprite_location.y += player_physics.vy*delta/1000





            this.queries.map.results.forEach(ent => {
                let map = ent.getComponent(TileMap)
                //don't enter if type is wall
                let bounds = make_bounds(sprite_location.x, sprite_location.y, sprite_bounds.width, sprite_bounds.height)
                let cols = map.collide_bounds(bounds, map.wall_types)
                cols.forEach(col => {
                    // if (map.wall_types.indexOf(col.tile_type) >= 0) {
                        //go back to previous position
                    sprite_location.x = oldx
                    sprite_location.y = oldy
                    // player_physics.vx = 0
                    player_physics.vy = 0
                    // }
                    // if(col.tile_type === EGG) {
                    //     //clear the egg
                    //     map.set_tile_at(col.tile_coords,EMPTY)
                    //     ent.addComponent(Sound, {notes:["A4","E5"], noteLength:'16n'})
                    // }
                })
            })

        })
    }
}
PlatformerPhysicsSystem.queries = {
    jump: {
        components:[Jumping, PlayerPhysics],
        listen: {
            added:true,
            removed:true,
        }
    },
    player: {
        components:[PlayerPhysics, SpriteLocation, KeyboardState]
    },
    map: {
        components: [TileMap]
    }
}
