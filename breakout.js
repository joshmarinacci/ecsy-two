// josh@josh.earth adapted this tutorial from
// https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript/Create_the_Canvas_and_draw_on_it

import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
import {BackgroundFill, Canvas, ECSYTwoSystem, SpriteLocation, startWorld} from './ecsytwo.js'
import {InputState, KeyboardState, KeyboardSystem} from './keyboard.js'

let world = new World()
world.registerSystem(ECSYTwoSystem)

class Ball extends Component {
    constructor() {
        super();
        this.dx = 2
        this.dy = -2
        this.radius = 10
    }
}
class Paddle extends Component {
    constructor() {
        super()
        this.height = 10
        this.width = 75
    }
}
class BreakoutSystem extends System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)

            //move the paddle based on input
            this.queries.input.results.forEach(ent => {
                let input = ent.getComponent(InputState)
                this.queries.paddle.results.forEach(ent => {
                    let paddle = ent.getMutableComponent(Paddle)
                    let loc = ent.getMutableComponent(SpriteLocation)
                    if (input.states.left) {
                        loc.x -= 7
                        if (loc.x < 0) {
                            loc.x = 0
                        }
                    }
                    if (input.states.right) {
                        loc.x += 7
                        if (loc.x + paddle.width > canvas.width) {
                            loc.x = canvas.width - paddle.width
                        }
                    }
                })
            })
        })

        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)

            //initial paddle position
            this.queries.paddle.added.forEach(ent => {
                let paddle = ent.getComponent(Paddle)
                let loc = ent.getComponent(SpriteLocation)
                loc.x = (canvas.width - paddle.width)/2
            })

            this.queries.ball.results.forEach(ent => {
                let ball = ent.getComponent(Ball)
                let bloc = ent.getComponent(SpriteLocation)
                this.queries.paddle.results.forEach(ent => {
                    let paddle = ent.getMutableComponent(Paddle)
                    let ploc = ent.getMutableComponent(SpriteLocation)
                    if(bloc.y + ball.dy < ball.radius) {
                        ball.dy = -ball.dy
                    } else if (bloc.y + ball.dy > canvas.height - ball.radius) {
                        if(bloc.x > ploc.x && bloc.x < ploc.x + paddle.width) {
                            ball.dy = -ball.dy
                        } else {
                            console.log('GAME OVER')
                        }
                    }
                    if(bloc.x + ball.dx > canvas.width - ball.radius || bloc.x + ball.dx < ball.radius) {
                        ball.dx = -ball.dx
                    }
                })

                bloc.x += ball.dx
                bloc.y += ball.dy


                let ctx = canvas.dom.getContext('2d')
                ctx.save()
                ctx.beginPath()
                ctx.arc(bloc.x,bloc.y,ball.radius,0,Math.PI*2)
                ctx.fillStyle = '#0095DD'
                ctx.fill()
                ctx.closePath()
                ctx.restore()
            })

            this.queries.paddle.results.forEach(ent => {
                let paddle = ent.getComponent(Paddle)
                let loc = ent.getComponent(SpriteLocation)
                let ctx = canvas.dom.getContext('2d')
                ctx.save()
                ctx.beginPath()
                ctx.rect(loc.x, canvas.height-paddle.height, paddle.width, paddle.height)
                ctx.fillStyle = '#0095dd'
                ctx.fill()
                ctx.closePath()
                ctx.restore()
            })
        })
    }
}
BreakoutSystem.queries = {
    canvas: {
        components:[Canvas]
    },
    ball: {
        components:[Ball, SpriteLocation]
    },
    paddle: {
        components: [Paddle, SpriteLocation],
        listen: {
            added:true
        }
    },
    input: {
        components: [KeyboardState, InputState]
    }
}

world.registerSystem(BreakoutSystem)
world.registerSystem(KeyboardSystem)


let game = world.createEntity()
game.addComponent(Canvas, { width: 480, height: 320, pixelMode:false})
game.addComponent(BackgroundFill, {color: 'grey'})



let ball = world.createEntity()
    ball.addComponent(Ball)
    ball.addComponent(SpriteLocation, { x: 100,  y: 100})

let paddle = world.createEntity()
    .addComponent(Paddle)
    .addComponent(SpriteLocation)

let input = world.createEntity()
    .addComponent(InputState)
    .addComponent(KeyboardState)

startWorld(world)

