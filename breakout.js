// josh@josh.earth adapted this tutorial from
// https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript/Create_the_Canvas_and_draw_on_it





import {Component, System, World} from "./node_modules/ecsy/build/ecsy.module.js"
import {startWorld} from './ecsytwo.js'



let world = new World()
startWorld(world)
