/*

disable platformer physics
show splash image
wait for any button press
fade to black
load and setup tilemap
fade from black
animate in dialog
draws laid out text and border:  Cat Prince. We need your help!
wait for button press
draw dialog & wait:  Your grandfather the old Cat King has been kidnapped!
draw dialog & wait: Please rescue him
animate out dialog
enable platformer physics


addComponent(StateMachine, {states:[
    (machine)=>{
        PlatformerPhysics.enabled = false
        view.addComponent(SplashImage, { src:"imgs/splash.png"})
        view.addComponent(WaitForInput)
    },
    (machine) => {
        view.addComponent(TileMap, { src:"maps/level1.json" }),
        view.addComponent(FadeTransition, { direction:'in', duration: 0.5, color:'black' })
        view.addComponent(WaitForTime, { duration:0.5 })
    },
    (machine) => {
        view.addComponent(FadeTransition, { direction:'out', duration: 0.5, color:'black' })
        view.addComponent(WaitForTime, { duration:0.5 })
    },
    (machine) => {
        view.addComponent(Dialog, { text:"Cat Prince. We need your help!" })
        view.addComponent(WaitForInput)
    },
    (machine) => {
        view.addComponent(DialogTransition, { direction:'in' })
        view.addComponent(Dialog, { text:"Your grandfather the old Cat King has been kidnapped!" })
        view.addComponent(WaitForInput)
    },
    (machine) => {
        view.addComponent(Dialog, { text:"Please rescue him." })
        view.addComponent(WaitForInput)
    },
    (machine) => {
        view.addComponent(DialogTransition, { direction:'out' })
        view.addComponent(WaitForTime, {duration: 0.5})
    }),
    (machine) => {
        PlatformerPhysics.enabled = true
    }),

]})


*/
export class Dialog {

}
