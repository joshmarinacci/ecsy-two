import {Component, System, World} from "../node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill,
    Camera,
    CameraFollowsSprite,
    Canvas,
    ECSYTwoSystem, FilledSprite, ImageSprite, Sprite,
    SpriteSystem,
    startWorld
} from '../ecsytwo.js'
import {FullscreenButton} from '../fullscreen.js'
import {load_tilemap_from_url, TileMap, TileMapSystem} from '../tiles.js'
import {InputState, KeyboardState, KeyboardSystem} from '../keyboard.js'
import {make_point} from '../utils.js'
import {Dialog, DialogSystem, WaitForInput} from '../dialogs.js'

let TILE_SIZE = 16
let world = new World()

const LEVELS = {}

load_tilemap_from_url("maps/dialog.json").then((data)=> {
    console.log("loaded dialog")
    console.log('we have the tile-map data',data)
    LEVELS.dialog = {
        data:data,
        start: {x:0, y:0}
    }
})


class ShowSignAction {
    constructor() {
        this.text = "some text"
    }
}

class ActionSystem extends System {
    execute(delta, time) {
        this.queries.actions.added.forEach(ent => {
            this.world.getSystem(OverheadControls).enabled = false
            let action = ent.getComponent(ShowSignAction)
            console.log("showing dialog with text", action.text)
            view.addComponent(Dialog, { text:action.text, tilemap:LEVELS.dialog.data, text_offset: make_point(50,50)})
            view.addComponent(WaitForInput, {onDone:()=>{
                    view.removeComponent(Dialog)
                    ent.removeComponent(ShowSignAction)
                    this.world.getSystem(OverheadControls).enabled = true
                }})
        })
        this.queries.input_waiters.added.forEach(ent => {
            let waiter = ent.getComponent(WaitForInput)
            waiter.start_time = time
            waiter.timeout = 0.5*1000
        })
        this.queries.input_waiters.results.forEach(waiting_ent => {
            let waiter = waiting_ent.getComponent(WaitForInput)
            if(time - waiter.start_time > waiter.timeout) waiter.started = true
            if(waiter.started) {
                this.queries.input.results.forEach(ent => {
                    let input = ent.getComponent(InputState)
                    if (input.anyReleased()) {
                        if(waiter.onDone) waiter.onDone()
                        waiting_ent.removeComponent(WaitForInput)
                    }
                })
            }
        })
    }
}
ActionSystem.queries = {
    actions: {
        components:[ShowSignAction],
        listen: {
            added:true,
            removed:true,
        }
    },
    input_waiters: {
        components: [WaitForInput],
        listen: {
            added:true,
            removed:true,
        }
    },
    input: {
        components: [InputState]
    }
}
world.registerSystem(ActionSystem)

class OverheadControlsPlayer {
    constructor() {
        this.ivx = 10
        this.ivy = 10
        this.vx = 0
        this.vy = 0
        this.debug = true
        this.blocking_layer_name = "layer1"
        this.blocking_object_types = []
    }
}

