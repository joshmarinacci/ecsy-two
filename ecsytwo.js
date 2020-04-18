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
export class BackgroundFill extends Component {
    constructor() {
        super()
        this.color = 'white'
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
            let ctx = canvas.dom.getContext('2d')
            ctx.imageSmoothingEnabled = false
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
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

SpriteSystem.queries = {
    canvas: {
        components: [Canvas],
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
