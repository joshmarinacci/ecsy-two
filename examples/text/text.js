import {System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import ECSYTWO, {
    BackgroundFill, Canvas, Layer,
    Sprite,
    TextBox, CanvasFont, TextSystem, PixelFont
} from '../../build/ecsy-two.module.js'

let world = new World()
ECSYTWO.initialize(world)
world.registerSystem(TextSystem)


// setup the canvas
world.createEntity()
    .addComponent(Canvas, { width: 600, height: 600, pixelMode:true})
    .addComponent(BackgroundFill, {color: 'lightGray'})

world.createEntity()
    .addComponent(Sprite, { x:50, y: 100, width: 200, height: 50})
    .addComponent(TextBox, { text:"Left canvas font"})
    .addComponent(CanvasFont, { debug: true})

world.createEntity()
    .addComponent(Sprite, { x:50, y: 150, width: 200, height: 50})
    .addComponent(TextBox, { text:"right canvas font"})
    .addComponent(CanvasFont, { halign:'right', debug:true})

world.createEntity()
    .addComponent(Sprite, { x:50, y: 200, width: 200, height: 50})
    .addComponent(TextBox, { text:"center canvas font"})
    .addComponent(CanvasFont, { halign:'center', debug:true})


world.createEntity()
    .addComponent(Sprite, { x: 300, y:100, width: 200, height: 50})
    .addComponent(TextBox, { text:"Left pixel font", halign:'left'})
    .addComponent(PixelFont, { debug: true,
        src:"../platformer/fonts/cat prince@1.png",
        metrics_src:'../platformer/fonts/cat prince@1.json'
    })

world.createEntity()
    .addComponent(Sprite, { x: 300, y:150, width: 200, height: 50})
    .addComponent(TextBox, { text:"Right Pixel Font"})
    .addComponent(PixelFont, { debug: true,
        src:"../platformer/fonts/cat prince@1.png",
        metrics_src:'../platformer/fonts/cat prince@1.json',
        halign:'right',
    })
world.createEntity()
    .addComponent(Sprite, { x: 300, y:200, width: 200, height: 50})
    .addComponent(TextBox, { text:"center pixel font"})
    .addComponent(PixelFont, { debug: true,
        src:"../platformer/fonts/cat prince@1.png",
        metrics_src:'../platformer/fonts/cat prince@1.json',
        halign:'center',
    })

//start everything
ECSYTWO.start(world)