function rect_contains_point(rect, pt) {
    if(pt.x <= rect.x) return false
    if(pt.x > rect.x + rect.width) return false
    if(pt.y <= rect.y) return false
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
                if (input.states.right)  player.vx =  player.ivx
                if (input.states.left)   player.vx = -player.ivx
                player.vy = 0
                if (input.states.down)   player.vy =  player.ivy
                if (input.states.up)     player.vy = -player.ivy

                sprite.x += player.vx * delta / 1000
                sprite.y += player.vy * delta / 1000
                this.queries.map.results.forEach(ent => {
                    let map = ent.getComponent(TileMap)
                    //moving down
                    let points = this.calculate_tile_points(map,player,sprite)
                    if(!points) return
                    // if moving up

                    points.forEach(point=>{
                        if(player.debug) this._draw_tile_overlay(point.pt, map, 'blue')
                        map.layers.forEach(layer => {
                            if(layer.type === 'objectgroup') {
                                layer.objects.forEach(obj=>{
                                    if(rect_contains_point(obj,point.pt) && player.blocking_object_types.indexOf(obj.type) >= 0) {
                                        point.stop()
                                        if(obj.type === 'sign') {
                                            if(obj.properties) {
                                                let text = obj.properties.find(p => p.name === 'text').value
                                                view.addComponent(ShowSignAction, {text: text})
                                            } else {
                                                console.warn("sign object is missing properties")
                                            }
                                        }
                                    }
                                })
                            }
                        })

                        // if blocked, stop the player and set ground flag
                        let tile = map.tile_at(player.blocking_layer_name,point.pt)
                        if(map.wall_types.indexOf(tile) >= 0) {
                            point.stop()
                        }
                    })
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
        ctx.fillRect(
            Math.floor(tpt.x/map.tileSize)*map.tileSize,
            Math.floor(tpt.y/map.tileSize)*map.tileSize,
            map.tileSize, map.tileSize)
        ctx.restore()
    }

    calculate_tile_points(map, player, sprite) {
        if (player.vy > 0) {
            let tc1 = make_point(sprite.x, sprite.y+sprite.height)
            let tc2 = make_point(sprite.x + sprite.width -1, sprite.y + sprite.height)
            return [
                {
                    pt:tc1,
                    stop:() => {
                        player.vy =0
                        sprite.y = (Math.floor(tc1.y/map.tileSize)*map.tileSize-map.tileSize)
                    },
                },
                {
                    pt:tc2,
                    stop:() => {
                        player.vy =0
                        sprite.y = (Math.floor(tc1.y/map.tileSize)*map.tileSize-map.tileSize)
                    },
                }
            ]
        }
        if (player.vy < 0) {
            let tc1 = make_point(sprite.x,sprite.y);
            let tc2 = make_point(sprite.x+sprite.width-1,sprite.y);
            return [
                {
                    pt:tc1,
                    stop:() => {
                        player.vy =0
                        sprite.y = (Math.floor(tc1.y/map.tileSize)*map.tileSize+map.tileSize)
                    },
                },
                {
                    pt:tc2,
                    stop:() => {
                        player.vy =0
                        sprite.y = (Math.floor(tc1.y/map.tileSize)*map.tileSize+map.tileSize)
                    },
                }
            ]
        }
        // moving left
        if(player.vx < 0) {
                let tpt1 = make_point(sprite.x,sprite.y)
                let tpt2 = make_point(sprite.x,sprite.y + sprite.height -1);
                return [
                    {
                        pt:tpt1,
                        stop:() => {
                            player.vx = 0
                            sprite.x = Math.floor(tpt1.x/map.tileSize)*map.tileSize + map.tileSize
                        }
                    },
                    {
                        pt:tpt2,
                        stop:() => {
                            player.vx = 0
                            sprite.x = Math.floor(tpt1.x/map.tileSize)*map.tileSize + map.tileSize
                        }
                    }
                ]
        }

        // moving right
        if(player.vx > 0) {
            //check the tile to the right
            let tpt1 = make_point(sprite.x + sprite.width,  sprite.y )
            let tpt2 = make_point(sprite.x + sprite.width, sprite.y + sprite.height -1);
            return [
                {
                    pt:tpt1,
                    stop:() => {
                        player.vx = 0
                        sprite.x = Math.floor(tpt1.x/map.tileSize)*map.tileSize - map.tileSize
                    }
                },
                {
                    pt:tpt2,
                    stop:() => {
                        player.vx = 0
                        sprite.x = Math.floor(tpt1.x/map.tileSize)*map.tileSize - map.tileSize
                    }
                }
            ]
        }
    }
}
OverheadControls.queries = {
    input:  { components: [InputState] },
    player: { components: [OverheadControlsPlayer, Sprite] },
    map:    { components: [TileMap] },
    canvas: { components: [Canvas] }
}
world.registerSystem(ECSYTwoSystem)
world.registerSystem(DialogSystem)
world.registerSystem(TileMapSystem)
world.registerSystem(SpriteSystem)
world.registerSystem(KeyboardSystem)
world.registerSystem(OverheadControls)

let player = world.createEntity()
    .addComponent(Sprite, { x: 100, y: 100, width: 16, height: 16})
    // .addComponent(FilledSprite, { color: 'red'})
    .addComponent(OverheadControlsPlayer, {
        ivx: 100, ivy: 100,
        debug:false, blocking_layer_name: "ground", blocking_object_types: ['sign']})
    .addComponent(ImageSprite, { src: "images/cat.png"})

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



load_tilemap_from_url("./maps/level1.json").then(level => {
    console.log("level info is",level)
    view.addComponent(TileMap, level)
})

startWorld(world)
