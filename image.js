import {Component, System} from "./node_modules/ecsy/build/ecsy.module.js"

export class SpriteSheet {
    constructor(img,tw,th) {
        this.image = img
        this.tw = tw
        this.th = th
    }

    sprite_to_image(x, y) {
        let canvas = document.createElement('canvas')
        canvas.width = this.tw
        canvas.height = this.th
        let ctx = canvas.getContext('2d')
        ctx.drawImage(this.image,
            x*this.tw,
            y*this.th,
            this.tw,
            this.th,
            0,0,this.tw,this.th)
        return canvas
    }

    sprites_to_frames(x, y, w) {
        let arr = []
        for(let i=0; i<w; i++) {
            arr.push(this.sprite_to_image(x+i,y))
        }
        return arr
    }

    drawSpriteAt(ctx, tx, ty, cx, cy) {
        ctx.drawImage(this.image,
            tx*this.tw, ty*this.th, this.tw,this.th, // source x,y,w,h
            cx, cy, this.tw, this.th, // dest x,y,w,h
        )

    }
}
export function load_image_from_url(src) {
    return new Promise((res,rej)=>{
        let img = document.createElement('img')
        img.onload = ()=>  {
            console.log("Image Loaded ",src)
            res(img)
        }
        img.onerror =() => rej(img)
        img.src = src
    })
}
