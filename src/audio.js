import {System} from "../node_modules/ecsy/build/ecsy.module.js"

export class SoundEffect {
    constructor() {
        this.audio = null
        this.src = null
    }
}
export class BackgroundMusic {
    constructor() {
        this.audio = null
        this.src = null
    }
}
export class PlaySoundEffect { }
export class AudioEnabled { }

export class AudioSystem extends System {
    init() {
        this.audioReady = false
        this.callbacks = []
        window.addEventListener('touchstart',()=> this.startAudio())
        window.addEventListener('touchend',()=> this.startAudio())
        window.addEventListener('click',()=> this.startAudio())
    }
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
        this.queries.music.added.forEach(ent => {
            this.whenReady(()=>this.start_background_music(ent))
        })
        this.queries.play.added.forEach(ent => {
            this.whenReady(()=>this.play_soundeffect(ent))
        })
    }

    whenReady(cb) {
        if(this.audioReady) {
            cb()
        } else {
            this.callbacks.push(cb)
        }
    }

    startAudio() {
        if(this.audioReady) return
        console.log("initing audio")
        this.audioReady = true
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (window.AudioContext) {
            this.context = new window.AudioContext();
            // Create empty buffer
            var buffer = this.context.createBuffer(1, 1, 22050);
            var source = this.context.createBufferSource();
            source.buffer = buffer;
            // Connect to output (speakers)
            source.connect(this.context.destination);
            // Play sound
            if (source.start) {
                source.start(0);
            } else if (source.play) {
                source.play(0);
            } else if (source.noteOn) {
                source.noteOn(0);
            }
        }
        this.world.createEntity().addComponent(AudioEnabled)
        this.callbacks.forEach(cb => cb())
        this.callbacks = null
        this.log("audio enabled")
    }
    log(str) {
        console.log("LOG: ",str)
        const sel = document.querySelector('#info-alert')
        if(sel) sel.innerHTML = str
    }

    start_background_music(ent) {
        let music = ent.getComponent(BackgroundMusic)
        if(music.src && !this.audio) {
            music.audio = new Audio()
            console.log("starting the background music")
            music.audio.loop = true
            console.log("loading the audio",music.src)
            music.audio.addEventListener('loadeddata', () => {
                console.log("loaded audio from src",music.src)
                music.audio.play()
            })
            music.audio.src = music.src
        }
    }

    play_soundeffect(ent) {
        let sound = ent.getComponent(SoundEffect)
        sound.audio.play()
        ent.removeComponent(PlaySoundEffect)
    }
}
AudioSystem.queries = {
    sound_effects: {
        components:[SoundEffect],
        listen: {
            added:true,
        }
    },
    music: {
        components:[BackgroundMusic],
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
