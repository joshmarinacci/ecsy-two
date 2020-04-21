/*

disable platformer physics
show splash image
wait for any button press
fade to black
load and setup tilemap
fade from black
animate in dialog
draws laid out text and border:  Cat Prince. We need your help!
wait for button press
draw dialog & wait:  Your grandfather the old Cat King has been kidnapped!
draw dialog & wait: Please rescue him
animate out dialog
enable platformer physics


addComponent(StateMachine, {states:[
    (machine)=>{
        PlatformerPhysics.enabled = false
        view.addComponent(SplashImage, { src:"imgs/splash.png"})
        view.addComponent(WaitForInput)
    },
    (machine) => {
        view.addComponent(TileMap, { src:"maps/level1.json" }),
        view.addComponent(FadeTransition, { direction:'in', duration: 0.5, color:'black' })
        view.addComponent(WaitForTime, { duration:0.5 })
    },
    (machine) => {
        view.addComponent(FadeTransition, { direction:'out', duration: 0.5, color:'black' })
        view.addComponent(WaitForTime, { duration:0.5 })
    },
    (machine) => {
        view.addComponent(Dialog, { text:"Cat Prince. We need your help!" })
        view.addComponent(WaitForInput)
    },
    (machine) => {
        view.addComponent(DialogTransition, { direction:'in' })
        view.addComponent(Dialog, { text:"Your grandfather the old Cat King has been kidnapped!" })
        view.addComponent(WaitForInput)
    },
    (machine) => {
        view.addComponent(Dialog, { text:"Please rescue him." })
        view.addComponent(WaitForInput)
    },
    (machine) => {
        view.addComponent(DialogTransition, { direction:'out' })
        view.addComponent(WaitForTime, {duration: 0.5})
    }),
    (machine) => {
        PlatformerPhysics.enabled = true
    }),

]})


*/

import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {InputState, KeyboardState} from './keyboard.js'

export class StateMachine {
    constructor() {
        this.states = []
        this.current_state = -1
        this.waiting = false
    }
}

export class SplashImage {

}
export class WaitForInput extends Component {

}
export class WaitForTime extends Component {

}
export class Dialog {
    constructor() {
        this.text = "some text"
    }
}

export class StateMachineSystem extends System {
    execute(delta, time) {
        this.queries.machines.added.forEach(ent => {
            let machine = ent.getMutableComponent(StateMachine)
            machine.current_state = 0
            machine.waiting = false
        })
        this.queries.machines.results.forEach(ent => {
            let machine = ent.getMutableComponent(StateMachine)
            if(!machine.waiting) {
                machine.states[machine.current_state]()
                machine.waiting = true
            }
        })

        this.queries.waiting.results.forEach(ent => {
            console.log("waiting for input")
            this.queries.input.results.forEach(ent => {
                let input = ent.getComponent(InputState)
                if(input.anyChanged()) {
                    ent.removeComponent(WaitForInput)
                }
            })
        })
    }
}




StateMachineSystem.queries = {
    machines: {
        components: [StateMachine],
        listen: {
            added:true,
            removed:true,
        }
    },
    waiting: {
        components: [StateMachine, WaitForInput]
    },
    input: {
        components: [InputState]
    }
}
