import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"

export class KeyboardState extends Component {
    constructor() {
        super();
        this.states = {}
        this.on_keydown = (e) => {
            if(!this.states[e.key]) this.states[e.key] = false
            this.states[e.key] = true
        }
        this.on_keyup = (e) => {
            if(!this.states[e.key]) this.states[e.key] = false
            this.states[e.key] = false
        }
    }
    isPressed(name) {
        if(this.states[name]) return this.states[name]
        return false
    }
}
export class KeyboardSystem extends System {
    execute(delta, time) {
        this.queries.controls.added.forEach( ent => {
            let cont = ent.getMutableComponent(KeyboardState)
            document.addEventListener('keydown',cont.on_keydown)
            document.addEventListener('keyup',cont.on_keyup)
        })
    }
}
KeyboardSystem.queries = {
    controls: {
        components:[KeyboardState],
        listen: { added:true, removed: true},
    },
}
