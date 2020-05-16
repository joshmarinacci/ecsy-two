import {ECSYTwoSystem, startWorld} from './ecsy-two.js'
import {SpriteSystem} from './image.js'
import {KeyboardSystem} from './keyboard.js'
import {LayerRenderingSystem} from './layer.js'
import {MouseInputSystem} from './mouse.js'

//the core that must be there
export {ECSYTwoSystem, Canvas, Camera, CameraFollowsSprite, BackgroundFill, Sprite, InputState, FilledSprite, startWorld, DebugOutline}  from "./ecsy-two.js"
// images, spritesheets, animated images
export {ImageSprite, SpriteSystem, SpriteSheet, load_image_from_url, AnimatedSprite} from "./image.js"
//keyboard
export {KeyboardSystem, KeyboardState} from "./keyboard.js"
//mouse
export {MouseInputSystem, MouseState} from "./mouse.js"
//a utils function
export {make_point} from "./utils.js"
//layers
export {Layer, LayerParent, LayerRenderingSystem, DrawFilledRect, DrawImage, DrawStrokedRect} from "./layer.js"


//full screen support
export {FullscreenMode, FullscreenButton, FullscreenSystem} from "./fullscreen.js"
//audio
export {AudioSystem, SoundEffect, PlaySoundEffect, BackgroundMusic, AudioEnabled} from "./audio.js"
//gamepad
export {GamepadSystem, SimpleGamepadState} from "./gamepad.js"

export {load_tilemap_from_url, TileMap, TileMapSystem} from "./extensions/tiles.js"
export {Dialog, DialogSystem, WaitForInput} from "./extensions/dialogs.js"
export {ParticleSystem, Emitter} from "./extensions/particles.js"

const ecsytwo = {
    initialize : function (world) {
        world.registerSystem(ECSYTwoSystem)
        world.registerSystem(SpriteSystem)
        world.registerSystem(KeyboardSystem)
        world.registerSystem(MouseInputSystem)
        world.registerSystem(LayerRenderingSystem)
    },
    start: startWorld
}

export default ecsytwo

