import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {Camera, Canvas, DebugOutline, Sprite} from '../ecsy-two.js'

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
        this.stuff = null
        this.charWidth = 5
        this.lineHeight = 10
        this.spaceWidth = 1
        this.ascent = 8
    }
    drawCharCode(ctx,ch) {
        if(!this.stuff) return
        // space
        // let str = String.fromCharCode(ch)
        // console.log('drawing',ch,str)
        // let sx = 0
        // let sy = 0
        let metrics = {
            x:0,
            y:0,
            w:0,
            h:0,
        }
        if(this.stuff.metrics[ch]) {
            metrics = this.stuff.metrics[ch]
        }
        if(metrics.w > 0) {
            // console.log("really drawing",ch,str)
            ctx.drawImage(this.image,
                //src
                metrics.x, metrics.y, metrics.w, metrics.h,
                //dst
                0, this.ascent-metrics.h-metrics.baseline, metrics.w, metrics.h
            )
        } else {
            // console.log("skipping",str)
        }
        return metrics.w + this.spaceWidth
    }
}

export class CanvasFont extends Component {
    constructor() {
        super();
        this.family = 'sans-serif'
        this.size = 15
        this.weight = 'normal'
        this.color = 'black'
        this.halign = 'left'
        this.valign = 'top'
    }
}
function draw_canvas_text(ctx,font,sprite,text) {
    let x = 0
    let y = 0
    ctx.font = `${font.weight} ${font.size}px ${font.family}`
    // console.log("ctx.font",ctx.font)
    text.split('\n').forEach(line => {
        ctx.fillStyle = font.color
        let metrics = ctx.measureText(line)
        // console.log(metrics.fontBoundingBoxDescent)
        // y += metrics.actualBoundingBoxAscent + metrics.actualBoundingBoxDescent
        if(font.halign === 'right') {
            x = sprite.width - metrics.width
        }
        y += font.size
        ctx.fillText(line,x,y)
        if(font.debug) {
            ctx.fillStyle = 'yellow'
            ctx.fillRect(x, y, metrics.width,1)
        }
    })
    if(font.debug) {
        ctx.strokeStyle = 'red'
        ctx.strokeRect(0,0,sprite.width,sprite.height)
    }
}
export class TextSystem extends System {
    execute(delta, time) {
        this.queries.pixel_fonts.added.forEach(ent => this.load_pixel_font(ent))
        this.queries.text_views.added.forEach(ent => this.setup_text_view(ent))
        this.queries.plain_text_views.added.forEach(ent => this.setup_plain_text_view(ent))
    }

    load_pixel_font(ent) {
        let font = ent.getComponent(PixelFont)
        console.log("setting up pixel font",font)
        font.image = new Image()
        font.image.src = font.src
        if(font.metrics_src) {
            console.log("loading ",font.metrics_src)
            fetch(font.metrics_src).then(res => res.json()).then(data=>font.stuff = data)
        }
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

                let dy = 0
                view.text.split("\n").forEach(line => {
                    this.draw_line(ctx,line,font,0,dy)
                    dy += font.lineHeight
                })

                ctx.restore()
            }
        }
    }

    setup_plain_text_view(tv) {
        tv.getComponent(Sprite).draw_object = {
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
                let font = tv.getComponent(CanvasFont)
                let text = tv.getComponent(TextBox).text
                ctx.translate(sprite.x,sprite.y)
                draw_canvas_text(ctx,font,sprite,text)
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
    },
    plain_text_views: {
        components: [Sprite, TextBox, CanvasFont],
        listen: {
            added:true
        }
    }
}
