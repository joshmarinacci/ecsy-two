import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"

export class Canvas extends Component {}
export class Viewport extends Component {
    constructor() {
        super();
        this.tilesize = 16
        this.width = 5
        this.height = 5
    }
}
export class Sprite extends  Component {
    constructor() {
        super();
        this.image = null
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
            canvas.dom.width = 320
            canvas.dom.height = 200
            document.body.append(canvas.dom)
        })
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            ctx.save()
            ctx.scale(3,3)
            ctx.fillStyle = 'white'
            ctx.fillRect(0,0,canvas.dom.width,canvas.dom.height)

            this.queries.viewport.results.forEach(ent => {
                let viewport = ent.getComponent(Viewport)
                ctx.strokeStyle = 'black'
                ctx.save()
                ctx.lineWidth = 1;
                ctx.translate(0.5,0.5)
                ctx.strokeRect(0,0,viewport.width*viewport.tilesize, viewport.height*viewport.tilesize)
                ctx.restore()
            })

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
    viewport: {
        components: [Viewport],
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
