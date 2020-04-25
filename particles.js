import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {ImageSprite, Sprite} from './ecsytwo.js'

export class Emitter extends Component {
    constructor() {
        super();
        this.image = null
        this.count = 0
    }
}

class Particle extends Component {
    constructor() {
        super();
        this.start_time = 0
        this.lifetime = 0
        this.vx = 0
        this.vy = 0
    }
}
export class ParticleSystem extends System {
    execute(delta, time) {
        this.queries.emitters.results.forEach(ent => {
            let emitter = ent.getComponent(Emitter)
            let loc = ent.getComponent(Sprite)
            emitter.count++
            if(emitter.count % 60 === 0) {
                let part = this.world.createEntity()
                part.addComponent(Particle, {
                    vx:0,
                    vy:-10,
                    lifetime: emitter.lifetime,
                    start_time: time/1000,
                })
                part.addComponent(ImageSprite, {image:emitter.image})
                part.addComponent(Sprite, {x: loc.x, y: loc.y})
            }
        })
        this.queries.particles.results.forEach(ent => {
            let part = ent.getComponent(Particle)
            let loc = ent.getMutableComponent(Sprite)
            loc.x += part.vx*delta/1000
            loc.y += part.vy*delta/1000
            if(time/1000 > part.start_time + part.lifetime) {
                ent.removeAllComponents()
                ent.remove()
            }
        })
    }
}
ParticleSystem.queries = {
    emitters: {
        components:[Emitter, Sprite],
        listen: {
            added:true,
            removed:true,
        }
    },
    particles: {
        components:[Particle, Sprite],
        listen: {
            added:true,
            removed:true,
        }
    }
}
