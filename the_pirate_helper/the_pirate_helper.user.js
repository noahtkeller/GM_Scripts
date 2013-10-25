// ==UserScript==
// @name           The Pirate Helper
// @description    Enhances your pirating experience!
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version        4.9
// @date           2013-10-20
// @source         http://userscripts.org/scripts/show/56244
// @identifier     http://userscripts.org/scripts/source/56244.user.js
// @author         Noah Keller
// @namespace      http://userscripts.org/people/105134
// @grant          GM_xmlhttpRequest
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_registerMenuCommand
// @include        *thepiratebay.sx/*
// @include        *imdb.*/title/tt*
// @include        *rottentomatoes.*
// @include        http*://www.watchfreemovies.ch/*
// @include        *tvmuse.eu/tv-shows/*/
// ==/UserScript==

var
        SCRIPT_VERSION = "4.9",
        ID = '56244',
        DATE = new Date(),
        $ = jQuery,
        parser = new DOMParser(),
        title_el = null,
        container = null,
        onIMDB = true,
        onRottenTomatoes = true,
        onThePirateBay = true,
        removeDead = true,
        title, year;

var isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0;
// Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
var isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
var isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0;
// At least Safari 3+: "[object HTMLElementConstructor]"
var isChrome = !!window.chrome && !isOpera;              // Chrome 1+
var isIE = /*@cc_on!@*/false || document.documentMode;

if ('MozBoxSizing' in document.documentElement.style) { // Updating is built into TamperMonkey
    function Update() {                                 // So this is just for GreaseMonkey
        GM_xmlhttpRequest({
            method: 'GET',
            url: "http://userscripts.org/scripts/show/56244",
            onload: function(responseDetails) {
                var
                        xmlDoc = $.parseHTML(responseDetails.responseText),
                        update_version = $($('.script_summary p', xmlDoc)[1]).html().split('</b>')[1].trim(),
                        su = GM_getValue('su', 'false');
                if (update_version !== SCRIPT_VERSION) {
                    if (confirm("Update needed for GreaseMonkey script The Pirate Helper, press 'Ok' to update, or 'Cancel' to ignore.")) {
                        document.location.href = "http://userscripts.org/scripts/source/56244.user.js";
                    }
                } else {
                    if (su === 'false') {
                        alert("No update necessary.");
                    }
                }
                GM_setValue('su', 'false');
            }
        });
    }
    GM_registerMenuCommand("Update The Pirate Helper", Update);
    lu = parseInt(GM_getValue('lu', '' + (DATE.getTime() - (24 * 60 * 60 * 1000) + 1)));
    if ((DATE.getTime() - lu) >= (24 * 60 * 60 * 1000)) {
        GM_setValue('su', 'true');
        GM_setValue('lu', '' + DATE.getTime());
        Update();
    }
}

lp = GM_getValue('lp', '0');
cp = '' + DATE.getMonth() + DATE.getFullYear();
if (lp !== cp) {

    GM_setValue('lp', cp);
    GM_xmlhttpRequest({
        method: 'GET',
        //url: "http://localhost:5580/report/" + ID,
        url: "http://192.241.151.71:5580/report/" + ID,
        onload: function(responseDetails) {
        }
    });
}

function get_tpb_search(string) {
    return "http://thepiratebay.sx/search/" + escape(string) + "/0/7/200";
}

function site(string) {
    return document.location.href.indexOf(string) !== -1;
}

function remove_dead_torrents(searchResult) {
    if (removeDead) {
        var seed_cells = $("tbody tr td:nth-child(3)", searchResult);
        for (var ccell in seed_cells) {
            console.log(ccell);
        }
    }
    return searchResult;
}

