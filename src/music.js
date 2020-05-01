import {Component, System} from "../node_modules/ecsy/build/ecsy.module.js"

let Tone = window.Tone

export class BackgroundNotes extends Component {
    constructor() {
        super();
        this.notes = "E4 B4"
        this.loop = true
    }
}

export class Notes extends Component {
    constructor() {
        super();
        this.notes = ["E3","B4"]
        this.noteLength = "4n"
    }
}

export class MusicSystem extends System {
    execute(delta, time) {
        this.queries.bg.added.forEach(ent => {
            let music = ent.getComponent(BackgroundNotes)
            const synth = (new Tone.Synth()).toMaster();
            let cb = (t,n)=>synth.triggerAttackRelease(n,'8n',t)
            let seq = new Tone.Sequence(cb, music.notes, "4n")
            seq.start()
            Tone.Transport.start()
        })
        this.queries.sounds.added.forEach(ent => {
            let music = ent.getComponent(Notes)
            const synth = (new Tone.Synth()).toMaster();
            let cb = (t,n)=>synth.triggerAttackRelease(n,'8n',t)
            let seq = new Tone.Sequence(cb, music.notes, music.noteLength)
            seq.loop = false
            seq.start()
            Tone.Transport.start()
        })
        this.queries.sounds.results.forEach(ent => {
            ent.removeComponent(Notes)
        })
    }
}

MusicSystem.queries = {
    bg: {
        components:[BackgroundNotes],
        listen:{
            added:true,
            removed:true,
        }
    },
    sounds: {
        components:[Notes],
        listen:{
            added:true,
        }
    }
}

// var partL = new Tone.Sequence(function(time, note){
//     synthL.triggerAttackRelease(note, "8n", time);
// }, ["E4", "F#4", "B4", "C#5", "D5", "F#4", "E4", "C#5", "B4", "F#4", "D5", "C#5"], "8n").start();
