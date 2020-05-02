import {Component, System} from "ecsy"
import {AnimatedSprite, Camera, Canvas, SpriteBounds, SpriteLocation} from '../ecsy-two.js'

export class FadeTransition extends Component {
    constructor() {
        super();
        this.direction = 'in'
        this.color = 'black'
        this._start_time = -1
        this.duration = 1 //duration in seconds
    }
}
export class TransitionSystem extends System {
    execute(delta, time) {
        this.queries.transitions.added.forEach(ent => {
            ent.getMutableComponent(FadeTransition)._start_time = time
        })
        this.queries.transitions.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            let fade = ent.getComponent(FadeTransition)
            ctx.save()
            ctx.fillStyle = fade.color
            let diff = time - fade._start_time
            let t = diff/(fade.duration*1000)
            if(t > 1) {
                ent.removeComponent(FadeTransition)
            } else {
                ctx.globalAlpha = 1 - t
                ctx.fillRect(0, 0, canvas.dom.width, canvas.dom.height)
            }
            ctx.restore()
        })
    }
}
TransitionSystem.queries = {
    transitions:{
        components:[Canvas, FadeTransition],
        listen: {
            added:true,
            removed:true,
        }
    }
}
