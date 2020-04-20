import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {AnimatedSprite, Camera, Canvas, SpriteBounds, SpriteLocation} from './ecsytwo.js'
import {make_bounds, TileMap} from './tiles.js'
import {KeyboardState} from './keyboard.js'

export class Jumping extends Component {

}

export class PlayerPhysics extends Component {
    constructor() {
        super()
        this.vx = 0
        this.vy = 0
        this.ax = 0
        this.ay = 0
        this.max_vx = 10
        this.max_vy = 10
        this.jump_y = 10
        this.on_ground = false
    }

}


function make_point(tx, ty) {
    return {
        x: tx,
        y: ty
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
        this.queries.player.results.forEach(player_ent => {
            let kb = player_ent.getComponent(KeyboardState)
            let player = player_ent.getComponent(PlayerPhysics)
            let loc = player_ent.getComponent(SpriteLocation)
            let sprite_bounds = player_ent.getComponent(SpriteBounds)


            // update velocity with friction
            if(player.on_ground) {
                player.vx *= 0.99
            }
            // increase velocity in the correct direction
            if (kb.isPressed('ArrowRight')) player.vx += 1
            if (kb.isPressed('ArrowLeft'))  player.vx -= 1
            if (kb.isPressed(' ') && player.on_ground)          player.vy -= player.jump_y
            //flip the player sprite to face the correct direction
            if (kb.isPressed('ArrowRight')) player_ent.getMutableComponent(AnimatedSprite).flipY = false
            if (kb.isPressed('ArrowLeft'))  player_ent.getMutableComponent(AnimatedSprite).flipY = true


            //update velocity with acceleration
            player.vx += player.ax * delta / 1000
            player.vy += player.ay * delta / 1000



            // update player location with velocity
            loc.y += player.vy * delta / 1000
            loc.x += player.vx * delta / 1000


            this.queries.map.results.forEach(ent => {
                let map = ent.getComponent(TileMap)

                // moving left
                if(player.vx < 0) {
                    // cap the left moving speed
                    if (player.vx < -player.max_vx) player.vx = -player.max_vx
                    // check the tile to the left
                    let bounds = make_bounds(loc.x, loc.y, sprite_bounds.width, sprite_bounds.height)
                    {
                        let tx = Math.floor((bounds.x) / map.tileSize)
                        let ty = Math.floor((bounds.y) / map.tileSize)
                        let tpt = make_point(tx, ty)
                        this._draw_tile_overlay(tpt, map, 'red')
                        let tile = map.tile_at(tpt)
                        // if blocked, stop the player
                        if (tile === 3) {
                            player.vx = 0
                            loc.x = ((tx + 1) * map.tileSize)
                        }
                    }
                    {
                        let tx = Math.floor((bounds.x) / map.tileSize)
                        let ty = Math.floor((bounds.y + bounds.height -1) / map.tileSize)
                        let tpt = make_point(tx, ty)
                        this._draw_tile_overlay(tpt, map, 'red')
                        let tile = map.tile_at(tpt)
                        // if blocked, stop the player
                        if (tile === 3) {
                            player.vx = 0
                            loc.x = ((tx + 1) * map.tileSize)
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
                        let tx = Math.floor((bounds.x + bounds.width) / map.tileSize)
                        let ty = Math.floor((bounds.y) / map.tileSize)
                        let tpt = make_point(tx, ty)
                        this._draw_tile_overlay(tpt, map, 'yellow')
                        let tile = map.tile_at(tpt)
                        // if blocked, stop the player
                        if (tile === 3) {
                            player.vx = 0
                            loc.x = ((tx - 1) * map.tileSize)
                        }
                    }
                    {
                        let tx = Math.floor((bounds.x + bounds.width) / map.tileSize)
                        let ty = Math.floor((bounds.y + bounds.height -1) / map.tileSize)
                        let tpt = make_point(tx, ty)
                        this._draw_tile_overlay(tpt, map, 'yellow')
                        let tile = map.tile_at(tpt)
                        // if blocked, stop the player
                        if (tile === 3) {
                            player.vx = 0
                            loc.x = ((tx - 1) * map.tileSize)
                        }
                    }
                }

                // if moving down
                if (player.vy > 0) {
                    //cap the falling speed
                    if (player.vy > player.max_vy) player.vy = player.max_vy
                    //check below tile below
                    let bounds = make_bounds(loc.x, loc.y, sprite_bounds.width, sprite_bounds.height)
                    let tc1 = make_point(
                        Math.floor((bounds.x) / map.tileSize),
                        Math.floor((bounds.y + bounds.height) / map.tileSize)
                    )
                    let tc2 = make_point(
                        Math.floor((bounds.x+bounds.width-1) / map.tileSize),
                        Math.floor((bounds.y + bounds.height) / map.tileSize)
                    );
                    [tc1,tc2].forEach((tpt)=>{
                        this._draw_tile_overlay(tpt, map, 'blue')
                        let tile = map.tile_at(tpt)
                        // if blocked, stop the player and set ground flag
                        if (tile === 3) {
                            player.vy = 0
                            loc.y = ((tpt.y - 1) * map.tileSize)
                            player.on_ground = true
                        }
                    })
                }

                // if moving up
                if (player.vy < 0) {
                    player.on_ground = false
                    let bounds = make_bounds(loc.x, loc.y, sprite_bounds.width, sprite_bounds.height)
                    let ty = Math.floor((bounds.y) / map.tileSize)
                    let tx = Math.floor((bounds.x) / map.tileSize)
                    let tpt = make_point(tx, ty)
                    this._draw_tile_overlay(tpt, map, 'green')
                    let tile = map.tile_at(tpt)
                    // if blocked, stop the player and set ground flag
                    if (tile === 3) {
                        player.vy = 0
                        loc.y = ((ty+1) * map.tileSize)
                    }
                }
            })
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
        ctx.fillRect(tpt.x * map.tileSize, tpt.y * map.tileSize, 8, 8)
        ctx.restore()
    }
}

PlatformerPhysicsSystem.queries = {
    jump: {
        components: [Jumping, PlayerPhysics],
        listen: {
            added: true,
            removed: true
        }
    },
    player: {
        components: [PlayerPhysics, SpriteLocation, KeyboardState]
    },
    map: {
        components: [TileMap]
    },
    canvas: {
        components: [Canvas]
    }
}
