import {Component, System} from "../node_modules/ecsy/build/ecsy.module.js"

export class MouseState {

}
export class MouseInputSystem extends System {
    execute(delta, time) {
        this.queries.mouse.added.forEach(ent => {
            let mouse = ent.getMutableComponent(MouseState)
            mouse.moveHandler = (e) =>  {
                mouse.clientX = e.clientX
                mouse.lastTimestamp = e.timeStamp
            }
            document.addEventListener('mousemove', mouse.moveHandler, false)
        })
        this.queries.mouse.results.forEach(ent => {
            // console.log("current mouse",ent.getComponent(MouseState))
        })
        this.queries.mouse.removed.forEach(ent => {
            let mouse = ent.getMutableComponent(MouseState)
            document.removeEventListener('mousemove', mouse.moveHandler)
        })
    }
}
MouseInputSystem.queries = {
    mouse: {
        components:[MouseState],
        listen: {
            added:true,
            removed:true
        }
    }
}
