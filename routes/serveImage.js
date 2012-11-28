
/*
 * GET home page.
 */

var settings = require('../settings');
var knox = require('knox');
var gm = require('gm').subClass({ imageMagick: true });
var Stream = require('stream');
var im = require('imagemagick');
var sha1 = require('sha1')
var async = require('async')
require('gm-buffer')

exports.serveImage = function(req, res){
    var path = req.param(0);
    var app = req.param('app');
    var client = knox.createClient(settings[app]);
    var size = req.param('size')
    var cachePath = '/cache_thumbserv/' + sha1(app+path+size);
    path = encodeURIComponent(path);
    size = size.split('x')

    async.series([
        function (callback) {
            client.headFile(cachePath, function(err, file) {
                console.log(path, file.statusCode)
                if(file.statusCode == 200) {
                    console.log('already cached', path)
                    callback('done');
                    res.redirect(301, client.http(cachePath))
                }
                else {
                    console.log('not cached', path)
                    callback(null);
                }
            });
        },
        function (callback) {
            console.log('getting file', path)
            client.getFile(path, function(err, file) {
                if(file.statusCode >= 400) {
                    callback(file.statusCode);
                    return;
                }
                console.log('got', path, 'processing')
                gm(file)
                .resize(size[0],size[1])
                .buffer(function (e, buffer) {
                    var headers = {
                        'Content-Type': file.headers['content-type'],
                        'x-amz-acl': 'public-read'
                    };
                    client.putBuffer(buffer, cachePath, headers, function (e, resp) {
                        res.redirect(301, client.http(cachePath))
                    });
                })
            });
        }]);
};
