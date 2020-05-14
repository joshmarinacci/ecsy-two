import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {Canvas, FilledSprite, InputState, make_point, Sprite} from "../../src/index.js"

export class TouchButton extends Component {
    constructor() {
        super();
        this.pressed = false
        this.name = "default"
    }
}

export class TouchState extends Component {
    constructor() {
        super();
        this.changed = false
    }
}

export class TouchInputSystem extends System {
    execute(delta, time) {
        this.queries.input.added.forEach(ent => {
            let touch = ent.getMutableComponent(TouchState)
            touch.startHandler = (e) => {
                e.preventDefault()
                e.stopPropagation()
                let points = Array.from(e.touches).map(tch => make_point(tch.clientX, tch.clientY))
                this.checkButtonsDown(points)
                touch.changed = false
            }
            touch.moveHandler = (e) =>  {
                e.preventDefault()
                e.stopPropagation()
                let points = Array.from(e.touches).map(tch => make_point(tch.clientX, tch.clientY))
                this.checkButtonsDown(points)
            }
            touch.endHandler = (e) => {
                console.log(e)
                let points = Array.from(e.touches).map(tch => make_point(tch.clientX, tch.clientY))
                this.checkButtonsDown(points)
                touch.changed = true
            }

            touch.mousedown = (e) => {
                touch.mouse_pressed = true
                this.checkButtonsDown([make_point(e.clientX, e.clientY)])
            }
            touch.mousemove = (e) => {
                if(touch.mouse_pressed) {
                    this.checkButtonsDown([make_point(e.clientX, e.clientY)])
                }
            }
            touch.mouseup = (e) => {
                touch.mouse_pressed = false
                this.checkButtonsDown([make_point(e.clientX, e.clientY)])
            }
            document.addEventListener('touchstart', touch.startHandler, {passive:false, capture:false, useCapture:false})
            document.addEventListener('touchmove', touch.moveHandler, false)
            document.addEventListener('touchend', touch.endHandler, false)

            document.addEventListener('mousedown', touch.mousedown, false)
            document.addEventListener('mousemove', touch.mousemove, false)
            document.addEventListener('mouseup', touch.mouseup, false)
        })
        this.queries.input.results.forEach(ent => {
            let touch = ent.getMutableComponent(TouchState)
            let inp = ent.getMutableComponent(InputState)
            if(touch.changed) {
                inp.released = true
                touch.changed = false
            }
        })
        this.queries.buttons.changed.forEach(ent => {
            let button = ent.getComponent(TouchButton)
            this.queries.input.results.forEach(ent => {
                let inp = ent.getMutableComponent(InputState)
                if(button.name === 'jump') {
                    inp.states.jump = button.pressed
                }
                if(button.name === 'right') {
                    inp.states.right = button.pressed
                }
                if(button.name === 'left') {
                    inp.states.left = button.pressed
                }
            })
        })
    }

    checkButtonsDown(points) {
        this.queries.buttons.results.forEach(ent => {
            let button = ent.getComponent(TouchButton)
            let sprite = ent.getComponent(Sprite)

            let canvas = this.queries.canvas.results[0].getComponent(Canvas)
            let newval = button.pressed
            let any = false
            points.forEach(pt => {
                pt = pt.div(canvas.scale)
                if(sprite.contains(pt)) {
                    newval = true
                    any = true
                }
            })
            if(button.pressed !== newval) {
                ent.getMutableComponent(TouchButton).pressed = newval
            }
            if(any === false) {
                ent.getMutableComponent(TouchButton).pressed = false
            }

        })
    }
}
TouchInputSystem.queries = {
    canvas: {
        components: [Canvas]
    },
    input: {
        components:[TouchState, InputState],
        listen: {
            added:true,
        }
    },
    buttons: {
        components: [Sprite, TouchButton],
        listen: {
            changed:true,
        }
    }
}

export class HoverEffectSystem extends System {
    execute(delta, time) {
        this.queries.buttons.changed.forEach(ent => {
            let button = ent.getComponent(TouchButton)
            let filled = ent.getComponent(FilledSprite)
            if(button.pressed) {
                filled.color = 'rgba(255,200,200,0.5)'
            } else {
                filled.color = 'rgba(255,0,0,0.5)'
            }
        })
    }
}
HoverEffectSystem.queries = {
    buttons: {
        components:[Sprite,TouchButton,FilledSprite],
        listen: {
            added:true,
            removed:true,
            changed:true
        }
    }
}
