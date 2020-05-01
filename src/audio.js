import {Component, System} from "../node_modules/ecsy/build/ecsy.module.js"

export class SoundEffect {
    constructor() {
        this.audio = null
        this.src = null
    }
}
export class PlaySoundEffect {

}
export class AudioSystem extends System {
    execute(delta, time) {
        this.queries.sound_effects.added.forEach(ent => {
            let effect = ent.getComponent(SoundEffect)
            if(effect.src && !this.audio) {
                effect.audio = new Audio()
                console.log("loading the audio",effect.src)
                effect.audio.addEventListener('loadeddata', () => {
                    console.log("loaded audio from src",effect.src)
                })
                effect.audio.src = effect.src
            }
        })
        this.queries.play.added.forEach(ent => {
            let sound = ent.getComponent(SoundEffect)
            sound.audio.play()
            ent.removeComponent(PlaySoundEffect)
        })
    }
}
AudioSystem.queries = {
    sound_effects: {
        components:[SoundEffect],
        listen: {
            added:true,
        }
    },
    play: {
        components:[SoundEffect, PlaySoundEffect],
        listen: {
            added:true,
        }
    }
}
