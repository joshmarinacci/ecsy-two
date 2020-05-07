import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {Camera, Canvas, Sprite} from '../ecsy-two.js'

export class TextBox extends Component {
    constructor() {
        super();
        this.text = 'foo'

    }
}

export class PixelFont extends Component {
    constructor() {
        super();
        this.src = null
        this.metrics_src = null

        this.charHeight = 5
        this.charWidth = 4
        this.lineHeight = 7
        this.charsPerLine = 11
        this._debug_drawn = false
        this.widths = {
            G:4, J:4, M:5, N:4, O:4, P:4, Q:4, R:4, S:4, U:4, W:5,
            f:2, i:1,l:1, m:5, s:2,w:5,
            ' ':3,
        }

        this.positions = {
            '!':{x:8, y:7},
        }

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

export class TextSystem extends System {
    execute(delta, time) {
        this.queries.pixel_fonts.added.forEach(ent => this.load_pixel_font(ent))
        this.queries.text_views.added.forEach(ent => this.setup_text_view(ent))
    }

    load_pixel_font(ent) {
        let font = ent.getComponent(PixelFont)
        font.src = "./imgs/font_5@1x.png"
        font.image = new Image()
        font.image.src = font.src
    }

    setup_text_view(tv) {
        let sprite = tv.getComponent(Sprite)
        sprite.draw_object = {
            draw:(ctx, ent) => {
                ctx.save()
                let sprite = tv.getComponent(Sprite)
                if(sprite.fixed && ent.hasComponent(Camera)) {
                    let canvas = ent.getComponent(Canvas)
                    let camera = ent.getComponent(Camera)
                    ctx.translate(
                        +camera.x - canvas.width/2,
                        +camera.y - canvas.height/2)
                }
                let font = tv.getComponent(PixelFont)
                let view = tv.getComponent(TextBox)
                ctx.translate(sprite.x,sprite.y)
                ctx.fillStyle = 'red'
                ctx.fillRect(0,0,sprite.width,sprite.height)

                let dy = 0
                view.text.split("\n").forEach(line => {
                    this.draw_line(ctx,line,font,0,dy)
                    dy += font.lineHeight
                })

                ctx.restore()
            }
        }
    }

    draw_line(ctx, line, font, x, y) {
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
}
TextSystem.queries = {
    pixel_fonts: {
        components: [PixelFont],
        listen: {
            added:true,
        }
    },
    text_views: {
        components: [Sprite, TextBox, PixelFont],
        listen: {
            added:true
        }
    }
}
