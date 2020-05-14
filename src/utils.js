
export function make_point(tx, ty) {
    return {
        x: tx,
        y: ty,
        div: function(s) {
            return make_point(this.x/s, this.y/s)
        }
    }
}
