var cheerio = require('cheerio');
var request = require('request');
var async = require('async');
var fs = require('fs');
var nodemailer = require('nodemailer');
var ids = {};
var dbFileName = "./ids.csv";
var transporter = nodemailer.createTransport({
    service: 'Gmail',
    auth: {
        user: 'hello.body.bot@gmail.com',
        pass: 'tobydobolleh'
    }
});


var readDB = function () {
    var str = fs.readFileSync(dbFileName).toString();
    //console.log(str);
    if (!str) return;
    var data = str.split("\n");
    ids = data.reduce(function (prev, id) {
        if (!id) return prev;
        id = id.trim();
        prev[id] = 1;
        return prev;
    }, {});
};

var dumpDB = function () {
    var str = Object.keys(ids).reduce(function (prev, id) {
        prev = prev + id + "\n";
        return prev;
    }, '');
    fs.writeFile(dbFileName, str, function (err) {
        if (err) console.log(err);
    });
};

var checkExistence = function (id) {

    var mailOptions = {
        from: 'Fred Foo ✔ <hello.body.bot@yandex.com>', // sender address
        to: 'raxpost@gmail.com', // list of receivers
        subject: 'Immobilie new option', // Subject line
        text: 'http://www.immobilienscout24.de/expose/' + id
    };

    if (!ids[id]) {
        ids[id] = 1;
        dumpDB();
        console.log("No in list", id);
/*        transporter.sendMail(mailOptions, function(error, info){
            if(error){
                return console.log(error);
            } else {
                console.log('Message sent: ' + info.response);
            }
        });
*/
	request('http://bot.yarax.ru/immobilen?id=' + id);
    }

};

var allPages = function (page) {
    if (!page) page = 1;

    var startUrl = 'http://www.immobilienscout24.de/Suche/S-T/P-' + page + '/Wohnung-Miete/Hessen/Frankfurt-am-Main/-/2,50-/-/EURO--1100,00?pagerReporting=true';

    request(startUrl, function (err, res, data) {
        var $ = cheerio.load(data);
        var links = $('.result-list-entry__brand-title-container');
        links.each(function (i, link) {
            var href = link.attribs.href;
            if (href) {
                var id = href.replace("/expose/", "");
                console.log('Check id', id, (new Date()).toISOString());
                checkExistence(id);
            }
        });
        var nextLink = $('#pager_next a');
        if (nextLink.length) {
            allPages(page+1);
        }

    });
};

readDB();
allPages()
setInterval(allPages, 3*60000);