function fetch_results(otitle, oyear) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: get_tpb_search(oyear === false ? otitle : otitle + " " + oyear),
        onload: function(rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            var searchResult = $('#searchResult', xmlDoc);
            var numRows = $('tr', searchResult);
            console.log('loaded');
            if (numRows.length > 0) {
                console.log('More than 0 results');
                if (numRows.length > 5) {
                    console.log('More than 5 results...');
                    $('tbody tr:gt(4)', searchResult).remove();
                }
                $('tr.header', searchResult).css('background-color', '#E0E0E0');
                var headers = $('th', searchResult);
                console.info(headers);
                headers[0].innerHTML = 'Type';
                headers[1].innerHTML = 'Name';
                headers[2].innerHTML = 'S';
                headers[3].innerHTML = 'L';
                var res_links = $('a', searchResult);
                console.log(res_links);
                for (var i = 0; i < res_links.length; i++) {
                    var clink = $(res_links[i]);
                    if (clink.attr('href').indexOf('magnet') !== 0) {
                        clink.attr('href', 'http://thepiratebay.sx' + clink.attr('href'));
                        clink.attr('target', '_blank');
                    }
                }
                var res_images = $('img', searchResult);
                console.log(res_images);
                for (var i = 0; i < res_images.length; i++) {
                    var cimg = $(res_images[i]);
                    cimg.attr('src', 'http://thepiratebay.sx' + cimg.attr('src'));
                }
                var main;
                if (site('imdb')) {
                    main = $('#maindetails_center_top');
                    container = $('<div class="article title-overview"></div>');
                } else if (site('rottentomatoes')) {
                    main = $("[data-param='theater']");
                    container = $('<div class="content_box"></div>');
                } else if (site("tvmuse")) {
                    main = $("div#content");
                    container = $("<div></div>");
                }
                searchResult.append($('<tr><td>&nbsp;</td><td><a target="_blank" href="' + get_tpb_search(otitle + " " + oyear) + '">more results...</a></td></tr>'));
                searchResult.width('98%');
                searchResult.css('margin-left', '1%');
                container.append(searchResult);
                main.prepend(container);
            } else {
                console.info('No results...');
                title_el.append('<br/>No download results...');
            }
        }
    });
}

function get_streaming_location(title, year) {
    var search_url = 'http://www.watchfreemovies.ch/search/' + title.replace(/ /g, '-').toLowerCase() + '/';
    GM_xmlhttpRequest({
        method: 'GET',
        url: search_url,
        onload: function(rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            var items = $('.index_item', xmlDoc);
            for (var i = 0; i < items.length; i++) {
                var citem = $(items[i]);
                console.log('Searching item...');
                var title_string = $('h2', citem).html();
                var ntitle = title_string.split(' (')[0].trim();
                var link = $('a', citem).attr('href');
                var nyear = title_string.split(' (')[1].replace(/\s*(\(|\))/g, '').trim();
                console.log('new: ' + ntitle + ' | ' + 'old: ' + title + ' || new: ' + nyear + ' | ' + 'old: ' + year);
                if ((ntitle === title) && (nyear === year)) {
                    var link_el = $('<a>Stream For Free!</a>');
                    link_el.attr({
                        href: link,
                        target: '_blank'
                    });
                    title_el.append('<br/>', link_el);
                    break;
                }

            }
        }
    });
}

if (site("thepiratebay.sx") && onThePirateBay) {
    $('#sky-right').remove();
    $('iframe').remove();
    $('#tableHead .nohover').parent().remove();
    $('#searchResult').css('width', '100%');
    $('#main-content').css('margin-left', '0');
    $("[name='orderby']").val('7');
    remove_dead_torrents($('#searchResult'));
} else if (site('imdb') && site("/title/tt") && onIMDB) {
    if ($('#overview-top .infobar').html().indexOf('TV Series') === -1) {
        title = $("[itemprop='name']").html().trim();
        year = $('#overview-top h1.header a').html().trim();
        title_el = $('#overview-top h1.header .nobr');
        fetch_results(title, year);
        get_streaming_location(title, year);
    }
} else if (site("rottentomatoes.com/m/") && onRottenTomatoes) {
    var whole;
    title_el = $("[itemprop='name']");
    whole = title_el.html().split(' (');
    title = whole[0].trim();
    year = whole[1].replace(")", "").trim();
    fetch_results(title, year);
    get_streaming_location(title, year);
} else if (site("watchfreemovies.ch/watch-movies/")) {
    $('.stage_navigation').remove();
    $('.movie_info').remove();
    if (isChrome)
        $('img[title="Putlocker link"]').parent().parent().parent().parent().parent().remove();
    else
        $('img[title="Putlocker link"]').parent().parent().parent().parent().remove();
    $('.choose_tabs').nextAll().remove();
    $('.download_link').remove();
    $('.featured_movies').nextAll().remove();
    $('.featured_movies').remove();
    $('.col2').remove();
    $('.footer').remove();
    $('.header').remove();
    $('script').remove();
    $('div[id="movie"]').remove();
} else if (site("tvmuse.eu")) {
    if (site("/tv-shows/")) {
        title_el = $("h1.mb_0");
        title = title_el.children().html();
        fetch_results(title, false);
    }
}