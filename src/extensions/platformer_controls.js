import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {Camera, Canvas, InputState, Sprite,
    make_point,
    AnimatedSprite,
} from '../index.js'
import {make_bounds, TileMap} from './tiles.js'

const UP='UP'
const DOWN='DOWN'
const LEFT='LEFT'
const RIGHT='RIGHT'

export class PlayerPhysics extends Component {
    constructor() {
        super()
        this.vx = 0
        this.vy = 0
        this.ax = 0
        this.ay = 0
        this.max_vx = 10
        this.max_vy = 10
        this.h_accel = 1
        this.jump_y = 10
        this.on_ground = false
        this.debug = false
        this.ground_friction = 0.99
    }

}



export class PlatformerPhysicsSystem extends System {
    execute(delta, time) {
        if(delta > 100) return
        this.queries.jump.added.forEach(ent => {
            let player_physics = ent.getComponent(PlayerPhysics)
            player_physics.vy = -10
            player_physics.vx = 0
        })
        this.queries.player.results.forEach(player_ent => {
            let input = player_ent.getComponent(InputState)
            let player = player_ent.getComponent(PlayerPhysics)
            let loc = player_ent.getComponent(Sprite)
            let sprite_bounds = player_ent.getComponent(Sprite)


            this.queries.map.results.forEach(ent => {
                let map = ent.getComponent(TileMap)

                //jump
                if (input.states.jump && player.on_ground) player.vy -= player.jump_y
                //update velocity with acceleration
                player.vy += player.ay * delta / 1000
                // update player location with velocity
                loc.y += player.vy * delta / 1000

                // cap vertical velocity
                if (player.vy > player.max_vy)  player.vy =  player.max_vy
                //if (player.vy < -player.max_vy) player.vy = -player.max_vy // DON"T cap upwards velocity

                //vertical first
                if(player.vy > 0) this.collide(map,player,this.calculate_tile_points(map,player,loc,DOWN))
                if(player.vy < 0) {
                    player.on_ground = false
                    this.collide(map,player,this.calculate_tile_points(map,player,loc,UP))
                }

                // update velocity with friction
                if(player.on_ground) {
                    player.vx *= player.ground_friction
                }

                // cap horizontal velocity
                if (player.vx > player.max_vx)  player.vx = player.max_vx
                if (player.vx < -player.max_vx) player.vx = -player.max_vx
                // increase velocity in the correct direction
                if (input.states.right) player.vx += player.h_accel
                if (input.states.left)  player.vx -= player.h_accel
                //update velocity with acceleration
                player.vx += player.ax * delta / 1000
                // update player location with velocity
                loc.x += player.vx * delta / 1000

                //then horizontal
                if(player.vx > 0) this.collide(map,player,this.calculate_tile_points(map,player,loc,RIGHT))
                if(player.vx < 0) this.collide(map,player,this.calculate_tile_points(map,player,loc,LEFT))
            })


            //flip the player sprite to face the correct direction
            if(input.states.right) player_ent.getMutableComponent(AnimatedSprite).flipY = false
            if(input.states.left)  player_ent.getMutableComponent(AnimatedSprite).flipY = true
        })
    }
    collide(map,player,points) {
        let layer_name = "Tile Layer 1"
        points.forEach(point => {
            if(player.debug) this._draw_tile_overlay(point.pt, map, 'blue')
            let tile = map.tile_at(layer_name, point.pt)
            // console.log(tile)
            if (map.wall_types.indexOf(tile) >= 0) {
                if(point.direction === DOWN) player.on_ground = true
                point.stop()
            }
        })
    }

