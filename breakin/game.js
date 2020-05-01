import {System, World} from "../node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill,
    Camera,
    CameraFollowsSprite,
    Canvas,
    ECSYTwoSystem, ImageSprite, InputState, Sprite,
    SpriteSystem,
    startWorld
} from '../src/ecsy-two.js'
import {FullscreenButton} from '../src/fullscreen.js'
import {load_tilemap_from_url, TileMap, TileMapSystem} from '../tiles.js'
import {KeyboardState, KeyboardSystem} from '../src/keyboard.js'
import {make_point} from '../utils.js'
import {Dialog, DialogSystem, WaitForInput} from '../dialogs.js'
import {OverheadControls, OverheadControlsPlayer} from './rpg.js'
import {start_bricks, stop_bricks, WonBricks} from './bricks.js'

let TILE_SIZE = 16
let world = new World()

const LEVELS = {}
let GLOBALS = {
    bricks: {},
    rpg: {},
    view:null,
}

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
class StartBricksAction {

}
class ActionSystem extends System {
    execute(delta, time) {
        this.queries.actions.added.forEach(ent => {
            this.world.getSystem(OverheadControls).enabled = false
            let action = ent.getComponent(ShowSignAction)
            console.log("showing dialog with text", action.text)
            GLOBALS.view.addComponent(Dialog, {
                text:action.text,
                tilemap:LEVELS.dialog.data,
                text_offset: make_point(50,50),
                text_color: 'green',
            })
            GLOBALS.view.addComponent(WaitForInput, {onDone:()=>{
                    GLOBALS.view.removeComponent(Dialog)
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
        this.queries.start_bricks.added.forEach(ent => {
            switch_to_bricks(GLOBALS,this.world)
        })
        this.queries.won_bricks.added.forEach(ent => {
            ent.removeAllComponents()
            switch_to_rpg(GLOBALS,this.world)
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
    start_bricks: {
        components: [StartBricksAction],
        listen: { added:true, removed: true},
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
    },
    won_bricks: {
        components: [WonBricks],
        listen: { added:true, removed: true},
    }
}
world.registerSystem(ActionSystem)
world.registerSystem(ECSYTwoSystem)
world.registerSystem(TileMapSystem)
world.registerSystem(DialogSystem)
world.registerSystem(SpriteSystem)
world.registerSystem(KeyboardSystem)
world.registerSystem(OverheadControls)

GLOBALS.view = world.createEntity()
    .addComponent(Canvas, {
        scale: 3,
        width:TILE_SIZE*16,
        height: TILE_SIZE*14,
        pixelMode:true})
    .addComponent(FullscreenButton)
    .addComponent(InputState)


function start_rpg(GLOBALS, world) {
    GLOBALS.view.addComponent(Camera, { x:1*TILE_SIZE, y:0*TILE_SIZE})
        .addComponent(BackgroundFill, {color: 'rgb(240,255,240)'})
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

    load_tilemap_from_url("./maps/arcade.json").then(level => {
        console.log("level info is",level)
        GLOBALS.view.addComponent(TileMap, level)
    })

    if(!GLOBALS.player) {
        GLOBALS.player = world.createEntity()
            .addComponent(Sprite, {x: 100, y: 100, width: 16, height: 16})
            .addComponent(OverheadControlsPlayer, {
                ivx: 100, ivy: 100,
                debug: false,
                blocking_layer_name: "floor",
                blocking_object_types: ['sign'],
                on_sign: (obj, text) => {
                    console.log("showing a sign", text, obj)
                    if (obj.name === 'arcade blip') {
                        console.log('need to start the arcade')
                        GLOBALS.view.addComponent(StartBricksAction, {view: GLOBALS.view})
                    } else {
                        GLOBALS.view.addComponent(ShowSignAction, {text: text})
                    }
                }
            })
            .addComponent(ImageSprite, {src: "images/akira.png"})
    }

    GLOBALS.view.addComponent(CameraFollowsSprite, { target: GLOBALS.player})
}

function stop_rpg(globals) {
    globals.view.removeComponent(Camera)
    globals.view.removeComponent(BackgroundFill)
    globals.view.removeComponent(KeyboardState)
    globals.view.removeComponent(CameraFollowsSprite)
    globals.player.removeAllComponents()
}


function switch_to_bricks(globals, world) {
    stop_rpg(globals, world)
    start_bricks(globals,world)
}

function switch_to_rpg(globals, world) {
    stop_bricks(globals, world)
    start_rpg(globals, world)
}


start_rpg(GLOBALS,world)
// start_bricks(GLOBALS,world)


startWorld(world)
