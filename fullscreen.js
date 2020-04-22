import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"

export class FullscreenMode extends Component {
}

export class FullscreenButton extends Component {
}

export class FullscreenSystem extends  System {
    execute(delta, time) {
        this.queries.buttons.added.forEach(ent => {
            let elem = document.createElement('button')
            elem.innerText = "fullscreen"
            elem.classList.add("fullscreen")
            elem.addEventListener('click',(e)=>{
                e.stopPropagation()
                e.preventDefault()
                ent.addComponent(FullscreenMode);
            })
            document.documentElement.append(elem);
        })
        this.queries.active.added.forEach(ent => {
            console.log("turned on full screen")
            let mode = ent.getMutableComponent(FullscreenMode)
            mode.fullscreenchangeHandler = () => {
                console.log("entered full screen")
                if(document.fullscreenElement || document.webkitFullscreenElement) {
                    console.log("entered")
                } else {
                    console.log("exited")
                    ent.removeComponent(FullscreenMode)
                }
            }
            document.addEventListener('fullscreenchange',mode.fullscreenchangeHandler)
            document.addEventListener('webkitfullscreenchange',mode.fullscreenchangeHandler)
            const domElement = document.querySelector("canvas")
            domElement.requestFullscreen()
        })
        this.queries.active.removed.forEach(ent => {
            console.log("removed the fullscreen mode")
        })
    }
}
FullscreenSystem.queries = {
    buttons: {
        components: [FullscreenButton],
        listen: {
            added:true
        }
    },
    active: {
        components: [FullscreenMode],
        listen: {
            added:true,
            removed:true,
        }
    }
}
