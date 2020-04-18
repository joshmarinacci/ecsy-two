import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Canvas} from './ecsytwo.js'

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
    }
    tile_at(x,y) {
        return this.map[y*this.width+x]
    }
    set_tile_at(x,y,v) {
        this.map[y*this.width+x] = v
    }
    sprite_intersects_tile_of(sprite, location, types) {
        let ul = this.tile_at(
            Math.floor(location.x/this.tileSize),
            Math.floor(location.y/this.tileSize),
        )
        if(types.indexOf(ul)>=0) return true
        let ll = this.tile_at(
            Math.floor(location.x/this.tileSize),
            Math.floor((location.y+sprite.height)/this.tileSize)
        )
        if(types.indexOf(ll)>=0) return true
        let ur = this.tile_at(
            Math.floor((location.x+sprite.width)/this.tileSize),
            Math.floor((location.y)/this.tileSize)
        )
        if(types.indexOf(ur)>=0) return true
        let lr = this.tile_at(
            Math.floor((location.x+sprite.width)/this.tileSize),
            Math.floor((location.y+sprite.height)/this.tileSize)
        )
        if(types.indexOf(lr)>=0) return true
        return false
    }
    tile_index_at_screen(x,y) {
        x = Math.floor(x/this.tileSize)
        y = Math.floor(y/this.tileSize)
        if(x<0) return -1
        if(y<0) return -1
        if(x>=this.width-1) return -1
        if(y>=this.height-1) return -1
        let tile = this.map[y*this.width+x]
        return tile
    }
}

export class TileMapSystem extends System {
    execute(delta, time) {
        this.queries.maps.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let map = ent.getComponent(TileMap)
            let ctx = canvas.dom.getContext('2d')
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
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
        components:[TileMap, Canvas],
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

