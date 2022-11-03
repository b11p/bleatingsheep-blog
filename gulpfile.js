'use strict';

const GulpClient = require("gulp");
const Hexo = require("hexo");

GulpClient.task('generate', function (cb) {
    GulpClient.src('./node_modules/@waline/client/dist/waline.js')
        .pipe(GulpClient.dest('./source/scripts'));
    var hexo = new Hexo(process.cwd(), {});
    hexo.init().then(() => {
        return hexo.call('generate', {
            bail: true,
            force: true,
        }).then(() => {
            return hexo.exit();
        }).then(() => {
            return cb();
        }).catch(function (err) {
            console.log(err);
            hexo.exit(err);
            return cb(err);
        })
    })
});