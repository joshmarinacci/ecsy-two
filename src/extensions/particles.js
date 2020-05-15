import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {FilledSprite, Sprite, ImageSprite} from '../index.js'

export class Emitter extends Component {
    constructor() {
        super();
        this.image = null
        this.count = 0
        this.velocity = 0
        this.velocity_jitter = 0
        this.angle = 0
        this.angle_jitter = 0
        this.lifetime = 2
        this.duration = -1
        this.start_time = 0
        this.tick_rate = 50
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
        this.queries.emitters.added.forEach(ent => {
            let emitter = ent.getComponent(Emitter)
            emitter.start_time = time/1000
        })
        this.queries.emitters.results.forEach(ent => {
            let emitter = ent.getComponent(Emitter)
            let loc = ent.getComponent(Sprite)
            emitter.count++
            if(emitter.count % emitter.tick_rate === 0) {
                let part = this.world.createEntity()
                let v = emitter.velocity + Math.random()*emitter.velocity_jitter
                let a = emitter.angle + Math.random()*emitter.angle_jitter
                part.addComponent(Particle, {
                    vx:Math.sin(a)*v,
                    vy:Math.cos(a)*v,
                    lifetime: emitter.lifetime,
                    start_time: time/1000,
                })
                part.addComponent(ImageSprite, {image:emitter.image})
                if(!emitter.image) {
                    part.addComponent(FilledSprite, { color: 'yellow'})
                }
                part.addComponent(Sprite, {x: loc.x, y: loc.y, width:loc.width, height: loc.height})
            }
            if(emitter.duration !== -1 && time/1000 - emitter.start_time > emitter.duration) {
                ent.removeComponent(Emitter)
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
