# ecsy-two

A 2d game/app Entity Component System for HTML Canvas. 
Built on top of ECSY.io.  A companion lib for ECSY-three.

# Goals

* Entity Component System for 2D games / apps
* super easy to start with
* scales as your code gets better
* hooks for audio, images, animated sprites, tilemaps
* input from keyboard, mouse, gamepad, WebXR devices

# Non-goals

* being a full game engine
* being the fastest web renderer
* building visual tools
* creating publishing mechanism or app store hooks. It's just a webpage.


# Getting Started

Install the library ecsy-two library via npm or any of the other usual ways.  Also install ecsy. Create an HTML page
and import the `ecsytwo.js` module to start.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>My Rad Game</title>
</head>
<body>
<script type="module">
import {System, World, Component} from 'node_modules/ecsy/build/ecsy.module.js';
import {} from 'node_modules/ecsy-two/src/ecsy-two.js';


</script>
</body>
</html>
```

The following code makes a blue rectangle that you can move around with the keyboard.
```javascript
let world = new World();
let game = world.createEntity()
    .addComponent(Canvas, { width: 100, height: 100, scale: 3} )
    .addComponent(InputState)
    .addComponent(KeyboardState)

world.createEntity()
    .addComponent(Sprite, { x: 50, y: 50, width: 10, height: 10} )
    .addComponent(FilledSprite, { color: 'blue'})

world.registerSystem(EcsyTwoSystem)
world.registerSystem(SpriteSystem)
world.registerSystem(KeyboardSystem)

class MyGame extends System {
    execute(delta, time) {
        this.queries.input.results.forEach(ent => {
            let input = ent.getComponent(InputState)        
            this.queries.player.results.forEach(ent => {
                let player = ent.getComponent(Sprite);
                if(input.states.left)  player.x +=  -10       
                if(input.states.right) player.x +=  +10       
                if(input.states.up)    player.y +=  -10       
                if(input.states.down)  player.y +=  +10       
            })
        })    
    }
};
MyGame.queries = { 
    player: { components: [Sprite]},
    input: { components: [InputState]}, 
};
world.registerSystem(MyGame)
```
The above code first creates a new `world`. This is the global system. Everything in your app
will be tied to this world. If you want multiple apps in a single page you can have multiple worlds.

The first entity represents the playing area. Canvas will create an HTML canvas of the given logical width and
height. `scale` will scale up the canvas, so you can do retro pixel games. Set pixelMode:true to turn of the browser's
image smoothing.

The InputState is a set of booleans for different input values. By default it will have states for 
up, down, left, and right. The KeyboardState contains the state of actual keyboard keys.  KeyboardSystem will use
it's bindings to map keys to input states. The default binding uses arrow keys, but you can customize it. For
example, if you wanted to support WASD as well as arrow keys:

```javascript
some_entity.addComponent(KeyboardState, {
    mapping: {
        'w':'up',
        'a':'left',
        's':'down',
        'd':'right',
        'ArrowLeft':'left',
        'ArrowRight':'right',
        'ArrowUp':'up',
        'ArrowDown':'down',
    }
})
```

In ECSY Two the position and size of objects onscreen are separate from the actual visual presentation. 
The `Sprite` component is simply a drawable entity with x/y/weight/height bounds. It does not actually draw anything. 
To draw you need to attach a component like FilledSprite with a color. 
Other options include ImageSprite, AnimatedSprite, and CustomSprite.

To create behavior you need to create your own Systems. The system above moves the sprite around using 
the input state. The `execute` function of the `MyGame` system is called on every frame 
(typically 60 times per second).


## Additional Classes

The full docs are available here.  Components and Systems you may find interesting.


