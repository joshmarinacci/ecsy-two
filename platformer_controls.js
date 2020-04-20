import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {SpriteLocation} from './ecsytwo.js'

export class Jumping extends Component {

}
export class PlayerPhysics extends Component {
    constructor() {
        super();
        this.vx = 0
        this.vy = 0
        this.ax = 0
        this.ay = 0
    }

}


export class PlatformerPhysicsSystem extends System {
    execute(delta, time) {
        this.queries.jump.added.forEach(ent => {
            let player_physics = ent.getComponent(PlayerPhysics)
            let jump = ent.getComponent(Jumping)
            player_physics.vy = -10
            player_physics.vx = 0
        })
        this.queries.player.results.forEach(ent => {
            let player_physics = ent.getComponent(PlayerPhysics)
            let loc = ent.getComponent(SpriteLocation)
            player_physics.vx += player_physics.ax*delta/1000
            player_physics.vy += player_physics.ay*delta/1000
            loc.x += player_physics.vx*delta/1000
            loc.y += player_physics.vy*delta/1000
        })
    }
}
PlatformerPhysicsSystem.queries = {
    jump: {
        components:[Jumping, PlayerPhysics],
        listen: {
            added:true,
            removed:true,
        }
    },
    player: {
        components:[PlayerPhysics, SpriteLocation]
    }
}
