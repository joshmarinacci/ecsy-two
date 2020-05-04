import {Component, System, Not} from "../node_modules/ecsy/build/ecsy.module.js"
import {Canvas, Sprite} from './ecsy-two.js'


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
            this.layer_order.forEach(layer => {
                let children = this.layer_index[layer.name]
                if(children) children.forEach(ch => ch.draw(ctx))
            })
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


export class DrawFilledrect {
    constructor(bounds,color) {
        this.bounds = bounds
        this.color = color
    }
    draw(ctx) {
        ctx.fillStyle = this.color
        ctx.fillRect(this.bounds.x,this.bounds.y,this.bounds.width,this.bounds.height)
    }
}
export class DrawImage {
    constructor(bounds, image) {
        this.bounds = bounds
        this.image = image
    }
    draw(ctx) {
        if(this.image) {
            ctx.save()
            ctx.translate(this.bounds.x,this.bounds.y)
            ctx.drawImage(this.image, 0, 0)
            ctx.restore()
        }

    }
}
