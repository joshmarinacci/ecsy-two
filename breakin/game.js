import {Component, System, World} from "../node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill,
    Camera,
    CameraFollowsSprite,
    Canvas,
    ECSYTwoSystem, FilledSprite, Sprite,
    SpriteSystem,
    startWorld
} from '../ecsytwo.js'
import {FullscreenButton} from '../fullscreen.js'
import {load_image_from_url, SpriteSheet} from '../image.js'
import {load_tilemap, make_bounds, TileMap, TileMapSystem} from '../tiles.js'
import {InputState, KeyboardState, KeyboardSystem} from '../keyboard.js'
import {make_point, PlayerPhysics} from '../platformer_controls.js'

let TILE_SIZE = 16
let world = new World()
world.registerSystem(ECSYTwoSystem)
world.registerSystem(SpriteSystem)
world.registerSystem(TileMapSystem)
world.registerSystem(KeyboardSystem)

class OverheadControlsPlayer {
    constructor() {
        this.vx = 0
        this.vy = 0
        this.debug = true
        this.blocking_layer_name = "layer1"
        this.blocking_object_types = []
    }
}
let player = world.createEntity()
    .addComponent(Sprite, { x: 100, y: 100, width: 16, height: 16})
    .addComponent(FilledSprite, { color: 'red'})
    .addComponent(OverheadControlsPlayer, { vx: 0, vy: 0, debug:true, blocking_layer_name: "ground", blocking_object_types: ['sign']})

function rect_contains_point(rect, pt) {
    if(pt.x < rect.x) return false
    if(pt.x > rect.x + rect.width) return false
    if(pt.y < rect.y) return false
    if(pt.y > rect.y + rect.height) return false
    return true
}

