import {Component, System} from "../node_modules/ecsy/build/ecsy.module.js"
import {InputState} from './ecsy-two.js'

export class KeyboardState extends Component {
    constructor() {
        super();
        this.states = {}
        this.mapping = {
            ' ':'jump',
            'ArrowLeft':'left',
            'ArrowRight':'right',
            'ArrowUp':'up',
            'ArrowDown':'down',
        }
        this.on_keydown = (e) => {
            this.setKeyState(e.key,'down')
        }
        this.on_keyup = (e) => {
            this.setKeyState(e.key,'up')
        }
    }
    setKeyState(key,value) {
        let state = this.getKeyState(key)
        state.prev = state.current
        state.current = value
    }
    getKeyState(key) {
        if(!this.states[key]) {
            this.states[key] = {
                prev:'up',
                current:'up',
            }
        }
        return this.states[key]
    }
    isPressed(name) {
        return this.getKeyState(name).current === 'down'
    }
}
export class KeyboardSystem extends System {
    execute(delta, time) {
        this.queries.controls.added.forEach( ent => {
            let cont = ent.getMutableComponent(KeyboardState)
            document.addEventListener('keydown',cont.on_keydown)
            document.addEventListener('keyup',cont.on_keyup)
        })
        this.queries.controls.results.forEach(ent => {
            let kb = ent.getComponent(KeyboardState)
            let inp = ent.getMutableComponent(InputState)
            inp.changed = false
            inp.released = false
            Object.keys(kb.mapping).forEach(key => {
                let name = kb.mapping[key]
                let state = kb.getKeyState(key)
                if(state.current === 'down' && state.prev === 'up') {
                    inp.states[name] = (state.current === 'down')
                    inp.changed = true
                }
                if(state.current === 'up' && state.prev === 'down') {
                    inp.states[name] = (state.current === 'down')
                    inp.changed = true
                    inp.released = true
                }
                state.prev = state.current
            })
            // console.log("key mapping", kb.mapping['a'], kb.states['a'], "left state",inp.states['left'])
        })
    }
}
KeyboardSystem.queries = {
    controls: {
        components:[KeyboardState, InputState],
        listen: { added:true, removed: true},
    },
}
