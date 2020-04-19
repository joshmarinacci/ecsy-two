export function load_image_from_url(src) {
    return new Promise((res,rej)=>{
        let img = document.createElement('img')
        img.onload = ()=>  {
            console.log("Image Loaded ",src)
            res(img)
        }
        img.onerror =() => rej(img)
        img.src = src
    })
}

