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
    }
}
export class SpriteLocation extends Component {
    constructor() {
        super();
        this.x = 0
        this.y = 0
    }
}

export class ECSYTwoSystem extends  System {
    execute(delta, time) {
        this.queries.canvas.added.forEach(ent => {
            let canvas = ent.getMutableComponent(Canvas)
            canvas.dom = document.createElement('canvas')
            canvas.dom.width = 10*16*canvas.scale
            canvas.dom.height = 8*16*canvas.scale
            document.body.append(canvas.dom)
        })
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            ctx.imageSmoothingEnabled = false
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            ctx.fillStyle = 'black'
            ctx.fillRect(0,0,canvas.dom.width,canvas.dom.height)

            this.queries.sprites.results.forEach(ent => {
                let sprite = ent.getComponent(Sprite)
                let loc = ent.getComponent(SpriteLocation)
                ctx.save()
                ctx.translate(loc.x, loc.y)
                ctx.drawImage(sprite.image,0,0)
                ctx.restore()
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
    sprites: {
        components: [Sprite, SpriteLocation]
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
