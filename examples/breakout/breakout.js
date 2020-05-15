// josh@josh.earth adapted this tutorial from
// https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript/Create_the_Canvas_and_draw_on_it

import {Component, System, World} from "../../node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill,
    Canvas,
    ECSYTwoSystem,
    InputState,
    Sprite,
    FilledSprite,
    startWorld,
    DebugOutline
} from '../../src/index.js'
import {KeyboardState, KeyboardSystem} from '../../src/keyboard.js'
import {MouseInputSystem, MouseState} from '../../src/mouse.js'
import {Layer, LayerRenderingSystem} from '../../src/layer.js'
import {CanvasFont, TextBox, TextSystem} from '../../src/extensions/text.js'
import ECSYTWO, {SpriteSystem, } from '../../src/index.js'

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
class Paddle extends Component { }
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
class GameState extends Component {
    constructor() {
        super();
        this.score = 0
        this.lives = 3
    }
}
class Won {}
class ScoreView {}
class LivesView {}

class TouchState extends Component {
    constructor() {
        super();
        this.clientX = 0
        this.clientY = 0
        this.lastTimestamp = 0
    }
}

class TouchInputSystem extends System {
    execute(delta, time) {
        this.queries.input.added.forEach(ent => {
            let touch = ent.getMutableComponent(TouchState)
            touch.moveHandler = (e) =>  {
                e.changedTouches.forEach(tch => {
                    touch.clientX = tch.clientX
                    touch.clientY = tch.clientY
                })
                touch.lastTimestamp = e.timeStamp
            }
            document.addEventListener('touchmove', touch.moveHandler, false)
        })
        this.queries.input.results.forEach(ent => {
            let touch = ent.getMutableComponent(TouchState)
        })
    }
}
TouchInputSystem.queries = {
    input: {
        components:[TouchState],
        listen: {
            added:true,
        }
    }
}

class BreakoutInput extends System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            //move the paddle based on input
            this.queries.paddle.results.forEach(ent => {
                let paddle = ent.getMutableComponent(Sprite)
                this.queries.input.results.forEach(ent => {
                    let input = ent.getComponent(InputState)
                    if (input.states.left) {
                        paddle.x -= 7
                        if (paddle.x < 0) {
                            paddle.x = 0
                        }
                    }
                    if (input.states.right) {
                        paddle.x += 7
                        if (paddle.x + paddle.width > canvas.width) {
                            paddle.x = canvas.width - paddle.width
                        }
                    }
                    let mouse = ent.getComponent(MouseState)
                    if(time - mouse.lastTimestamp < 100) {
                        let relativeX = mouse.clientX - canvas.dom.offsetLeft
                        if(relativeX > 0 && relativeX < canvas.width) {
                            paddle.x = relativeX - paddle.width/2
                        }
                    }
                    let touch = ent.getComponent(TouchState)
                    if(time - touch.lastTimestamp < 100) {
                        let relativeX = touch.clientX - canvas.dom.offsetLeft
                        if(relativeX > 0 && relativeX < canvas.width) {
                            paddle.x = relativeX - paddle.width/2
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
        components: [Paddle, Sprite],
        listen: {
            added:true
        }
    },
    input: {
        components: [KeyboardState, InputState, MouseState, TouchState]
    },
}

class BreakoutLogic extends System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            //initial paddle position
            this.queries.paddle.added.forEach(ent => {
                let paddle = ent.getComponent(Sprite)
                paddle.x = (canvas.width - paddle.width) / 2
            })

            this.queries.ball.results.forEach(ent => {
                let ball = ent.getComponent(Ball)
                let ball_sprite = ent.getComponent(Sprite)
                this.queries.paddle.results.forEach(ent => {
                    let paddle = ent.getMutableComponent(Sprite)
                    if (ball_sprite.y + ball.dy < ball.radius) {
                        ball.dy = -ball.dy
                    } else if (ball_sprite.y + ball.dy > canvas.height - ball.radius) {
                        if (ball_sprite.x > paddle.x && ball_sprite.x < paddle.x + paddle.width) {
                            ball.dy = -ball.dy
                        } else {
                            this.queries.gamestate.results.forEach(ent => {
                                let lives = ent.getComponent(GameState)
                                lives.lives--
                                if(lives.lives === 0) {
                                    console.log('GAME OVER')
                                }else {
                                    this.resetGame(canvas, ball, ball_sprite, paddle, paddle)
                                }
                            })
                        }
                    }
                    if (ball_sprite.x + ball.dx > canvas.width - ball.radius || ball_sprite.x + ball.dx < ball.radius) {
                        ball.dx = -ball.dx
                    }
                })

                ball_sprite.x += ball.dx
                ball_sprite.y += ball.dy

                this.queries.bricks.results.forEach(ent => {
                    let bricks = ent.getMutableComponent(Bricks)
                    this.queries.gamestate.results.forEach(ent => {
                        let score = ent.getMutableComponent(GameState)
                        this.brickCollisionDetection(ball, ball_sprite, bricks, score)
                    })
                })
            })
        })
        this.queries.gamestate.results.forEach(ent => {
            let state = ent.getMutableComponent(GameState)
            this.queries.scoreview.results.forEach(ent => {
                ent.getMutableComponent(TextBox).text = `Score ${state.score}`
            })
            this.queries.livesview.results.forEach(ent => {
                ent.getMutableComponent(TextBox).text = `Lives ${state.lives}`
            })
        })
    }
    brickCollisionDetection(ball, bloc, bricks, score) {
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
                        score.score += 1
                        if(score.score === bricks.rowCount * bricks.columnCount) {
                            this.world.createEntity().addComponent(Won)
                        }
                    }
                }
            }
        }
    }

    resetGame(canvas, ball, bloc, paddle, ploc) {
        bloc.x = canvas.width/2
        bloc.y = canvas.height-30
        ball.dx = 2
        ball.dy = -2
        ploc.x = (canvas.width - paddle.width) / 2
    }
}
BreakoutLogic.queries = {
    canvas: {
        components:[Canvas]
    },
    ball: {
        components:[Ball, Sprite]
    },
    paddle: {
        components: [Paddle, Sprite],
        listen: {
            added:true
        }
    },
    input: {
        components: [KeyboardState, InputState, MouseState]
    },
    bricks: {
        components: [Bricks]
    },
    gamestate: {
        components: [GameState]
    },
    scoreview: {
        components: [ScoreView, TextBox]
    },
    livesview: {
        components: [LivesView, TextBox]
    }
}


