import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"

export class Canvas extends Component {
    constructor() {
        super();
        this.scale = 1
    }
}
export class Sprite extends  Component {
    constructor() {
        super();
        this.image = null
        this.width = -1
        this.height = -1
        this.flipX = false
        this.flipY = false
        this.src = null
    }
}
export class SpriteLocation extends Component {
    constructor() {
        super();
        this.x = 0
        this.y = 0
        this.fixed = false
    }
}
export class SpriteBounds extends Component {
    constructor() {
        super();
        this.width = 1
        this.height = 1
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
    }
}
export class CameraFollowsSprite extends Component {
    constructor() {
        super();
        this.target = null
    }
}
export class AnimatedSprite extends Component {
    constructor() {
        super();
        this.frames = []
        this.current_frame = 0
        this.width = -1
        this.height = -1
        this.frame_duration = 250
        this.last_frame_time = 0
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
            ctx.imageSmoothingEnabled = false
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
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let camera = ent.getComponent(Camera)
            let ctx = canvas.dom.getContext('2d')
            ctx.imageSmoothingEnabled = false
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            ctx.translate(
                -camera.x + canvas.width/2,
                -camera.y + canvas.height/2)

            //load sprites with src properties
            this.queries.sprites.added.forEach(ent =>{
                let sprite = ent.getComponent(Sprite)
                if(!sprite.image && sprite.src) {
                    sprite.image = new Image()
                    sprite.image.src = sprite.src
                }
            })

            this.queries.sprites.results.forEach(ent => {
                let sprite = ent.getComponent(Sprite)
                let loc = ent.getComponent(SpriteLocation)
                ctx.save()
                if(loc.fixed) {
                    ctx.translate(
                        +camera.x - canvas.width/2,
                        +camera.y - canvas.height/2)
                }
                ctx.translate(loc.x, loc.y)
                if(sprite.flipY) {
                    ctx.scale(-1,1)
                    ctx.translate(-sprite.width,0)
                }
                if(sprite.image) ctx.drawImage(sprite.image, 0, 0)
                ctx.restore()
            })
            this.queries.animated_sprites.results.forEach(ent => {
                let sprite = ent.getMutableComponent(AnimatedSprite)
                let diff = time - sprite.last_frame_time
                if(diff > sprite.frame_duration) {
                    sprite.current_frame = (sprite.current_frame + 1) % sprite.frames.length
                    sprite.last_frame_time = time
                }
                let loc = ent.getComponent(SpriteLocation)
                ctx.save()
                ctx.translate(loc.x, loc.y)
                if(sprite.flipY) {
                    ctx.scale(-1,1)
                    ctx.translate(-sprite.width,0)
                }
                ctx.drawImage(sprite.frames[sprite.current_frame],0,0)
                ctx.restore()
            })
            ctx.restore()
        })

        this.queries.camera_move.results.forEach(ent => {
            let cfs = ent.getComponent(CameraFollowsSprite)
            if(!cfs.target) return
            let loc = cfs.target.getComponent(SpriteLocation)
            if(!loc) return
            this.queries.canvas.results.forEach(ent => {
                let camera = ent.getMutableComponent(Camera)
                camera.x = loc.x
                camera.y = loc.y
            })
        })
    }
}

SpriteSystem.queries = {
    canvas: {
        components: [Canvas,Camera],
    },
    sprites: {
        components: [Sprite, SpriteLocation],
        listen: {
            added:true,
            removed:true,
        }
    },
    camera_move: {
        components: [CameraFollowsSprite]
    },
    animated_sprites: {
        components: [AnimatedSprite, SpriteLocation]
    },
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