class OverheadControls extends System {
    execute(delta, time) {
        this.queries.input.results.forEach(input_ent => {
            let input = input_ent.getComponent(InputState)
            this.queries.player.results.forEach(player_ent => {
                let player = player_ent.getComponent(OverheadControlsPlayer)
                let sprite = player_ent.getComponent(Sprite)

                player.vx = 0
                if (input.states.right)  player.vx =  50
                if (input.states.left)   player.vx = -50
                player.vy = 0
                if (input.states.down)   player.vy =  50
                if (input.states.up)     player.vy = -50

                sprite.x += player.vx * delta / 1000
                sprite.y += player.vy * delta / 1000
                this.queries.map.results.forEach(ent => {
                    let map = ent.getComponent(TileMap)
                    //moving down
                    if (player.vy > 0) {
                        let tc1 = make_point(
                            Math.floor((sprite.x) / map.tileSize),
                            Math.floor((sprite.y + sprite.height) / map.tileSize))
                        let tc2 = make_point(
                            Math.floor((sprite.x+sprite.width-1) / map.tileSize),
                            Math.floor((sprite.y + sprite.height) / map.tileSize));
                        [tc1,tc2].forEach((tpt)=>{
                            if(player.debug) this._draw_tile_overlay(tpt, map, 'blue')

                            map.layers.forEach(layer => {
                                if(layer.type === 'objectgroup') {
                                    layer.objects.forEach(obj=>{
                                        let pt = make_point(tpt.x*map.tileSize, tpt.y*map.tileSize)
                                        if(rect_contains_point(obj,pt) && player.blocking_object_types.indexOf(obj.type) >= 0) {
                                            player.vy = 0
                                            sprite.y = (tpt.y -1) * map.tileSize
                                        }
                                    })
                                }
                            })

                            let tile = map.tile_at(player.blocking_layer_name,tpt)
                            // if blocked, stop the player and set ground flag
                            if(map.wall_types.indexOf(tile) >= 0) {
                                player.vy = 0
                                sprite.y = ((tpt.y - 1) * map.tileSize)
                            }
                        })
                    }
                    // if moving up
                    if (player.vy < 0) {
                        let tc1 = make_point(
                            Math.floor((sprite.x) / map.tileSize),
                            Math.floor((sprite.y) / map.tileSize));
                        let tc2 = make_point(
                            Math.floor((sprite.x+sprite.width-1) / map.tileSize),
                            Math.floor((sprite.y) / map.tileSize));
                        [tc1,tc2].forEach(tpt => {
                            if(player.debug) this._draw_tile_overlay(tpt, map, 'green')
                            map.layers.forEach(layer => {
                                let tile = map.tile_at(player.blocking_layer_name,tpt)
                                // if blocked, stop the player and set ground flag
                                if(map.wall_types.indexOf(tile) >= 0) {
                                    player.vy = 0
                                    sprite.y = ((tpt.y+1) * map.tileSize)
                                }
                            })
                        })
                    }
                    // moving left
                    if(player.vx < 0) {
                        // check the tile to the left
                        {
                            let tpt1 = make_point(
                                Math.floor((sprite.x) / map.tileSize),
                                Math.floor((sprite.y) / map.tileSize),
                            )
                            let tpt2 = make_point(
                                Math.floor((sprite.x) / map.tileSize),
                                Math.floor((sprite.y + sprite.height -1) / map.tileSize),
                            );
                            [tpt1,tpt2].forEach(tpt => {
                                if(player.debug) this._draw_tile_overlay(tpt, map, 'yellow')
                                let tile = map.tile_at(player.blocking_layer_name,tpt)
                                if(map.wall_types.indexOf(tile) >= 0) {
                                    player.vx = 0
                                    sprite.x = ((tpt.x + 1) * map.tileSize)
                                }
                            })
                        }
                    }
                    // moving right
                    if(player.vx > 0) {
                        //check the tile to the right
                        {
                            let tpt1 = make_point(
                                Math.floor((sprite.x + sprite.width) / map.tileSize),
                                Math.floor((sprite.y) / map.tileSize),
                            )
                            let tpt2 = make_point(
                                Math.floor((sprite.x + sprite.width) / map.tileSize),
                                Math.floor((sprite.y + sprite.height -1) / map.tileSize),
                            );
                            [tpt1,tpt2].forEach(tpt => {
                                if(player.debug) this._draw_tile_overlay(tpt, map, 'yellow')
                                let tile = map.tile_at(player.blocking_layer_name,tpt)
                                if(map.wall_types.indexOf(tile) >= 0) {
                                    player.vx = 0
                                    sprite.x = ((tpt.x - 1) * map.tileSize)
                                }
                            })
                        }
                    }

                })

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
        ctx.fillRect(tpt.x * map.tileSize, tpt.y * map.tileSize, map.tileSize, map.tileSize)
        ctx.restore()
    }
}
OverheadControls.queries = {
    input:  { components: [InputState] },
    player: { components: [OverheadControlsPlayer, Sprite] },
    map:    { components: [TileMap] },
    canvas: { components: [Canvas] }
}
world.registerSystem(OverheadControls)

let view = world.createEntity()
    .addComponent(Canvas, { scale: 3, width:TILE_SIZE*16, height: TILE_SIZE*13, pixelMode:true})
    .addComponent(BackgroundFill, {color: 'rgb(240,255,240)'})
    .addComponent(Camera, { x:1*TILE_SIZE, y:0*TILE_SIZE})
    .addComponent(CameraFollowsSprite, { target: player})
    .addComponent(FullscreenButton)
    .addComponent(InputState)
    .addComponent(KeyboardState, {
        mapping: {
            'w':'up',
            'a':'left',
            's':'down',
            'd':'right',
            ' ':'talk',
            'ArrowLeft':'left',
            'ArrowRight':'right',
            'ArrowUp':'up',
            'ArrowDown':'down',
        }
    })


function load_tilemap_from_url(url) {
    url = new URL(url, document.baseURI)
    return fetch(url).then(res=>res.json()).then(data => {
        let tile_index = []
        let blocking = []
        return Promise.all(data.tilesets.map(tileset => {
            let imgurl = new URL(tileset.image, url)
            return load_image_from_url(imgurl).then(img => {
                let sheet = new SpriteSheet(img, tileset.tilewidth, tileset.tileheight)
                let start = tileset.firstgid
                for (let i = 0; i < tileset.tilecount; i++) {
                    tile_index[start] = sheet.sprite_to_image(
                        i % tileset.columns,
                        Math.floor(i / tileset.columns))
                    start++
                }
                if (tileset.tiles) {
                    tileset.tiles.forEach(tile => {
                        console.log("looking at tile info",tile)
                        if (tile.type === 'floor') blocking.push(tile.id + tileset.firstgid)
                        if (tile.type === 'wall') blocking.push(tile.id  + tileset.firstgid)
                        if (tile.type === 'block') blocking.push(tile.id  + tileset.firstgid)
                    })
                }
                console.log("tileindex",blocking.slice())
            })
        })).then(()=>{
            console.log("finishing up", blocking.slice())
            data.index = tile_index
            data.wall_types = blocking
            return data
        })
    })
}

load_tilemap_from_url("./maps/level1.json").then(level => {
    view.addComponent(TileMap, level)
})

startWorld(world)
