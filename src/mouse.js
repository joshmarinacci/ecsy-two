import {System} from "../node_modules/ecsy/build/ecsy.module.js"
import {InputState} from './ecsy-two.js'

const BUTTONS = {
    LEFT:'left-button',
    PRESSED:'down',
    RELEASED:'up',
}
export class MouseState {
    constructor() {
        this.clientX = 0
        this.clientY = 0
        this.states = {}
        this.downHandler = (e) => {
            this.setKeyState(BUTTONS.LEFT,BUTTONS.PRESSED)
        }
        this.moveHandler = (e) =>  {
            this.clientX = e.clientX
            this.clientY = e.clientY
            this.lastTimestamp = e.timeStamp
        }
        this.upHandler = (e) => {
            this.setKeyState(BUTTONS.LEFT,BUTTONS.RELEASED)
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
                prev:BUTTONS.RELEASED,
                current:BUTTONS.RELEASED,
            }
        }
        return this.states[key]
    }
}
export class MouseInputSystem extends System {
    execute(delta, time) {
        this.queries.mouse.added.forEach(ent => {
            let mouse = ent.getMutableComponent(MouseState)
            document.addEventListener('mousemove', mouse.moveHandler, false)
            document.addEventListener('mousedown', mouse.downHandler, false)
            document.addEventListener('mouseup',   mouse.upHandler,   false)
        })
        this.queries.mouse.results.forEach(ent => {
            let mouse = ent.getComponent(MouseState)
            let inp = ent.getMutableComponent(InputState)
            let name = BUTTONS.LEFT
            let state = mouse.getKeyState(name)
            // just pressed down
            if(state.current === BUTTONS.PRESSED && state.prev === BUTTONS.RELEASED) {
                inp.states[name] = (state.current === BUTTONS.PRESSED)
                inp.changed = true
            }
            // just released up
            if(state.current === BUTTONS.RELEASED && state.prev === BUTTONS.PRESSED) {
                inp.states[name] = (state.current === BUTTONS.PRESSED)
                inp.changed = true
                inp.released = true
            }
            state.prev = state.current
        })
        this.queries.mouse.removed.forEach(ent => {
            let mouse = ent.getMutableComponent(MouseState)
            if(mouse) document.removeEventListener('mousemove', mouse.moveHandler)
        })
    }
}
MouseInputSystem.queries = {
    mouse: {
        components:[MouseState, InputState],
        listen: {
            added:true,
            removed:true
        }
    }
}
