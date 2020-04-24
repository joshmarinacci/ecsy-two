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
class Bricks extends Component {
    constructor() {
        super();
        this.rowCount = 3
        this.columnCount = 5
        this.width = 75
        this.height = 20
        this.padding = 10
        this.offsetTop = 30
        this.offsetLeft = 30
        this.bricks = []
        for(let c=0; c<this.columnCount; c++) {
            this.bricks[c] = []
            for(let r=0; r<this.rowCount; r++) {
                this.bricks[c][r] = { x:0, y: 0, status: 1}
            }
        }
    }
}

class BreakoutInput extends System {
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
    }
}
BreakoutInput.queries = {
    canvas: {
        components:[Canvas]
    },
    paddle: {
        components: [Paddle, SpriteLocation],
        listen: {
            added:true
        }
    },
    input: {
        components: [KeyboardState, InputState]
    },
}

class BreakoutLogic extends System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            //initial paddle position
            this.queries.paddle.added.forEach(ent => {
                let paddle = ent.getComponent(Paddle)
                let loc = ent.getComponent(SpriteLocation)
                loc.x = (canvas.width - paddle.width) / 2
            })

            this.queries.ball.results.forEach(ent => {
                let ball = ent.getComponent(Ball)
                let bloc = ent.getComponent(SpriteLocation)
                this.queries.paddle.results.forEach(ent => {
                    let paddle = ent.getMutableComponent(Paddle)
                    let ploc = ent.getMutableComponent(SpriteLocation)
                    if (bloc.y + ball.dy < ball.radius) {
                        ball.dy = -ball.dy
                    } else if (bloc.y + ball.dy > canvas.height - ball.radius) {
                        if (bloc.x > ploc.x && bloc.x < ploc.x + paddle.width) {
                            ball.dy = -ball.dy
                        } else {
                            console.log('GAME OVER')
                        }
                    }
                    if (bloc.x + ball.dx > canvas.width - ball.radius || bloc.x + ball.dx < ball.radius) {
                        ball.dx = -ball.dx
                    }
                })

                bloc.x += ball.dx
                bloc.y += ball.dy

                this.queries.bricks.results.forEach(ent => {
                    let bricks = ent.getMutableComponent(Bricks)
                    this.brickCollisionDetection(ball, bloc, bricks)
                })
            })
        })
    }
    brickCollisionDetection(ball, bloc, bricks) {
        for(let c=0; c<bricks.columnCount; c++) {
            for(let r=0; r<bricks.rowCount; r++) {
                let b = bricks.bricks[c][r]
                if(b.status === 1) {
                    if (bloc.x > b.x
                        && bloc.x < b.x + bricks.width
                        && bloc.y > b.y
                        && bloc.y < b.y + bricks.height) {
                        ball.dy = -ball.dy;
                        b.status = 0
                    }
                }
            }
        }
    }
}
BreakoutLogic.queries = {
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
    },
    bricks: {
        components: [Bricks]
    }
}


class BreakoutRenderer extends  System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            this.queries.ball.results.forEach(ent => {
                let ball = ent.getComponent(Ball)
                let bloc = ent.getComponent(SpriteLocation)
                this.drawBall(ctx,ball,bloc)
            })
            this.queries.paddle.results.forEach(ent => {
                let paddle = ent.getComponent(Paddle)
                let loc = ent.getComponent(SpriteLocation)
                this.drawPaddle(canvas, ctx,paddle,loc)
            })
            this.queries.bricks.results.forEach(ent => {
                let bricks = ent.getComponent(Bricks)
                this.drawBricks(ctx,bricks)
            })
        })
    }
    drawBricks(ctx, bricks) {
        for(let c=0; c<bricks.columnCount; c++) {
            for(let r=0; r<bricks.rowCount; r++) {
                if(bricks.bricks[c][r].status === 1) {
                    let brickX = (c * (bricks.width + bricks.padding)) + bricks.offsetLeft
                    let brickY = (r * (bricks.height + bricks.padding)) + bricks.offsetTop
                    bricks.bricks[c][r].x = brickX;
                    bricks.bricks[c][r].y = brickY;
                    ctx.beginPath()
                    ctx.rect(brickX, brickY, bricks.width, bricks.height)
                    ctx.fillStyle = '#0095dd'
                    ctx.fill()
                    ctx.closePath()
                }
            }
        }
    }

    drawBall(ctx, ball, bloc) {
        ctx.save()
        ctx.beginPath()
        ctx.arc(bloc.x, bloc.y, ball.radius, 0, Math.PI * 2)
        ctx.fillStyle = '#0095DD'
        ctx.fill()
        ctx.closePath()
        ctx.restore()
    }

    drawPaddle(canvas, ctx, paddle, loc) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(loc.x, canvas.height - paddle.height, paddle.width, paddle.height)
        ctx.fillStyle = '#0095dd'
        ctx.fill()
        ctx.closePath()
        ctx.restore()
    }
}
BreakoutRenderer.queries = {
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
    },
    bricks: {
        components: [Bricks]
    }
}

world.registerSystem(BreakoutInput)
world.registerSystem(BreakoutLogic)
world.registerSystem(BreakoutRenderer)
world.registerSystem(KeyboardSystem)


let game = world.createEntity()
game.addComponent(Canvas, { width: 480, height: 320, pixelMode:false})
game.addComponent(BackgroundFill, {color: 'grey'})
game.addComponent(Bricks)



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

