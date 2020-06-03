import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {Camera, Canvas} from '../ecsy-two.js'
import {make_point} from '../utils.js'
import {load_image_from_url, SpriteSheet} from '../image.js'
import {LayerParent} from '../layer.js'

const FLIPPED_HORIZONTALLY_FLAG = 0x80000000;
const FLIPPED_VERTICALLY_FLAG   = 0x40000000;
const FLIPPED_DIAGONALLY_FLAG   = 0x20000000;
function is_flipped_horizontally(index) {
    return ((index & FLIPPED_HORIZONTALLY_FLAG) !== 0)
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
        this.src = null
        this.tilewidth = 16
        this.tileheight = 16
        this.width = -1
        this.height = -1
        this.layers = []
        this.index = []
        this.wall_types = []
    }
    tile_at(name, canvas_coords) {
        let layer = this.layer_by_name(name)
        let tile_coords = make_point(
            Math.floor(canvas_coords.x / this.tilewidth ),
            Math.floor(canvas_coords.y / this.tilewidth ),
        )
        if(layer && layer.type === 'tilelayer') return layer.data[tile_coords.y*this.width+tile_coords.x]
        return null
    }
    set_tile_at(layerIndex,coords,v) {
        return this.layer_by_name(layerIndex).data[coords.y*this.width+coords.x] = v
    }

    layer_by_name(name) {
        return this.layers.find(layer=>layer.name === name)
    }
}

export class TileMapSystem extends System {
    execute(delta, time) {
        this.queries.maps.added.forEach(ent => {
            let map = ent.getComponent(TileMap)
            let layer = ent.getComponent(LayerParent)
            layer.draw_object = {
                draw:(ctx)=>{
                    this.drawMap(map,ctx)
                }
            }
            if(map.src) {
                load_tilemap_from_url(map.src).then(json => {
                    Object.keys(json).forEach(key => {
                        map[key] = json[key]
                    })
                })
            }
        })
    }

    drawMap(map,ctx) {
        map.layers.forEach(layer => {
            if (layer.type === 'tilelayer') this.drawTileLayer(map, ctx, layer)
            if (layer.type === 'objectgroup') this.drawObjectLayer(map, ctx, layer)
        })
    }

    drawTileLayer(map, ctx, layer) {
        for(let y=0; y<layer.height; y++) {
            for(let x=0; x<layer.width; x++) {
                let n = y*layer.width+x
                let tile_index_raw = layer.data[n]
                let tile_index = (tile_index_raw & (~ (FLIPPED_HORIZONTALLY_FLAG | FLIPPED_VERTICALLY_FLAG | FLIPPED_DIAGONALLY_FLAG)))
                if (tile_index === 0) continue
                let tile = map.index[tile_index]
                if(!tile) console.error("missing tile " + tile_index + " " + tile)
                // if(!tile && tile_index < 1000) continue
                if(!tile) throw new Error("missing tile " + tile_index + " " + tile)
                if(tile)  {
                    ctx.save()
                    ctx.translate(x * map.tilewidth, y * map.tileheight)
                    if(is_flipped_horizontally(tile_index_raw)) {
                        ctx.scale(-1.0,1.0)
                        ctx.translate(-map.tilewidth,0)
                    }
                    ctx.drawImage(tile, 0,0)
                    ctx.restore()
                }
            }
        }
    }

    drawObjectLayer(map, ctx, layer) {
        layer.objects.forEach(obj => {
            if(obj.gid) {
                let tile = map.index[obj.gid]
                if(!tile) throw new Error("missing tile " + obj.gid + " " + tile)
                if(tile)  ctx.drawImage(tile,obj.x, obj.y-obj.height)
            }
        })
    }
}

TileMapSystem.queries = {
    screen: {
        components:[Canvas, Camera]
    },
    maps: {
        components:[TileMap, LayerParent],
        listen: {
            added:true,
            removed:true,
        }
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

export function load_tilemap_from_url(source) {
    let url = new URL(source, document.baseURI)
    // console.log("loading tilemap from ",url)
    return fetch(url).then(res=>res.json()).then(data => {
        let tile_index = []
        let blocking = []
        data.source = source
        return Promise.all(data.tilesets.map(tileset => {
            if(!tileset.image) {
                let msg = "tileset doesn't have an image. are you sure it's embedded"
                console.error(msg)
                return
                // throw new Error(msg)
            }
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
            // console.log("blocking is",blocking)
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
