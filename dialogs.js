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
import {Canvas} from './ecsytwo.js'

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
                machine.current_state++
            }
        })

        this.queries.waiting.results.forEach(waiting_ent => {
            this.queries.input.results.forEach(ent => {
                let input = ent.getComponent(InputState)
                if(input.anyReleased()) {
                    waiting_ent.removeComponent(WaitForInput)
                    waiting_ent.getMutableComponent(StateMachine).waiting = false
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



export class Dialog {
    constructor() {
        this.text = "some text"
        this.tilemap = null
    }
}
export class FixedWidthFont {
    constructor() {
        this.src = null
        this.loaded = false
        this.image = null
        this.lineHeight = 7
        this.charHeight = 7
        this.charWidth = 4
        this._debug_drawn = false
    }
    drawCharCode(ctx,ch) {
        if(ch === 32) {
            return this.charWidth
        }

        let sx = 0
        let sy = 0
        if(ch >= 65 && ch <= 90) {
            sx = ch-65
            sy = Math.floor(sx/16)
            sx = sx % 16
        }
        if(ch === 33) {
            sx = 0
            sy = 3
        }
        if(sx >= 0) {
            ctx.drawImage(this.image,
                sx*this.charWidth, sy*(this.height-1), this.charWidth, this.height,
                0,0, this.charWidth, this.height
            )
        }
        return this.charWidth
    }
}

export class VariableWidthFont {
    constructor() {
        this.src = null
        this.loaded = false
        this.image = null
        this.charHeight = 7
        this.lineHeight = 7
        this.charWidth = 4
        this.charsPerLine = 8
        this._debug_drawn = false
        this.widths = {}
        this.positions = {}
    }
    drawCharCode(ctx,ch) {
        // space
        let cw = this.charWidth
        cw = 3
        let str = String.fromCharCode(ch)
        //
        if(this.widths[str]) cw = this.widths[str]

        //space
        if(ch === 32) return cw
        let sx = 0
        let sy = 0
        // if between A and Z
        if(ch >= 65 && ch <= 90) {
            sx = ch-65
            sy = Math.floor(sx/this.charsPerLine)
            sx = sx % this.charsPerLine
        }
        // if between a and z
        if(ch >= 97 && ch <= 122) {
            sx = ch-97
            sy = Math.floor(sx/this.charsPerLine) + 3
            sx = sx % this.charsPerLine
        }
        if(this.positions[str]) {
            sx = this.positions[str].x
            sy = this.positions[str].y
        }
        if(sx >= 0) {
            ctx.drawImage(this.image,
                //src
                sx*this.charWidth, sy*(this.charHeight), cw, this.charHeight,
                //dst
                0,0, cw, this.charHeight
            )
        }
        return cw+1
    }
}

export class DialogSystem extends System {
    execute(delta, time) {
        this.queries.fonts.added.forEach(ent => {
            this.loadImage(ent.getMutableComponent(FixedWidthFont))
        })
        this.queries.fonts2.added.forEach(ent => {
            this.loadImage(ent.getMutableComponent(VariableWidthFont))
        })
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            ctx.imageSmoothingEnabled = false
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            this.queries.dialogs.results.forEach(ent => {
                let dialog = ent.getComponent(Dialog)

                if(dialog.tilemap) {
                    this.drawTilemap(ctx,dialog.tilemap)
                } else {
                    ctx.fillStyle = 'yellow'
                    ctx.fillRect(8, 8, canvas.width - 8 * 2, canvas.height - 8 * 2)
                }

                if(ent.hasComponent(FixedWidthFont)) {
                    let font = ent.getComponent(FixedWidthFont)
                    let dy = 8
                    dialog.text.split("\n").forEach(line => {
                        this.drawLine(ctx, line, font, 8, dy)
                        dy += font.lineHeight
                    })
                    return
                }
                if(ent.hasComponent(VariableWidthFont)) {
                    let font = ent.getComponent(VariableWidthFont)
                    let dy = 8
                    dialog.text.split("\n").forEach(line => {
                        this.drawLine(ctx,line,font,8,dy)
                        dy += font.lineHeight
                    })
                    return
                }

                //if not font specified, just use sans-serif from canvas
                {
                    ctx.fillStyle = 'black'
                    ctx.font = "6pt normal sans-serif"
                    let dy = 8
                    dialog.text.split("\n").forEach(line => {
                        let bounds = ctx.measureText(line)
                        dy += bounds.actualBoundingBoxAscent + bounds.actualBoundingBoxDescent
                        dy += 1
                        ctx.fillText(line, 10, dy)
                    })
                }

                // console.log(bounds.width, bounds.actualBoundingBoxAscent, bounds.actualBoundingBoxDescent)
            })
            ctx.restore()
        })
    }

    drawLine(ctx, line, font, x, y) {
        // line = line.toUpperCase()
        for(let i=0; i<line.length; i++) {
            if(!font._debug_drawn) {
                font._debug_drawn = true
                console.log(line.charAt(i), line.charCodeAt(i))
            }
            ctx.save()
            ctx.translate(x,y)
            x += font.drawCharCode(ctx,line.charCodeAt(i))
            ctx.restore()
        }
    }

    drawTilemap(ctx, tilemap) {
        let map = tilemap
        for(let y=0; y<map.height; y++) {
            for(let x=0; x<map.width; x++) {
                let n = y*map.width+x
                let tile_index = map.map[n]
                let tile = map.index[tile_index]
                if(tile)  ctx.drawImage(tile,x*map.tileSize, y*map.tileSize)
            }
        }
    }

    loadImage(font) {
        if(!font.image) {
            font.image = new Image()
            font.image.onload = () => {
                font.loaded = true
            }
            font.image.src = font.src
        }
    }
}
DialogSystem.queries = {
    canvas: {
        components: [Canvas],
    },
    dialogs: {
        components:[Dialog],
        listen: {
            added:true
        }
    },
    fonts: {
        components: [FixedWidthFont],
        listen: {
            added:true,
        }
    },
    fonts2: {
        components: [VariableWidthFont],
        listen: {
            added:true,
        }
    }
}
