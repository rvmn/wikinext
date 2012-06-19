/*
 * GET home page.
 */

var Deferred = require('jsdeferred').Deferred;
var jQuery = require('jquery');

var formidable = require('formidable'),
    util = require('util');

var fs = require('fs');

var path = require('path');

//var encoder = require('../lib/encoderHTML');
var crypto = require('crypto');
var _ = require('underscore');

var winston = require('winston');
//winston.add(winston.transports.File, { filename: 'debug.log' });

module.exports = function (dao) {
    return {
        index:function (req, res) {
            dao.pages.findAll().next(function (pages) {
                res.render('index.html', {
                    locals:{
                        title:'WikiNEXT V2',
                        auth:req.session.auth,
                        login:req.session.auth ? false : true,
                        pages:pages
                    }});
            });

        },
        wiki:function (req, res) {
            //console.log(req.session);
            dao.pages.findById(req.params.id).next(function (page) {
                if (typeof page['created_at'] != 'undefined')
                    page['created_at'] = new Date(page['created_at']).toDateString();
                if (typeof page['last_modified_at'] != 'undefined')
                    page['last_modified_at'] = new Date(page['last_modified_at']).toDateString();
                res.render('wiki.html', {
                    locals:{
                        title:'WikiNEXT V2',
                        auth:req.session.auth,
                        login:req.session.auth ? false : true,
                        page:page
                    }});
            });

        },
        create:function (req, res) {
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                winston.info('Session', req.session.auth);
                if (typeof req.body['page_name'] !== "undefined")
                    data['title'] = req.body.page_name;
                else
                    data.title = "new page";
                dao.users.findById(data.userid, function (error, result) {
                    data.created_by = {
                        name : result.name
                    };
                    dao.pages.insert(data, function (error, result) {
                        if (error != undefined)
                            console.log("Got an error: " + error);
                        //console.log(result);
                        //console.log(result[0]._id);
                        res.redirect("/wiki/" + result[0]._id + "/edit");
                        //console.log(result);
//                    datalog.userid = data.userid;
//                    datalog.page_info = {};
//                    datalog.page_info.id = result[0]._id;
//                    datalog.page_info.title = data.title;
//                    datalog.pageid = datalog.page_info.id;
//                    datalog.action = "create";
//                    datalog.date = new Date();
                        //console.log(datalog);
//                    dao.users.findById(data.userid, function (error, r) {
//                        datalog.user_info = {};
//                        datalog.user_info.name = r.name;
//                        logs.insert(db, datalog, function (error, r) {
//                            if (error != undefined)
//                                console.log("Got an error: " + error);
//
//                        });
//                    });

                    });
                });
            } else {
                res.redirect("/");
            }
        },
        edit:function (req, res) {
            //console.log("edit");
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                dao.users.findById(data.userid, function (error, result) {
                    data.last_modified_by = {
                        name: result.name
                    };
                    dao.pages.findById(req.params.id).next(function (page) {
//                        if (page.attach instanceof Array) {
//                            var index = 0;
//                            page.attach.forEach(function (item) {
//                                item['index'] = index;
//                                index++;
//                            })
//                        }
                        res.render('edit.html', {
                            locals:{
                                title:'WikiNEXT V2',
                                auth:req.session.auth,
                                login:req.session.auth ? false : true,
                                page:page
                            }});
                    });
                });
            } else {
                res.redirect("/");
            }
        },
        upload:function (req, res) {
            if (req.session.auth) {
                //var data = {};
                //data.userid = req.session.auth.userId;
                //console.log(data.userid);
                //dao.users.findById(data.userid, function (error, result) {
//                    if (error != null)
//                        console.log(error);
//                    var username = result.name;
                    if (req.xhr) {
                        var fName = req.header('x-file-name');
                        var fSize = req.header('x-file-size');
                        var fType = req.header('x-file-type');
                        var pageid = req.header('x-page-id');
                        var path_upload = __dirname + '/../public/upload/';
                        if (!path.existsSync(path_upload + pageid)) {
                            fs.mkdirSync(path_upload + pageid);
                        }

                        var ws = fs.createWriteStream(path_upload + pageid + '/' + fName);

                        req.on('data', function (data) {
                            console.log('data arrived');
                            ws.write(data);
                        });
                        req.on('end', function () {
                            console.log("finished");
                            res.writeHead(200, { 'Content-Type':'application/json' });
                            res.end(JSON.stringify({
                                success:true
                            }));
                            dao.pages.attachFile(pageid, {"index": crypto.createHash('md5').update(fName).digest("hex")  ,"path":'upload/' + pageid, "type":fType, "name":fName, "uploaded_at":new Date()}, function (data) {
                                if (data != null)
                                    console.log(data);
                                else
                                    console.log("information to db was successfully added")
                            });
                        });
                    }
                //});
            }
        },
        save:function (req, res) {
            if (req.session.auth) {
                var data = {};
                data.userid = req.session.auth.userId;
                dao.users.findById(data.userid, function (error, result) {
                    data['_id'] = req.params.id;
                    if (typeof req.body['article'] !== "undefined")
                        data['article'] = req.body.article;
                    if (typeof req.body['app'] !== "undefined")
                        data['app'] = req.body.app;
                    if (typeof req.body['title'] !== "undefined")
                        data['title'] = req.body.title;
                    data['last_modified_by'] = result.name;
                    data['last_modified_at'] = new Date();

                    dao.pages.update(data, function (error, result) {
                        if (error != undefined)
                            console.log("Got an error: " + error);
                        var version = {
                            article: result.article,
                            app: result.app,
                            title: result.title,
                            version: result.version,
                            saved_by: data['last_modified_by'],
                            saved_at: new Date()
                        };
                        dao.pageversions.insert(req.params.id, data.userid, version,function(error, result){
                            res.send({status:"ok"});
                        });

                    });

                });
            }
        },
        deleteattach:function (req, res) {
            var index = req.body.index;
            var pageid = req.body.pageid;
            dao.pages.findById(pageid).next(function (page) {
//                if (page.attach instanceof Array) {

                        //console.log("page was found");
                        var i = 0;
                        while(page.attach[i].index != index){
                            i++;
                        }
                        var path_upload = __dirname + '/../public/upload/';
                        if (path.existsSync(path_upload + pageid)) {
                            //console.log("directory exists");
                            var filepath = path_upload + pageid + '/' + page.attach[i].name;
                            if (path.existsSync(filepath)){
                                //console.log("delete "+filepath);
                                fs.unlinkSync(filepath);
                            }
                        }

                        dao.pages.deattachFile(pageid, index, function (data) {
                            if (data != null) {
                                //console.log(data);
                                res.send({status:"ko",error:data});
                            }
                            else {
                                //console.log("information in db was successfully updated")
                                res.send({status:"ok"});
                            }
                        });
//                }
            });
        }

    };
};
//
//exports.index = function(req, res){
//    //console.log(req.session);
//
//};
//
//exports.page = function(req, res){
//
//};