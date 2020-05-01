import {Component, System} from "../node_modules/ecsy/build/ecsy.module.js"

export class Canvas extends Component {
    constructor() {
        super();
        this.scale = 1
        this.dom = null
        this.pixelMode = false
        this.width = 100
        this.height = 100
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
export class DebugOutline {
    constructor() {
        this.color = 'red'
    }
}
export class FilledSprite extends Component {
    constructor() {
        super();
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

export class InputState extends Component {
    constructor() {
        super()
        this.states = {}
        this.changed = true
        this.released = false
    }

    anyChanged() {
        return this.changed
    }

    anyReleased() {
        return this.released
    }
}
