import {Component, System, Not} from "../node_modules/ecsy/build/ecsy.module.js"
import {Camera, Canvas, Sprite} from './ecsy-two.js'


export class Layer extends Component{
    constructor() {
        super();
        this.name = "unnamed-layer"
        this.depth = 100000
    }
}
export class LayerParent extends Component {
    constructor() {
        super();
        this.name = "default"
        this.draw_object = null
    }
}


export class LayerRenderingSystem extends System {
    init() {
        this.layer_order = []
        this.layer_index = {}
    }
    execute(delta, time) {
        //this creates a default layer for anything that doesn't specify a layer
        this.queries.canvas.added.forEach(ent => {
            ent.addComponent(Layer, { name:'default', depth: 0})
        })
        this.update_layer_order()
        this.update_layer_index()
        this.draw_layers()
    }

    update_layer_order() {
        this.layer_order = this.queries.layers.results.map(ent => ent.getComponent(Layer))
        this.layer_order.sort((a,b)=> a.depth - b.depth)
    }

    update_layer_index() {
        this.layer_index = {}
        this.queries.layer_children.results.forEach(ent => {
            let ch = ent.getComponent(LayerParent)
            if(!this.layer_index[ch.name]) this.layer_index[ch.name] = []
            if(ch.draw_object) this.layer_index[ch.name].push(ch.draw_object)
        })
        this.queries.sprite_children.results.forEach(ent => {
            let ch = ent.getComponent(Sprite)
            if(!this.layer_index[ch.layer]) this.layer_index[ch.layer] = []
            if(ch.draw_object) this.layer_index[ch.layer].push(ch.draw_object)
        })
    }

    draw_layers() {
        this.queries.canvas.results.forEach(canvas_ent => {
            let canvas = canvas_ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            if(canvas_ent.hasComponent(Camera)) {
                let camera = canvas_ent.getComponent(Camera)
                if (camera.centered) {
                    ctx.translate(
                        -camera.x + canvas.width / 2,
                        -camera.y + canvas.height / 2)
                }
            }
            this.layer_order.forEach(layer => {
                let children = this.layer_index[layer.name]
                if(children) children.forEach(ch => ch.draw(ctx, canvas_ent))
            })
            ctx.restore()
        })
    }
}
LayerRenderingSystem.queries = {
    canvas: {
        components: [Canvas],
        listen: {
            added:true
        }
    },
    layers: {
        components:[Layer]
    },
    layer_children: {
        components: [LayerParent]
    },
    sprite_children: {
        components: [Sprite]
    },
}


export class DrawFilledRect {
    constructor(bounds,color) {
        this.bounds = bounds
        this.color = color
    }
    draw(ctx, ent) {
        ctx.save()
        if(this.bounds.fixed && ent.hasComponent(Camera)) {
            let canvas = ent.getComponent(Canvas)
            let camera = ent.getComponent(Camera)
            ctx.translate(
                +camera.x - canvas.width/2,
                +camera.y - canvas.height/2)
        }

        ctx.fillStyle = this.color
        ctx.fillRect(this.bounds.x,this.bounds.y,this.bounds.width,this.bounds.height)
        ctx.restore()
    }
}

export class DrawStrokedRect {
    constructor(bounds,color) {
        this.bounds = bounds
        this.color = color
    }
    draw(ctx) {
        ctx.strokeStyle = this.color
        ctx.strokeRect(this.bounds.x,this.bounds.y,this.bounds.width,this.bounds.height)
    }
}

export class DrawImage {
    constructor(bounds, image_sprite) {
        this.bounds = bounds
        this.sprite = image_sprite
    }
    draw(ctx, ent) {
        if(this.sprite && this.sprite.image) {
            ctx.save()
            if(this.sprite.flipY) {
                ctx.scale(-1,1)
                ctx.translate(-this.sprite.width,0)
            }
            if(this.bounds.fixed && ent.hasComponent(Camera)) {
                let canvas = ent.getComponent(Canvas)
                let camera = ent.getComponent(Camera)
                ctx.translate(
                    +camera.x - canvas.width/2,
                    +camera.y - canvas.height/2)
            }
            ctx.translate(this.bounds.x,this.bounds.y)
            ctx.drawImage(this.sprite.image, 0, 0)
            ctx.restore()
        }

    }
}
