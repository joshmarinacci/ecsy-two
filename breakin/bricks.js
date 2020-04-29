// adapted from
// https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript/Create_the_Canvas_and_draw_on_it

import {Component, System, World} from "../node_modules/ecsy/build/ecsy.module.js"
import {
    BackgroundFill,
    Canvas,
    DebugOutline,
    ECSYTwoSystem,
    ImageSprite,
    Sprite,
    SpriteSystem,
    startWorld
} from '../ecsytwo.js'
import {InputState, KeyboardState, KeyboardSystem} from '../keyboard.js'
import {MouseInputSystem, MouseState} from '../mouse.js'
import {SpriteSheet} from '../image.js'

let world = new World()
world.registerSystem(ECSYTwoSystem)

class Ball extends Component {
    constructor() {
        super();
        this.dx = 1
        this.dy = -1
        this.radius = 8
    }
}
class Paddle extends Component { }
class Bricks extends Component {
    constructor() {
        super();
        this.rowCount = 4
        this.columnCount = 12
        this.width = 16
        this.height = 16
        this.padding = 0
        this.offsetTop = 32
        this.offsetLeft = 32
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
class GameBoard {}

function clamp_between(x, lo, hi) {
    if(x < lo) return lo
    if(x > hi) return hi
    return x
}

class BricksInput extends System {
    execute(delta, time) {
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            this.queries.board.results.forEach(ent => {
                let board = ent.getComponent(Sprite)
                //move the paddle based on input
                this.queries.paddle.results.forEach(ent => {
                    let paddle = ent.getMutableComponent(Sprite)
                    this.queries.input.results.forEach(ent => {
                        let input = ent.getComponent(InputState)
                        if (input.states.left) {
                            paddle.x -= 7
                            if (paddle.x < board.left()) {
                                paddle.x = board.left()
                            }
                        }
                        if (input.states.right) {
                            paddle.x += 7
                            if (paddle.right() > board.right()) {
                                paddle.x = board.right() - paddle.width
                            }
                        }
                        paddle.y = board.bottom() - paddle.height
                        let mouse = ent.getComponent(MouseState)
                        if(time - mouse.lastTimestamp < 100) {
                            let relativeX = (mouse.clientX - canvas.dom.offsetLeft)/canvas.scale
                            if(relativeX > 0 && relativeX < canvas.width) {
                                paddle.x = relativeX - paddle.width/2
                                paddle.x = clamp_between(paddle.x, board.left(), board.right()-paddle.width)
                            }
                        }
                    })
                })
            })
        })
    }
}
BricksInput.queries = {
    canvas: { components:[Canvas] },
    board: { components: [GameBoard, Sprite]},
    paddle: { components: [Paddle, Sprite],  },
    input: {  components: [KeyboardState, InputState, MouseState] },
}

