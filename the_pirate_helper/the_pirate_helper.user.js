// ==UserScript==
// @name           The Pirate Helper
// @description    Enhances your pirating experience!
// @author         Noah Keller http://github.com/noahtkeller
// @version        6.1
// @namespace      github.com/noahtkeller
// @updateURL      https://raw.github.com/noahtkeller/GM_Scripts/the_pirate_helper/the_pirate_helper.meta.js
// @downloadURL    https://raw.github.com/noahtkeller/GM_Scripts/the_pirate_helper/the_pirate_helper.user.js
// @require        http://ajax.googleapis.com/ajax/libs/jquery/2.1.4/jquery.min.js
// @include        http*://thepiratebay.*
// @include        http*://www.imdb.*/title/tt*
// @grant          GM_xmlhttpRequest
// @run-at document-end
// @noframes
// ==/UserScript==

var use_json_cache = true;
var magnet_img = "data:image/gif;base64,R0lGODlhDAAMALMPAOXl5ewvErW1tebm5oocDkVFRePj47a2ts0WAOTk5MwVAIkcDesuEs0VAEZGRv///yH5BAEAAA8ALAAAAAAMAAwAAARB8MnnqpuzroZYzQvSNMroUeFIjornbK1mVkRzUgQSyPfbFi/dBRdzCAyJoTFhcBQOiYHyAABUDsiCxAFNWj6UbwQAOw==";
var cache_address = 'http://localhost:3000';

var browser = function (name) {
    var n = 'unknown';
    if (GM_info.scriptHandler === 'Tampermonkey')
        n = 'chrome';
    else if (typeof window.opera !== 'undefined')
        n = 'opera';
    else if (typeof GM_info.scriptWillUpdate === 'boolean')
        n = 'firefox';
    return typeof name === 'undefined' ? n : n === name;
};

var site = function (check) {
    var s = '';
    var f = ('' + document.location).split(/^http(s)?\:\/\/(www\.)?/)[3].split('/')[0];
    if (typeof f !== 'undefined')
        s = f.split(/\.[a-zA-Z](\.[a-zA-Z])?/)[0];
    else
        s = null;
    return typeof check === 'undefined' ? s : s === check;
};

var get_data = function (args) {

    if (args.headers === undefined)
        args.headers = {
            "Content-Type": "application/x-www-form-urlencoded"
        };

    args.post = typeof args.post === 'undefined' ? false : args.post;
    var post_data = '';
    if (typeof args.post === 'object')
        for (var d in args.post)
            post_data += (post_data === '' ? '' : '&') + d + '=' + encodeURIComponent(args.post[d]);

    GM_xmlhttpRequest({
        method: args.post === false ? 'GET' : 'POST',
        data: post_data,
        headers: args.headers,
        url: args.url,
        onload: function (rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            if (typeof args.onload === 'function')
                args.onload(xmlDoc, rD);
        },
        ontimeout: function (rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            if (typeof args.ontimeout === 'function')
                args.ontimeout(xmlDoc, rD);
        },
        onerror: function (rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            if (typeof args.onerror === 'function')
                args.onerror(xmlDoc, rD);
        }
    });
};

var scrapeMovie = function () {
    var genres = [];
    var genres_element = $('div.see-more:nth-child(10) a');
    for (var i = 0; i < genres_element.length; i++)
        genres.push($(genres_element[i]).text().trim());

    return {
        title: $($('h1.header span[itemprop="name"]')[0]).text().trim(),
        year: $($('#overview-top > h1 > span.nobr > a')[0]).text().trim(),
        imdbId: ('' + document.location).split('/title/')[1].split('/')[0].trim(),
        shortRating: $($('meta[itemprop="contentRating"]')[0]).attr('content').trim(),
        longRating: $($('span[itemprop="contentRating"]')[0]).text().trim(),
        imdbRating: $($('div.star-box-giga-star')[0]).text().trim(),
        description: $($('p[itemprop="description"]')[0]).text().trim(),
        releaseDate: $($('div.txt-block:nth-child(6)')[0]).text().split('Release Date: ')[1].split('\n')[0].trim(),
        director: $($('div[itemprop="director"] span[itemprop="name"]')[0]).text().trim(),
        poster: $('#img_primary > div:nth-child(1) > a:nth-child(1) > img:nth-child(1)')[0].src,
        runTime: $($('.infobar > time:nth-child(5)')[0]).text().trim(),
        country: $($('div.txt-block:nth-child(4) > a:nth-child(2)')[0]).text().trim(),
        language: $($('#titleDetails > div:nth-child(5) > a:nth-child(2)')[0]).text().trim(),
        genres: genres
    };
};


