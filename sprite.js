import {is_whitespace} from './tiles.js'

export function make_player_sprite(width,height,palette,data) {
    let canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    let ctx = canvas.getContext('2d')

    let x = 0
    let y = 0
    for (let i=0; i<data.length; i++) {
        let ch = data[i]
        if(is_whitespace(ch)) continue
        let n = parseInt(ch,16)
        ctx.fillStyle = palette[n]
        ctx.fillRect(x,y,1,1)
        x = x + 1
        if( x >= width) {
            x = 0
            y = y + 1
        }
    }
    return canvas
}
