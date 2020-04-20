import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Camera, Canvas} from './ecsytwo.js'

export function make_tile(size, palette, data) {
    if(!palette || !palette.length) throw new Error("make_tile: palette must be an array of colors")
    if(!data || !data.length) throw new Error("make_tile: data must be a string of numbers")
    let canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    let ctx = canvas.getContext('2d')
    ctx.fillStyle = 'white'
    ctx.clearRect(0,0,size,size)

    let x = 0
    let y = 0
    let count = 0
    for (let i=0; i<data.length; i++) {
        let ch = data[i]
        if(is_whitespace(ch)) continue
        let n = parseInt(ch,16)
        ctx.fillStyle = palette[n]
        ctx.fillRect(x,y,1,1)
        x = x + 1
        count = count + 1
        if( x >= size) {
            x = 0
            y = y + 1
        }
    }
    if(count !== size*size) console.warn("pixel count less than width x height",count,size*size)
    return canvas
}
export function is_whitespace(ch) {
    if(ch === ' ') return true
    if(ch === '\t') return true
    if(ch === '\n') return true
    return false
}

export class TileMap extends Component {
    constructor() {
        super();
        this.tileSize = 16
        this.width = -1
        this.height = -1
        this.map = []
        this.index = []
        this.wall_types = []
    }
    tile_at(tile_coords) {
        return this.map[tile_coords.y*this.width+tile_coords.x]
    }
    set_tile_at(coords,v) {
        this.map[coords.y*this.width+coords.x] = v
    }
    collide_bounds(bounds, types) {
        let cols = []

        {
            // upper left
            let coords = {
                x: Math.floor(bounds.x / this.tileSize),
                y: Math.floor(bounds.y / this.tileSize),
            }
            let tile = this.tile_at(coords);
            if (types.indexOf(tile) >= 0) {
                cols.push(this.make_collision(tile, coords))
            }
        }

        {
            // lower left
            let coords = {
                x: Math.floor(bounds.x / this.tileSize),
                y: Math.floor((bounds.y+bounds.height) / this.tileSize),
            }
            let tile = this.tile_at(coords);
            if (types.indexOf(tile) >= 0) {
                cols.push(this.make_collision(tile, coords))
            }
        }

        {
            // upper right
            let coords = {
                x: Math.floor((bounds.x+bounds.width) / this.tileSize),
                y: Math.floor((bounds.y) / this.tileSize),
            }
            let tile = this.tile_at(coords);
            if (types.indexOf(tile) >= 0) {
                cols.push(this.make_collision(tile, coords))
            }
        }
        {
            //lower right
            let coords = {
                x: Math.floor((bounds.x+bounds.width) / this.tileSize),
                y: Math.floor((bounds.y+bounds.height) / this.tileSize),
            }
            let tile = this.tile_at(coords);
            if (types.indexOf(tile) >= 0) {
                cols.push(this.make_collision(tile, coords))
            }
        }
        return cols
    }

    make_collision(tile, coords) {
        return {
            type:'collision',
            tile_type:tile,
            tile_coords:coords,
        }
    }
}

export class TileMapSystem extends System {
    execute(delta, time) {
        this.queries.maps.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let camera = ent.getComponent(Camera)
            let map = ent.getComponent(TileMap)
            let ctx = canvas.dom.getContext('2d')
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            ctx.translate(
                -camera.x + canvas.width/2,
                -camera.y + canvas.height/2
            )
            for(let y=0; y<map.height; y++) {
                for(let x=0; x<map.width; x++) {
                    let n = y*map.width+x
                    let tile_index = map.map[n]
                    let tile = map.index[tile_index]
                    ctx.drawImage(tile,x*map.tileSize, y*map.tileSize)
                }
            }
            ctx.restore()
        })
    }
}

TileMapSystem.queries = {
    maps: {
        components:[TileMap, Canvas, Camera],
    }
}
export function make_map(width, height, data) {
    let nums = []
    for(let i=0; i<data.length; i++) {
        let ch = data[i]
        if(is_whitespace(ch)) continue
        nums.push(parseInt(ch,16))
    }
    return {
        width: width,
        height: height,
        data:nums,
    }
}