class BreakoutRenderer extends  System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            this.queries.ball.results.forEach(ent => {
                let ball = ent.getComponent(Ball)
                let bloc = ent.getComponent(Sprite)
                this.drawBall(ctx,ball,bloc)
            })
            this.queries.paddle.results.forEach(ent => {
                let paddle = ent.getComponent(Sprite)
                this.drawPaddle(canvas, ctx, paddle)
            })
            this.queries.bricks.results.forEach(ent => {
                let bricks = ent.getComponent(Bricks)
                this.drawBricks(ctx,bricks)
            })
            this.queries.won.results.forEach(ent => {
                this.drawWinBanner(canvas, ctx)
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

    drawPaddle(canvas, ctx, paddle) {
        ctx.save()
        ctx.beginPath()
        ctx.rect(paddle.x, canvas.height - paddle.height, paddle.width, paddle.height)
        ctx.fillStyle = '#0095dd'
        ctx.fill()
        ctx.closePath()
        ctx.restore()
    }

    drawWinBanner(canvas, ctx) {
        ctx.font = '16px Arial'
        ctx.fillStyle = "black"
        ctx.fillText('YOU WIN!', canvas.width/2 - 30, 20)
    }

}
BreakoutRenderer.queries = {
    canvas: {
        components:[Canvas]
    },
    ball: {
        components:[Ball, Sprite]
    },
    paddle: {
        components: [Paddle, Sprite],
        listen: {
            added:true
        }
    },
    input: {
        components: [KeyboardState, InputState]
    },
    bricks: {
        components: [Bricks]
    },
    gamestate: {
        components: [GameState]
    },
    won: {
        components: [Won]
    },
}

world.registerSystem(BreakoutRenderer)
ECSYTWO.initialize(world)
world.registerSystem(BreakoutInput)
world.registerSystem(BreakoutLogic)
world.registerSystem(TextSystem)
world.registerSystem(TouchInputSystem)

world.createEntity()
    .addComponent(Canvas, { width: 480, height: 320, pixelMode:false})
    .addComponent(BackgroundFill, {color: 'grey'})
    .addComponent(Bricks)
    .addComponent(GameState)

world.createEntity()
    .addComponent(Ball)
    .addComponent(Sprite, { x: 100,  y: 100})

world.createEntity()
    .addComponent(Paddle)
    .addComponent(Sprite, { width: 75, height: 20 })

world.createEntity()
    .addComponent(InputState)
    .addComponent(KeyboardState)
    .addComponent(MouseState)
    .addComponent(TouchState)

world.createEntity()
    .addComponent(Layer, { depth: 100, name:'overlay'})
let score_ent = world.createEntity()
    .addComponent(Sprite, { x: 20, y: 5, width: 200, height: 40})
    .addComponent(TextBox, { text: "score"})
    .addComponent(CanvasFont, { color: 'white', size: 20})
    .addComponent(ScoreView)
let lives_ent = world.createEntity()
    .addComponent(Sprite, { x: 320, y: 5, width: 150, height: 40})
    .addComponent(TextBox, { text: "lives"})
    .addComponent(CanvasFont, { color: 'white', size: 20, halign:'right'})
    .addComponent(LivesView)

startWorld(world)