    handle_horizontal(input, player, loc, sprite_bounds, delta) {
        // increase velocity in the correct direction
        if (input.states.right) player.vx += player.h_accel
        if (input.states.left)  player.vx -= player.h_accel
        //update velocity with acceleration
        player.vx += player.ax * delta / 1000
        // update player location with velocity
        loc.x += player.vx * delta / 1000

        this.queries.map.results.forEach(ent => {
            let map = ent.getComponent(TileMap)
            let layer_name = "Tile Layer 1"

            // moving left
            if(player.vx < 0) {
                // cap the left moving speed
                if (player.vx < -player.max_vx) player.vx = -player.max_vx
                // check the tile to the left
                let bounds = make_bounds(loc.x, loc.y, sprite_bounds.width, sprite_bounds.height)
                {
                    let tx = Math.floor((bounds.x) / map.tilewidth)
                    let ty = Math.floor((bounds.y) / map.tileheight)
                    let tpt = make_point(tx, ty)
                    // this._draw_tile_overlay(tpt, map, 'red')
                    let tile = map.tile_at(layer_name, tpt)
                    // if blocked, stop the player
                    if(map.wall_types.indexOf(tile) >= 0) {
                        player.vx = 0
                        loc.x = ((tx + 1) * map.tilewidth)
                    }
                }
                {
                    let tx = Math.floor((bounds.x) / map.tilewidth)
                    let ty = Math.floor((bounds.y + bounds.height -1) / map.tileheight)
                    let tpt = make_point(tx, ty)
                    // this._draw_tile_overlay(tpt, map, 'red')
                    let tile = map.tile_at(layer_name,tpt)
                    // if blocked, stop the player
                    if(map.wall_types.indexOf(tile) >= 0) {
                        player.vx = 0
                        loc.x = ((tx + 1) * map.tilewidth)
                    }
                }
            }
            // moving right
            if(player.vx > 0) {
                //cap the right moving speed
                if (player.vx > player.max_vx) player.vx = player.max_vx
                //check the tile to the right
                let bounds = make_bounds(loc.x, loc.y, sprite_bounds.width, sprite_bounds.height)
                {
                    let tx = Math.floor((bounds.x + bounds.width) / map.tilewidth)
                    let ty = Math.floor((bounds.y) / map.tileheight)
                    let tpt = make_point(tx, ty)
                    if(player.debug) this._draw_tile_overlay(tpt, map, 'yellow')
                    let tile = map.tile_at(layer_name,tpt)
                    // if blocked, stop the player
                    if(map.wall_types.indexOf(tile) >= 0) {
                        player.vx = 0
                        loc.x = ((tx - 1) * map.tilewidth)
                    }
                }
                {
                    let tx = Math.floor((bounds.x + bounds.width) / map.tilewidth)
                    let ty = Math.floor((bounds.y + bounds.height -1) / map.tileheight)
                    let tpt = make_point(tx, ty)
                    if(player.debug) this._draw_tile_overlay(tpt, map, 'yellow')
                    let tile = map.tile_at(layer_name,tpt)
                    // if blocked, stop the player
                    if(map.wall_types.indexOf(tile) >= 0) {
                        player.vx = 0
                        loc.x = ((tx - 1) * map.tilewidth)
                    }
                }
            }

        })

    }

    calculate_tile_points(map, player, sprite, direction) {
        if (direction === DOWN) {
            let tc1 = make_point(sprite.x, sprite.y+sprite.height)
            let tc2 = make_point(sprite.x + sprite.width -1, sprite.y + sprite.height)
            return [
                {
                    pt:tc1,
                    direction:DOWN,
                    stop:() => {
                        player.vy =0
                        sprite.y = (Math.floor(tc1.y/map.tileheight)*map.tileheight-map.tilewidth)
                    },
                },
                {
                    pt:tc2,
                    direction:DOWN,
                    stop:() => {
                        player.vy =0
                        sprite.y = (Math.floor(tc1.y/map.tileheight)*map.tileheight-map.tilewidth)
                    },
                }
            ]
        }
        if (direction === UP) {
            let tc1 = make_point(sprite.x,sprite.y);
            let tc2 = make_point(sprite.x+sprite.width-1,sprite.y);
            return [
                {
                    pt:tc1,
                    direction:UP,
                    stop:() => {
                        player.vy =0
                        sprite.y = (Math.floor(tc1.y/map.tileheight)*map.tileheight+map.tileheight)
                    },
                },
                {
                    pt:tc2,
                    direction:UP,
                    stop:() => {
                        player.vy =0
                        sprite.y = (Math.floor(tc1.y/map.tileheight)*map.tileheight+map.tilewidth)
                    },
                }
            ]
        }
        // moving left
        if (direction === LEFT) {
            let tpt1 = make_point(sprite.x,sprite.y)
            let tpt2 = make_point(sprite.x,sprite.y + sprite.height -1);
            return [
                {
                    pt:tpt1,
                    direction:LEFT,
                    stop:() => {
                        player.vx = 0
                        sprite.x = Math.floor(tpt1.x/map.tileheight)*map.tileheight + map.tilewidth
                    }
                },
                {
                    pt:tpt2,
                    direction:LEFT,
                    stop:() => {
                        player.vx = 0
                        sprite.x = Math.floor(tpt1.x/map.tileheight)*map.tileheight + map.tilewidth
                    }
                }
            ]
        }

        // moving right
        if (direction === RIGHT) {
            //check the tile to the right
            let tpt1 = make_point(sprite.x + sprite.width,  sprite.y )
            let tpt2 = make_point(sprite.x + sprite.width, sprite.y + sprite.height -1);
            return [
                {
                    pt:tpt1,
                    direction:RIGHT,
                    stop:() => {
                        player.vx = 0
                        sprite.x = Math.floor(tpt1.x/map.tilewidth)*map.tilewidth - map.tileheight
                    }
                },
                {
                    pt:tpt2,
                    direction:RIGHT,
                    stop:() => {
                        player.vx = 0
                        sprite.x = Math.floor(tpt1.x/map.tilewidth)*map.tilewidth - map.tilewidth
                    }
                }
            ]
        }
        return []
    }