var addTorrents = function (torrents) {
    for (var i = 0; i < torrents.length; i++) {
        var torrent = torrents[i];
        $('<tr><td style="text-align: center;"><a href=\'' + torrent.magnet + '\'><img src=\'' + magnet_img + '\'/></a></td><td>' + torrent.name + '<br/><small>by: ' + (torrent.uploader || '<i>Anonymous</i>') + '</small></td><td style="text-align: center;">' +
            torrent.seeds + '</td><td style="text-align: center;">' + torrent.leeches + '</td></tr>').appendTo('div#torrentResults table');
    }
};

var getTorrents = function (movieData) {
    if (use_json_cache) {
        get_data({
            url: cache_address + '/api/movie/' + movieData.imdbId,
            onload: function (data, response) {
                if (response.status === 200) {
                    var responseObject = JSON.parse(response.responseText);
                    if (responseObject.torrents.length === 0)
                        scrapeTorrents(movieData);
                    else
                        addTorrents(responseObject.torrents);
                } else if (response.status === 404) {
                    scrapeTorrents(movieData);
                    sendMovieData(movieData);
                }
            }
        });
    } else
        scrapeTorrents(movieData);
};

var scrapeTorrents = function (movieData) {
    get_data({
        url: 'https://thepiratebay.am/search/' + movieData.title + ' ' + movieData.year + '/0/7/0',
        onload: function (data, text) {
            var results = $('table#searchResult tbody tr', text.response);
            var torrents = [];
            for (var i = 0; i < results.length; i++) {

                var result = $(results[i]);
                var info = $('td', result);

                var torrent = {
                    magnet: $('a[title="Download this torrent using magnet"]', info[1]).attr('href').trim(),
                    name: $('a.detLink', info[1]).text().trim(),
                    uploader: $('a.detDesc', info[1]).text().trim(),
                    seeds: $(info[2]).text().trim(),
                    leeches: $(info[3]).text().trim(),
                    identifier: $('a.detLink', info[1])[0].href.split('/torrent/')[1].split('/')[0].trim()
                };

                if (torrent.seeds > 0)
                    torrents.push(torrent);
            }
            if (use_json_cache)
                sendTorrentData(torrents, movieData);
            addTorrents(torrents);
        }
    });
};

var sendTorrentData = function(torrents, movieData) {
    torrents = JSON.stringify(torrents);
    get_data({
        post: {
            torrents: torrents,
            imdbId: movieData.imdbId
        },
        url: cache_address + "/api/movie/" + movieData.imdbId
    })
};

var sendMovieData = function (movieData) {
    get_data({
        post: movieData,
        url: cache_address + '/api/movie/' + movieData.imdbId
    })
};

if (site('imdb')) {
    var results = $('<div class="article" id="torrentResults"><table cellpaddng=".2em" cellspacing="0" width="100%"><tr><td style="width: 5%; font-weight: bold; color: red; text-align: center"><span onclick="$(\'#torrentResults\').hide();" style="cursor: pointer;">X</span></td><td style="width: 85%;">Title</td><td style="text-align: center; width: 5%;">S</td><td style="text-align: center;">L</td></tr></table></div>');
    results.hide();
    results.insertBefore('div.title-overview');
    var mag_img = $('<img style="cursor: pointer;" src=\'' + magnet_img + '\'/>');
    mag_img.click(function () {
        $('#torrentResults').toggle();
    });
    $('div.infobar').prepend('&nbsp;&nbsp;<span class="ghost">|</span>');
    $('div.infobar').prepend(mag_img);
    getTorrents(scrapeMovie());
} else if (site('thepiratebay')) {
    $('div#main-content').css('margin', 0);
}