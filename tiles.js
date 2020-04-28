import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"
import {Camera, Canvas} from './ecsytwo.js'
import {make_point} from './utils.js'
import {load_image_from_url, SpriteSheet} from './image.js'

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


export function make_bounds(x, y, width, height) {
    return {
        x:x,
        y:y,
        width:width,
        height:height,
        type:'screen'
    }
}


export class TileMap extends Component {
    constructor() {
        super();
        this.tileSize = 16
        this.width = -1
        this.height = -1
        this.layers = []
        this.index = []
        this.wall_types = []
    }
    tile_at(name, canvas_coords) {
        let layer = this.layer_by_name(name)
        let tile_coords = make_point(
            Math.floor(canvas_coords.x / this.tileSize ),
            Math.floor(canvas_coords.y / this.tileSize ),
        )
        if(layer && layer.type === 'tilelayer') return layer.data[tile_coords.y*this.width+tile_coords.x]
        return null
    }
    set_tile_at(layerIndex,coords,v) {
        return this.layer_by_name(layerIndex).data[coords.y*this.width+coords.x] = v
    }
    // collide_bounds(bounds, types) {
    //     let cols = []
    //
    //     {
    //         // upper left
    //         let coords = {
    //             x: Math.floor(bounds.x / this.tileSize),
    //             y: Math.floor(bounds.y / this.tileSize),
    //         }
    //         let tile = this.tile_at(coords);
    //         if (types.indexOf(tile) >= 0) {
    //             cols.push(this.make_collision(tile, coords))
    //         }
    //     }
    //
    //     {
    //         // lower left
    //         let coords = {
    //             x: Math.floor(bounds.x / this.tileSize),
    //             y: Math.floor((bounds.y+bounds.height) / this.tileSize),
    //         }
    //         let tile = this.tile_at(coords);
    //         if (types.indexOf(tile) >= 0) {
    //             cols.push(this.make_collision(tile, coords))
    //         }
    //     }
    //
    //     {
    //         // upper right
    //         let coords = {
    //             x: Math.floor((bounds.x+bounds.width) / this.tileSize),
    //             y: Math.floor((bounds.y) / this.tileSize),
    //         }
    //         let tile = this.tile_at(coords);
    //         if (types.indexOf(tile) >= 0) {
    //             cols.push(this.make_collision(tile, coords))
    //         }
    //     }
    //     {
    //         //lower right
    //         let coords = {
    //             x: Math.floor((bounds.x+bounds.width) / this.tileSize),
    //             y: Math.floor((bounds.y+bounds.height) / this.tileSize),
    //         }
    //         let tile = this.tile_at(coords);
    //         if (types.indexOf(tile) >= 0) {
    //             cols.push(this.make_collision(tile, coords))
    //         }
    //     }
    //     return cols
    // }

    // make_collision(tile, coords) {
    //     return {
    //         type:'collision',
    //         tile_type:tile,
    //         tile_coords:coords,
    //     }
    // }
    layer_by_name(name) {
        return this.layers.find(layer=>layer.name === name)
    }
}

export class TileMapSystem extends System {
    execute(delta, time) {
        this.queries.maps.results.forEach(ent => {
            let map = ent.getComponent(TileMap)
            this.queries.screen.results.forEach(ent => {
                let canvas = ent.getComponent(Canvas)
                let camera = ent.getComponent(Camera)
                let ctx = canvas.dom.getContext('2d')
                ctx.imageSmoothingEnabled = !canvas.pixelMode
                ctx.save()
                ctx.scale(canvas.scale,canvas.scale)
                ctx.translate(
                    -camera.x + canvas.width/2,
                    -camera.y + canvas.height/2
                )
                map.layers.forEach(layer => {
                    if(layer.type === 'tilelayer') this.drawTileLayer(map, ctx, layer)
                    if(layer.type === 'objectgroup') this.drawObjectLayer(map, ctx, layer)
                })
                ctx.restore()
            })
        })
    }

    drawTileLayer(map, ctx, layer) {
        for(let y=0; y<layer.height; y++) {
            for(let x=0; x<layer.width; x++) {
                let n = y*layer.width+x
                let tile_index = layer.data[n]
                if (tile_index === 0) continue
                let tile = map.index[tile_index]
                if(!tile) throw new Error("missing tile " + tile_index + " " + tile)
                if(tile)  ctx.drawImage(tile,x*map.tilewidth, y*map.tileheight)
            }
        }
    }

    drawObjectLayer(map, ctx, layer) {
        layer.objects.forEach(obj => {
            if(obj.gid) {
                let tile = map.index[obj.gid]
                if(!tile) throw new Error("missing tile " + tile_index + " " + tile)
                if(tile)  ctx.drawImage(tile,obj.x, obj.y)
            }
        })
    }
}

TileMapSystem.queries = {
    screen: {
        components:[Canvas, Camera]
    },
    maps: {
        components:[TileMap],
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

export function load_tilemap_from_url(url) {
    url = new URL(url, document.baseURI)
    return fetch(url).then(res=>res.json()).then(data => {
        let tile_index = []
        let blocking = []
        return Promise.all(data.tilesets.map(tileset => {
            let imgurl = new URL(tileset.image, url)
            return load_image_from_url(imgurl).then(img => {
                let sheet = new SpriteSheet(img, tileset.tilewidth, tileset.tileheight)
                let start = tileset.firstgid
                for (let i = 0; i < tileset.tilecount; i++) {
                    tile_index[start] = sheet.sprite_to_image(
                        i % tileset.columns,
                        Math.floor(i / tileset.columns))
                    start++
                }
                if (tileset.tiles) {
                    tileset.tiles.forEach(tile => {
                        if (tile.type === 'floor') blocking.push(tile.id + tileset.firstgid)
                        if (tile.type === 'wall') blocking.push(tile.id  + tileset.firstgid)
                        if (tile.type === 'block') blocking.push(tile.id  + tileset.firstgid)
                    })
                }
            })
        })).then(()=>{
            data.index = tile_index
            data.wall_types = blocking
            return data
        })
    })
}

// export function load_tilemap(url,sheet) {
//     return fetch(url).then(res => res.json()).then(data => {
//         console.log("loaded tilemap: ",url)
//         console.log("data is ", data)
//         let ts = data.tilesets[0]
//         let TILE_MAP = {
//             width: data.width,
//             height: data.height,
//             data: data.layers[0].data
//         }
//
//         let TILE_INDEX = []
//         let start = ts.firstgid
//         for (let i = 0; i < ts.tilecount; i++) {
//             TILE_INDEX[start] = sheet.sprite_to_image(i % 8, Math.floor(i / 8))
//             start++
//         }
//         let blocking = []
//         if(ts.tiles) {
//             ts.tiles.forEach(tile => {
//                 if (tile.type === 'floor') blocking.push(tile.id + 1)
//                 if (tile.type === 'wall') blocking.push(tile.id + 1)
//                 if (tile.type === 'block') blocking.push(tile.id + 1)
//             })
//         }
//
//         // blocking = [2]
//         // console.log("blocking numbers are", blocking)
//         return {
//             name: url,
//             tileSize: ts.tilewidth,
//             width: TILE_MAP.width,
//             height: TILE_MAP.height,
//             map: TILE_MAP.data,
//             index: TILE_INDEX,
//             wall_types: blocking,
//         }
//     })
// }
