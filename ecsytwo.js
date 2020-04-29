import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"

export class Canvas extends Component {
    constructor() {
        super();
        this.scale = 1
        this.dom = null
        this.pixelMode = true
    }
}
export class Sprite extends  Component {
    constructor() {
        super()
        this.x = 0
        this.y = 0
        this.width = 10
        this.height = 10
    }
    left() {
        return this.x
    }
    right() {
        return this.x + this.width
    }
    top() {
        return this.y
    }
    bottom() {
        return this.y + this.height
    }
    intersects(r2) {
        return this.right() >= r2.left() && this.left() <= r2.right() &&
            this.top() <= r2.bottom() && this.bottom() >= r2.top();
    }
    union(r2) {
        let sprite = new Sprite()
        let r1 = this
        sprite.x = Math.min(r1.x, r2.x)
        sprite.y = Math.min(r1.y, r2.y)
        sprite.width  = Math.max( r1.right(),  r2.right() )  - Math.min( r1.left(), r2.left() );
        sprite.height = Math.max( r1.bottom(), r2.bottom() ) - Math.min( r1.top(),  r2.top() );
        return sprite
    }
}
export class BackgroundFill extends Component {
    constructor() {
        super()
        this.color = 'white'
    }
}
export class Camera extends Component {
    constructor() {
        super();
        this.x = 0
        this.y = 0
        this.centered = true
    }
}
export class CameraFollowsSprite extends Component {
    constructor() {
        super();
        this.target = null
    }
}


export class FilledSprite extends Component {
    constructor() {
        super();
        this.color = 'red'
    }
}

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

export class DebugOutline {
    constructor() {
        this.color = 'red'
    }
}

export class ECSYTwoSystem extends  System {
    execute(delta, time) {
        this.queries.canvas.added.forEach(ent => {
            let canvas = ent.getMutableComponent(Canvas)
            canvas.dom = document.createElement('canvas')
            canvas.dom.width = canvas.width*canvas.scale
            canvas.dom.height = canvas.height*canvas.scale
            document.body.append(canvas.dom)
        })
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            ctx.imageSmoothingEnabled = !canvas.pixelMode
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            this.queries.background.results.forEach(ent => {
                let bg = ent.getComponent(BackgroundFill)
                ctx.fillStyle = bg.color
                ctx.fillRect(0,0,canvas.dom.width,canvas.dom.height)
            })
            ctx.restore()
        })
    }
}
ECSYTwoSystem.queries = {
    canvas: {
        components: [Canvas],
        listen: {
            added:true,
        }
    },
    background: {
        components: [BackgroundFill]
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
                ctx.fillStyle = color.color
                ctx.fillRect(sprite.x, sprite.y, sprite.width, sprite.height)
            })
            // draw image sprites
            this.queries.sprites.results.forEach(ent => {
                let sprite = ent.getComponent(Sprite)
                ctx.save()
                if(sprite.fixed && canvas_ent.hasComponent(Camera)) {
                    let camera = canvas_ent.getComponent(Camera)
                    ctx.translate(
                        +camera.x - canvas.width/2,
                        +camera.y - canvas.height/2)
                }
                ctx.translate(sprite.x, sprite.y)
                let image_sprite = ent.getComponent(ImageSprite)
                if(image_sprite.flipY) {
                    ctx.scale(-1,1)
                    ctx.translate(-sprite.width,0)
                }
                if(image_sprite.image) {
                    ctx.drawImage(image_sprite.image, 0, 0)
                }
                ctx.restore()
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

export function startWorld(world) {
    let lastTime = performance.now()
    function run() {
        const time = performance.now()
        const delta = time - lastTime

        // Run all the systems
        world.execute(delta, time);

        lastTime = time;
        requestAnimationFrame(run);
    }
    run()
}