class BricksLogic extends System {
    execute(delta, time) {
        this.queries.board.results.forEach(ent => {
            let board = ent.getComponent(Sprite)
            //initial paddle position
            this.queries.paddle.added.forEach(ent => {
                let paddle = ent.getComponent(Sprite)
                paddle.x = board.left() + (board.width-paddle.width)/2
                paddle.y = board.bottom() - paddle.height
            })

            this.queries.ball.results.forEach(ent => {
                let ball = ent.getComponent(Ball)
                let ball_sprite = ent.getComponent(Sprite)
                this.queries.paddle.results.forEach(ent => {
                    let paddle = ent.getMutableComponent(Sprite)
                    this.check_paddle_hit(ball, ball_sprite, paddle)
                })
                this.check_bottom_hit(ball, ball_sprite, board)
                this.check_walls_hit(ball, ball_sprite, board)

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

    resetGame(board, ball, bloc) {
        bloc.x = board.width/2 + board.left()
        bloc.y = board.height-32
        ball.dx = 1
        ball.dy = -1
    }

    check_paddle_hit(ball, ball_sprite, paddle) {
        if(ball_sprite.intersects(paddle)) {
            ball.dy = -ball.dy
        }
    }

    check_bottom_hit(ball, ball_sprite, board) {
        if(ball_sprite.y + ball.dy > board.bottom()) {
            this.queries.gamestate.results.forEach(ent => {
                let lives = ent.getComponent(GameState)
                lives.lives--
                if(lives.lives === 0) {
                    console.log('GAME OVER')
                }else {
                    this.resetGame(board, ball, ball_sprite)
                }
            })
        }
    }

    check_walls_hit(ball, ball_sprite, board) {
        if (ball_sprite.left() + ball.dx < board.left()) {
            ball.dx = -ball.dx
            return
        }
        if (ball_sprite.right() + ball.dx > board.right()) {
            ball.dx = -ball.dx
            return
        }
        if (ball_sprite.top() + ball.dy < board.top()) {
            ball.dy = -ball.dy
            return
        }
    }
}
BricksLogic.queries = {
    board: {
        components: [GameBoard, Sprite]
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
    }
}


class BricksRenderer extends  System {
    execute(delta, time) {
        this.queries.bricks.added.forEach(ent => {
            let bricks = ent.getComponent(Bricks)
            if(bricks.sheet_src && !bricks.sheet) {
                bricks.sheet_img = new Image()
                bricks.sheet_img.onload = () => {
                    bricks.sheet = new SpriteSheet(bricks.sheet_img,16,16)
                }
                bricks.sheet_img.src = bricks.sheet_src
            }
        })
        this.queries.board.added.forEach(ent => {
            let board = ent.getComponent(GameBoard)
            if(board.sheet_src && !board.sheet) {
                board.sheet_img = new Image()
                board.sheet_img.onload = () => {
                    board.sheet = new SpriteSheet(board.sheet_img,16,16)
                }
                board.sheet_img.src = board.sheet_src
            }
        })
        this.queries.canvas.results.forEach(ent => {
            let canvas = ent.getComponent(Canvas)
            let ctx = canvas.dom.getContext('2d')
            ctx.save()
            ctx.scale(canvas.scale,canvas.scale)
            this.queries.board.results.forEach(ent => {
                this.drawBoard(canvas,ctx,ent)
            })
            this.queries.bricks.results.forEach(ent => {
                let bricks = ent.getComponent(Bricks)
                this.drawBricks(ctx,bricks)
            })
            this.queries.gamestate.results.forEach(ent => {
                let state = ent.getComponent(GameState)
                this.drawScore(ctx, state)
                this.drawLives(canvas, ctx, state)
            })
            this.queries.won.results.forEach(ent => {
                this.drawWinBanner(canvas, ctx)
            })
            ctx.restore()
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

                    if(bricks.sheet) {
                        bricks.sheet.drawSpriteAt(ctx,1,1,brickX, brickY)
                    }
                }
            }
        }
    }

    drawScore(ctx, score) {
        ctx.font = '16px Arial'
        ctx.fillStyle = "#0095dd"
        ctx.fillText('Score: ' + score.score, 8, 20)
    }

    drawWinBanner(canvas, ctx) {
        ctx.font = '16px Arial'
        ctx.fillStyle = "black"
        ctx.fillText('YOU WIN!', canvas.width/2 - 30, 20)
    }

    drawLives(canvas, ctx, lives) {
        ctx.font = '16px Arial'
        ctx.fillStyle = '#0095dd'
        ctx.fillText("Lives: " + lives.lives, canvas.width-65, 20)
    }

    drawBoard(canvas, ctx, ent) {
        let board = ent.getComponent(GameBoard)
        let bounds = ent.getComponent(Sprite)
        if(board.sheet) {
            for(let j=0; j<Math.floor(canvas.height/16); j++) {
                board.sheet.drawSpriteAt(ctx, 0, 0, 0, j*16)
                board.sheet.drawSpriteAt(ctx, 0, 0, Math.floor(canvas.width/16)*15, j*16)
            }
            for(let i=0; i<Math.floor(canvas.width/16); i++) {
                board.sheet.drawSpriteAt(ctx, 0, 0, i*16, 0)
            }
        }
    }
}
BricksRenderer.queries = {
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
        components: [KeyboardState, InputState]
    },
    bricks: {
        components: [Bricks],
        listen: {
            added:true
        }
    },
    board: {
        components: [GameBoard],
        listen: {
            added:true
        }
    },
    gamestate: {
        components: [GameState]
    },
    won: {
        components: [Won]
    },
}

world.registerSystem(BricksInput)
world.registerSystem(BricksLogic)
world.registerSystem(BricksRenderer)
world.registerSystem(KeyboardSystem)
world.registerSystem(MouseInputSystem)
world.registerSystem(SpriteSystem)

world.createEntity()
    .addComponent(Canvas, { width: 16*16, height: 16*14, pixelMode:true, scale: 2})
    .addComponent(BackgroundFill, {color: 'yellow'})
    .addComponent(GameState)

world.createEntity()
    .addComponent(GameBoard, { sheet_src: 'images/standard_bricks.png'})
    .addComponent(Sprite, { x: 16, y: 16, width: 16*14, height: 16*13})

world.createEntity()
    .addComponent(Ball)
    .addComponent(Sprite, { x: 100,  y: 100, width: 16, height: 16})
    .addComponent(ImageSprite, { src: 'images/standard_ball.png'})

world.createEntity()
    .addComponent(Paddle)
    .addComponent(Sprite, { x: 0, y: 100, width: 64, height: 16 })
    .addComponent(ImageSprite, { src: 'images/standard_paddle.png'})

world.createEntity()
    .addComponent(InputState)
    .addComponent(KeyboardState)
    .addComponent(MouseState)

world.createEntity()
    .addComponent(Bricks, { sheet_src: 'images/standard_bricks.png'})
startWorld(world)

