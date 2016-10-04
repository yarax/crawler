var cheerio = require('cheerio');
var request = require('request');
var async = require('async');
var fs = require('fs');
var nodemailer = require('nodemailer');
var ids = {};
var dbFileName = "./ids.csv";

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
  if (!ids[id]) {
    ids[id] = 1;
    dumpDB();
    console.log("No in list", id);
    return false;
  }
  return true;
};

function send(message) {
  //request('http://bot.yarax.ru/send?chat=rax_test_group&message=' + message);
  console.log(message);
}

function loadDomByUrl(url, cb) {
  request(url, function (err, res, data) {
    if (err) {
      console.log(err);
      return;
    }
    var $ = cheerio.load(data);
    cb($);
  });
}

function getText(tag) {
  return tag.text();
}

function composeMessage(id, cb) {
  const url = `http://www.immobilienscout24.de/expose/${id}`;
  loadDomByUrl(url, ($) => {
    let balkon = 'no';
    let etage = 'unknown';
    let ab = 'unknown';
    let price = 'unknown';
    const tags = $('.boolean-listing span');
    tags.each(function (i, span){
      if (getText($(this)).match(/Balkon/)) {
        balkon = 'yes';
      }
    });

    const criteria = $('.print-two-columns dl');
    criteria.each(function (i, dl) {
      const dt = getText($(this).find('dt').first());
      const dd = getText($(this).find('dd').first());
      if (dt.match(/Etage/)) {
        etage = dd;
      }
      if (dt.match(/ezugsfrei/)) {
        ab = dd;
      }
      if (dt.match(/esamtmiete/)) {
        price = dd;
      }
    });
    const mes = `balkon: ${balkon}
etage: ${etage}
ab: ${ab}
price: ${price}
http://www.immobilienscout24.de/expose/${id}
  `;
    cb(null, mes);
  })
}

var allPages = function (page) {
  if (!page) page = 1;

  var startUrl = 'http://www.immobilienscout24.de/Suche/S-T/P-' + page + '/Wohnung-Miete/Hessen/Frankfurt-am-Main/-/2,50-/-/EURO--1100,00?pagerReporting=true';

  loadDomByUrl(startUrl, ($) => {
    var links = $('.result-list-entry__brand-title-container');
    links.each(function (i, link) {
      var href = link.attribs.href;
      if (href) {
        var id = href.replace("/expose/", "");
        console.log('Check id', id, (new Date()).toISOString());
        if (!checkExistence(id)) {
          composeMessage(id, (err, mes) => {
            if (err) return;
            send(mes);
          });
        }
      }
    });
    var nextLink = $('#pager_next a');
    if (nextLink.length) {
      allPages(page + 1);
    }

  });
};

readDB();
allPages()
setInterval(allPages, 3 * 60000);
