import {Component, System, World} from "../node_modules/ecsy/build/ecsy.module.js"
import {Camera, CameraFollowsSprite, Canvas, DebugOutline, FilledSprite, Sprite} from './ecsy-two.js'
import {DrawFilledRect, DrawImage, DrawStrokedRect, LayerParent} from './layer.js'

export class ImageSprite extends Component {
    constructor() {
        super();
        this.image = null
        this.src = null
    }
}

export class AnimatedSprite extends Component {
    constructor() {
        super();
        this.image = null
        this.frame_count = 1
        this.current_frame = 0
        this.width = -1
        this.height = -1
        this.frame_duration = 250
        this.last_frame_time = 0
        this.src = null
        this.frame_width = 16
    }
}
export class SpriteSystem extends System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(canvas_ent => {
            let canvas = canvas_ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            ctx.imageSmoothingEnabled = false
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            if(canvas_ent.hasComponent(Camera)) {
                let camera = canvas_ent.getComponent(Camera)
                if (camera.centered) {
                    ctx.translate(
                        -camera.x + canvas.width / 2,
                        -camera.y + canvas.height / 2)
                }
            }

            //load sprites with src properties
            this.queries.sprites.added.forEach(ent =>{
                let sprite = ent.getComponent(ImageSprite)
                if(!sprite.image && sprite.src) {
                    sprite.image = new Image()
                    sprite.image.src = sprite.src
                }
            })
            // load animated sprites with src properties
            this.queries.animated_sprites.added.forEach(ent =>{
                let sprite = ent.getComponent(AnimatedSprite)
                if(!sprite.frames && sprite.src) {
                    sprite.image = new Image()
                    sprite.image.src = sprite.src
                }
            })

            // draw colored sprites
            this.queries.filled_sprites.results.forEach(ent => {
                let sprite = ent.getComponent(Sprite)
                let color = ent.getComponent(FilledSprite)
                sprite.draw_object = new DrawFilledRect(sprite,color.color)
            })
            // draw image sprites
            this.queries.sprites.results.forEach(ent => {
                let sprite = ent.getComponent(Sprite)
                /*
                if(sprite.fixed && canvas_ent.hasComponent(Camera)) {
                    let camera = canvas_ent.getComponent(Camera)
                    ctx.translate(
                        +camera.x - canvas.width/2,
                        +camera.y - canvas.height/2)
                }
                 */
                let image_sprite = ent.getComponent(ImageSprite)
                sprite.draw_object = new DrawImage(sprite,image_sprite)
            })

            // draw animated images sprites
            this.queries.animated_sprites.results.forEach(ent => {
                let sprite = ent.getMutableComponent(AnimatedSprite)
                let diff = time - sprite.last_frame_time
                if(diff > sprite.frame_duration) {
                    sprite.current_frame = (sprite.current_frame + 1) % sprite.frame_count
                    sprite.last_frame_time = time
                }
                let loc = ent.getComponent(Sprite)
                ctx.save()
                ctx.translate(loc.x, loc.y)
                if(sprite.flipY) {
                    ctx.scale(-1,1)
                    ctx.translate(-sprite.width,0)
                }
                ctx.drawImage(sprite.image,
                    sprite.width*sprite.current_frame,0,sprite.width, sprite.height,
                    0,0,sprite.width, sprite.height
                )
                ctx.restore()
            })

            //draw debug sprites
            this.queries.debug_sprites.results.forEach(ent => {
                let sprite = ent.getComponent(Sprite)
                let debug = ent.getComponent(DebugOutline)
                sprite.draw_object = new DrawStrokedRect(sprite,debug.color)
                ctx.strokeStyle = debug.color
                ctx.strokeRect(sprite.x, sprite.y, sprite.width, sprite.height)
            })
            ctx.restore()
        })

        this.queries.camera_move.results.forEach(ent => {
            let cfs = ent.getComponent(CameraFollowsSprite)
            if(!cfs.target) return
            let loc = cfs.target.getComponent(Sprite)
            if(!loc) return
            this.queries.canvas.results.forEach(ent => {
                if(ent.hasComponent(Camera)) {
                    let camera = ent.getMutableComponent(Camera)
                    camera.x = loc.x
                    camera.y = loc.y
                }
            })
        })
    }
}

SpriteSystem.queries = {
    canvas: {
        components: [Canvas],
    },
    sprites: {
        components: [Sprite, ImageSprite],
        listen: {
            added:true,
            removed:true,
        }
    },
    camera_move: {
        components: [CameraFollowsSprite]
    },
    animated_sprites: {
        components: [Sprite, AnimatedSprite],
        listen: {
            added:true,
            removed:true,
        }
    },
    filled_sprites: {
        components: [Sprite, FilledSprite]
    },
    debug_sprites: {
        components: [Sprite, DebugOutline]
    }
}


export class SpriteSheet {
    constructor(img,tw,th) {
        this.image = img
        this.tw = tw
        this.th = th
    }

    sprite_to_image(x, y) {
        let canvas = document.createElement('canvas')
        canvas.width = this.tw
        canvas.height = this.th
        let ctx = canvas.getContext('2d')
        ctx.drawImage(this.image,
            x*this.tw,
            y*this.th,
            this.tw,
            this.th,
            0,0,this.tw,this.th)
        return canvas
    }

    sprites_to_frames(x, y, w) {
        let arr = []
        for(let i=0; i<w; i++) {
            arr.push(this.sprite_to_image(x+i,y))
        }
        return arr
    }

    drawSpriteAt(ctx, tx, ty, cx, cy) {
        ctx.drawImage(this.image,
            tx*this.tw, ty*this.th, this.tw,this.th, // source x,y,w,h
            cx, cy, this.tw, this.th, // dest x,y,w,h
        )

    }
}
export function load_image_from_url(src) {
    return new Promise((res,rej)=>{
        let img = document.createElement('img')
        img.onload = ()=>  {
            console.log("Image Loaded ",src)
            res(img)
        }
        img.onerror =() => rej(img)
        img.src = src
    })
}
