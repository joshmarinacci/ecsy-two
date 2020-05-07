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
        this.metrics = {
            A: { x: 194, y: 1, w: 6, h:9},
            C: { x: 210, y: 1, w: 6, h:9},
            E: { x: 225, y: 1, w: 7, h:9},
            I: { x: 258, y: 1, w: 5, h:9},
            N: { x: 291, y: 1, w: 8, h:9},
            P: { x: 306, y: 1, w: 7, h:9},
            R: { x: 321, y: 1, w: 7, h:9},
            T: { x: 336, y: 1, w: 7, h:9},
            ' ': { x: 0, y: 0, w: 7, h: 9}
        }
        this.charWidth = 5
        this.lineHeight = 10
        this.spaceWidth = 0
        this.charsPerLine = 50
    }
    drawCharCode(ctx,ch) {
        // space
        let str = String.fromCharCode(ch)
        // console.log('drawing',ch,str)
        let sx = 0
        let sy = 0
        let metrics = {
            x:0,
            y:0,
            w:0,
            h:0,
        }
        if(this.metrics[str]) {
            metrics = this.metrics[str]
        }
        if(metrics.w > 0) {
            // console.log("really drawing",ch,str)
            ctx.drawImage(this.image,
                //src
                metrics.x, metrics.y, metrics.w, metrics.h,
                //dst
                0, 0, metrics.w, metrics.h
            )
        } else {
            // console.log("skipping",str)
        }
        return metrics.w + this.spaceWidth
    }
}

export class TextSystem extends System {
    execute(delta, time) {
        this.queries.pixel_fonts.added.forEach(ent => this.load_pixel_font(ent))
        this.queries.text_views.added.forEach(ent => this.setup_text_view(ent))
    }

    load_pixel_font(ent) {
        let font = ent.getComponent(PixelFont)
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