    handle_vertical(input, player, loc, sprite_bounds, delta) {
        if (input.states.jump && player.on_ground)          player.vy -= player.jump_y
        //update velocity with acceleration
        player.vy += player.ay * delta / 1000
        // update player location with velocity
        loc.y += player.vy * delta / 1000

        this.queries.map.results.forEach(ent => {
            let map = ent.getComponent(TileMap)
            let layer_name = "Tile Layer 1"
            // if moving down
            if (player.vy > 0) {
                //cap the falling speed
                if (player.vy > player.max_vy) player.vy = player.max_vy
                //check below tile below
                let bounds = make_bounds(loc.x, loc.y, sprite_bounds.width, sprite_bounds.height)
                let tc1 = make_point(
                    Math.floor((bounds.x) / map.tilewidth),
                    Math.floor((bounds.y + bounds.height) / map.tileheight))
                let tc2 = make_point(
                    Math.floor((bounds.x+bounds.width-1) / map.tilewidth),
                    Math.floor((bounds.y + bounds.height) / map.tileheight));
                [tc1,tc2].forEach((tpt)=>{
                    if(player.debug) this._draw_tile_overlay(tpt, map, 'blue')
                    let tile = map.tile_at(layer_name,tpt)
                    // if blocked, stop the player and set ground flag
                    if(map.wall_types.indexOf(tile) >= 0) {
                        player.vy = 0
                        loc.y = ((tpt.y - 1) * map.tilewidth)
                        player.on_ground = true
                    }
                })
            }

            // if moving up
            if (player.vy < 0) {
                player.on_ground = false
                let bounds = make_bounds(loc.x, loc.y, sprite_bounds.width, sprite_bounds.height)
                let tc1 = make_point(
                    Math.floor((bounds.x) / map.tilewidth),
                    Math.floor((bounds.y) / map.tileheight));
                let tc2 = make_point(
                    Math.floor((bounds.x+bounds.width-1) / map.tilewidth),
                    Math.floor((bounds.y) / map.tileheight));
                [tc1,tc2].forEach(tpt => {
                    if(player.debug) this._draw_tile_overlay(tpt, map, 'green')
                    let tile = map.tile_at(layer_name,tpt)
                    // if blocked, stop the player and set ground flag
                    if(map.wall_types.indexOf(tile) >= 0) {
                        player.vy = 0
                        loc.y = ((tpt.y+1) * map.tileheight)
                    }
                })
            }
        })
    }

    _draw_tile_overlay(tpt, map, color) {
        let canvas_ent = this.queries.canvas.results[0]
        let canvas = canvas_ent.getComponent(Canvas)
        let camera = canvas_ent.getComponent(Camera)
        let ctx = canvas.dom.getContext('2d')
        ctx.save()
        ctx.scale(canvas.scale, canvas.scale)
        ctx.translate(
            -camera.x + canvas.width / 2,
            -camera.y + canvas.height / 2
        )
        ctx.globalAlpha = 0.5
        ctx.fillStyle = color
        ctx.fillRect(tpt.x, tpt.y, map.tilewidth, map.tileheight)
        ctx.restore()
    }
}

PlatformerPhysicsSystem.queries = {
    jump: {
        components: [PlayerPhysics],
        listen: {
            added: true,
            removed: true
        }
    },
    player: {
        components: [PlayerPhysics, Sprite, InputState]
    },
    map: {
        components: [TileMap]
    },
    canvas: {
        components: [Canvas]
    }
}
