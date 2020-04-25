// adapted from https://gamedevacademy.org/how-to-create-a-turn-based-rpg-game-in-phaser-3-part-1/

import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill, Camera,
    CameraFollowsSprite,
    Canvas,
    ECSYTwoSystem,
    ImageSprite,
    Sprite,
    SpriteSystem,
    startWorld
} from './ecsytwo.js'
import {load_image_from_url, SpriteSheet} from './image.js'
import {load_tilemap, TileMap, TileMapSystem} from './tiles.js'
import {InputState, KeyboardState, KeyboardSystem} from './keyboard.js'

let world = new World()

world.registerSystem(ECSYTwoSystem)
world.registerSystem(SpriteSystem)
let game = world.createEntity()
    .addComponent(Canvas, { width: 320, height: 240, pixelMode:true})
    .addComponent(Camera)
    .addComponent(BackgroundFill, { color: 'green'})

// game.addComponent(ArcadePhysics, { gravity: 0})
// game.addComponent(Camera)


// let tiles = load_spritesheet_from_url('rpg/assets/map/spritesheet.png')
// let map =  load_tilemap('rpg/assets/map/map.json')
// let player_sheet = load_spritesheet_from_url('rpg/assets/RPG_assets.png', { tileWidth: 16, tileHeight: 16})

// let map = world.createEntity()
//     .addComponent(TileMap, { src: 'rpg/assets/map/map.json'})

load_image_from_url("rpg/assets/map/spritesheet.png").then(img => {
    let sheet = new SpriteSheet(img,16, 16)
    load_tilemap('rpg/assets/map/map.json',sheet).then(data=>{
        console.log("loaded tilemap data",data)
        let view = world.createEntity()
            .addComponent(TileMap, data)
        console.log("added a tilemap")
    })
})

world.registerSystem(TileMapSystem)

class ControlTarget extends Component {
    constructor() {
        super();
        this.velocity = 1
    }
}

load_image_from_url('rpg/assets/RPG_assets.png').then(img => {
    let sheet = new SpriteSheet(img, 16, 16)
    let player = world.createEntity()
        .addComponent(Sprite, { x: 0, y: 0, width: 16, height:16 })
        .addComponent(ImageSprite, { image: sheet.sprite_to_image(0,0)})
        .addComponent(InputState)
        .addComponent(KeyboardState)
        .addComponent(ControlTarget, { velocity: 3})
})

export class OverheadControl extends System {
    execute(delta, time) {
        this.queries.input.results.forEach(ent => {
            let input = ent.getComponent(InputState)
            this.queries.player.results.forEach(ent => {
                let target = ent.getComponent(ControlTarget)
                let sprite = ent.getComponent(Sprite)
                if(input.states.left)  sprite.x -= target.velocity
                if(input.states.right) sprite.x += target.velocity
                if(input.states.up)    sprite.y -= target.velocity
                if(input.states.down)  sprite.y += target.velocity
            })
        })
    }
}
OverheadControl.queries = {
    input: {
        components:[InputState]
    },
    player: {
        components: [ControlTarget, Sprite]
    }
}
world.registerSystem(KeyboardSystem)
world.registerSystem(OverheadControl)

//     .addComponent(AniamtedSpriteImage, { frames:player_sheet.frames() })
//     .addComponent(ArcadePlayerSprite, { velocity: 80})
//     .addComponent(CameraFollowsSprite)
//     .addComponent(CollidesWith, { target: map})


// make random battle spots
function make_battle_zones() {
    for (let i = 0; i < 30; i++) {
        let x = (Math.random() * 320)
        let y = (Math.random() * 240)
        let zone = world.createEntity()
            .addComponent(Sprite, {x: x, y: y, width: 16, height: 16})
            .addComponent(BattleZone)
    }
}

const onBattleMeet = (player, zone) => {
    zone.getComponent(Sprite).x = Math.random()*320
    zone.getComponent(Sprite).y = Math.random()*240
    game.addComponent(CameraShake, { duration: 0.3, size: 10 })
}


startWorld(world)
