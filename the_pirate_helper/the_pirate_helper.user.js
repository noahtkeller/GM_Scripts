// ==UserScript==
// @name           The Pirate Helper
// @description    Enhances your pirating experience!
// @author         Noah Keller http://github.com/noahtkeller
// @version        5.3
// @license        GPL
// @encoding       utf-8
// @icon           https://raw.github.com/reek/anti-adblock-killer/master/icon120x120.png
// @resource icon  https://raw.github.com/reek/anti-adblock-killer/master/icon48x48.png
// @namespace      http://github.com/noahtkeller
// @updateURL      https://userscripts.org/scripts/source/56244.meta.js
// @downloadURL    https://userscripts.org/scripts/source/56244.user.js
// @date           2013-12-26
// @source         http://userscripts.org/scripts/show/56244
// @identifier     http://userscripts.org/scripts/source/56244.user.js
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @require        https://raw.github.com/noahtkeller/GM_Scripts/master/userscripts.lib.js
// @include        http*://thepiratebay.*
// @include        http*://jntlesnev5o7zysa.onion/*
// @include        http*://194.71.107.80/*
// @include        http*://194.71.107.81/*
// @include        http*://www.imdb.*/title/tt*
// @include        http*://www.rottentomatoes.com/m/*
// @include        http*://www.watchfreeinhd.com/*
// @include        http*://watchfreeinhd.com/*
// @include        http*://109.201.134.230/streams*/*.mp4?*
// @include        http*://www.watchfreemovies.ch/*
// @include        http*://*tvmuse.eu/*/*/
// @grant          GM_xmlhttpRequest
// @grant          GM_setValue
// @grant          GM_getValue
// @grant          GM_info
// @grant          GM_registerMenuCommand
// @run-at document-end
// @noframes
// ==/UserScript==

if (GM_execute('TPH_SIG')) {
    init({
        section: "The Pirate Bay",
        options: {
            tpb_location: {
                default: 'thepiratebay.se',
                label: 'URL',
                type: 'text',
                onsave: function(d) {
                    return d.replace(/(http(s)?\:|\/|\\)/g, '');
                }
            },
            tpb_protocol: {
                label: 'Protocol',
                type: 'select',
                options: [
                    {
                        key: 'HTTP',
                        value: 'http'
                    },
                    {
                        key: 'HTTPS',
                        value: 'https'
                    }
                ],
                default: 'HTTPS',
                onsave: function(d) {
                    return d.toLowerCase();
                }
            },
            removeDead: {
                label: 'Remove dead torrents',
                type: 'check',
                default: true
            }
        }
    },
    {
        section: "Watch Free In HD",
        options: {
            direct_video: {
                label: 'Direct video link',
                type: 'check',
                default: true
            },
            auto_accept: {
                label: 'Auto',
                type: 'check',
                default: true
            },
            key: {
                nochange: true,
                default: null
            }
        }
    });

    var
            tracker_address = "http://localhost:5581/",
            //tracker_address = "http://192.241.151.71:5581/",
            ui = 1000 * 60 * 60 * 24,
            DATE = new Date(),
            movie = {}, info, body = $(document.body),
            needs_new_description = false,
            title, year, add = false, addTorrents = false, scraped_stream = false, scraped_torrents = false,
            location = '' + document.location,
            options = JSON.parse(GM_getValue('options')),
            id = GM_info.scriptMetaStr.split('/scripts/show/')[1].split('\n')[0],
            version = ('' + GM_info.script.version),
            holder = $('<span><span id="streamHolder"></span><span id="torrentHolder" style="margin-left: .25em;"></span></span>');

    var check_version = function check_version(not_needed) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: tracker_address + "version/" + id,
            onload: function(rD) {
                GM_setValue('lu', Date.now());
                if (parseInt(rD.responseText.replace(/\./g, '')) > parseInt(version.replace(/\./g, ''))) {
                    if (confirm("Update needed for " + GM_info.script.name + "\nPress Ok to continue"))
                        document.location = 'http://userscripts.org/scripts/source/' + id + '.user.js';
                } else if (typeof not_needed === 'function')
                    not_needed();
            }
        });
    };

    var append_stream_link = function(link) {
        $('#streamHolder').css('cursor', 'pointer');
        $('#streamHolder').append('<a href="http://www.watchfreeinhd.com/' + link + '" target="_blank">►Stream</a>');
    };

    var append_torrents = function(data) {
        var wrapper = $('#TPH_TORRENT_WRAPPER');
        if (wrapper.length === 0) {
            var cname = "", place = null;
            if (site('imdb')) {
                cname = "article";
                place = $("#maindetails_center_top");
            } else if (site('rottentomatoes'))
                place = $('.main_movie_area');
            else if (site('tvmuse.'))
                place = $('div#content');
            wrapper = $('<div id="TPH_TORRENT_WRAPPER" style="display: none" class="' + cname + '"><table width="100%"><tr><th width="6%" id="close"><img src="http://www.freestockphotos.biz/thumbs_0001/thumbsmall_15106.png" style="width: 1.5em; cursor:pointer;"></img></th><th width="82%">Name</th><th width="6%">S</th><th>L</th></tr></table><small><a target="_blank" href="' + options.tpb_protocol + '://' + options.tpb_location + '/search/' + title + ' ' + year + '/0/7/200">All Results</a></small></div>');
            var toggle = function() {
                if (wrapper.css('display') === "none")
                    wrapper.slideDown();
                else
                    wrapper.slideUp();
            };
            var img = $('<img src="' + options.tpb_protocol + '://' + options.tpb_location + '/static/img/icon-magnet.gif" style="margin-left: .3em; width: .6em; cursor: pointer;"></img>');
            var link = $('<a href="' + data[0].magnet + '"></a>');
            link.append(img);
            var odd = true;
            for (var d in data) {
                var row = $("<tr style='margin-top: .125em;" + (odd ? ' background-color: #E0E0E0;' : '') + "'><td align='center'><a href='" + data[d].magnet + "'><img src='" + options.tpb_protocol + '://' + options.tpb_location + "/static/img/icon-magnet.gif'></img></a></td><td>" + data[d].name + "<br/><small style='margin-left: 1em;'>" + (data[d].trusted ? '<img src="' + options.tpb_protocol + '://' + options.tpb_location + '/static/img/trusted.png"></img> ' : '') + (data[d].vip ? '<img src="' + options.tpb_protocol + '://' + options.tpb_location + '/static/img/vip.gif"></img> ' : '') + "Date: " + data[d].date + ", Size: " + data[d].size + ", Uploaded by: " + data[d].uploader + "</small></td><td align='center'>" + data[d].seeds + "</td><td align='center'>" + data[d].leeches + "</td></tr>");
                $('table', wrapper).append(row);
                odd = odd ? false : true;
            }
            $('th#close', wrapper).click(toggle);
            $('#torrentHolder').click(toggle);
            $('#torrentHolder').css('cursor', 'pointer');
            $('#torrentHolder').append(link).append(' Torrent');
            place.prepend(wrapper);
        }
    };

    var get_remote = function(title, year) {
        if (typeof title !== 'undefined') {
            if (typeof year === 'undefined') {
                console.log('year undefined');
                scrape_torrents(title);
            } else {
                get_data({
                    url: tracker_address + "find/" + title + "/" + year,
                    onload: function(xmlDoc, rD) {
                        if (rD.responseText !== 'Not Found' && rD.responseText !== "") {
                            info = JSON.parse(rD.responseText);
                            if (info.description.indexOf('See full summary') !== -1) {
                                needs_new_description = true;
                                report();
                            }
                            if (typeof info.stream !== 'undefined' && info.stream !== null)
                                append_stream_link(info.stream);
                            else
                                scrape_stream(title, year);
                            if (typeof info.torrents !== 'undefined' && info.torrents.length > 0)
                                append_torrents(info.torrents);
                            else if (info.torrents.length === 0) {
                                addTorrents = true;
                                scrape_torrents(title, year);
                            } else
                                scrape_torrents(title, year);
                        } else {
                            scrape_stream(title, year);
                            scrape_torrents(title, year);
                            add = true;
                        }
                    }
                });
            }
        }
    };

    var scrape_torrents = function(title, year) {
        year = typeof year === 'undefined' ? '' : ' ' + year;
        var category = '200';
        console.log('scrape torrents');
        get_data({
            url: options.tpb_protocol + '://' + options.tpb_location + '/search/' + title + year + '/0/7/' + category,
            onload: function(xmlDoc, rD) {
                var searchResult = $('#searchResult', xmlDoc);
                var numRows = $('tr', searchResult);
                if (numRows.length > 0) {
                    movie.torrents = [];
                    var torrents = movie.torrents;
                    for (var i = 1; i < numRows.length; i++) {
                        var det_link = $('a.detLink', numRows[i]);
                        var mag_link = $("a[title='Download this torrent using magnet']", numRows[i]);
                        var desc = $('font.detDesc', numRows[i]).html();
                        desc = desc.replace(/&nbsp;/g, ' ').split(',');
                        var torrent = {
                            name: det_link.html(),
                            date: desc[0].replace('Uploaded ', '').trim(),
                            size: desc[1].replace('Size ', '').trim(),
                            vip: $(numRows[i]).html().indexOf('img/vip.gif') !== -1,
                            trusted: $(numRows[i]).html().indexOf('img/trusted.png') !== -1,
                            uploader: desc[2].replace('ULed by ', '').trim().replace('</a>', '').split('">')[1],
                            magnet: mag_link.attr('href'),
                            seeds: parseInt($('td:nth-child(3)', numRows[i]).html()),
                            leeches: parseInt($('td:nth-child(4)', numRows[i]).html())
                        };
                        if (torrent.seeds !== 0)
                            torrents.push(torrent);
                    }
                    scraped_torrents = true;
                    report();
                    append_torrents(torrents);
                } else {
                    $('#torrentHolder'.holder).append('No torrent results');
                }
            }
        });
    };

    var scrape_stream = function(title, year) {
        var search_cb = function(xmlDoc, rD) {
            var items = $('.index_item', xmlDoc);
            var found = false;
            for (var i = 0; i < items.length; i++) {
                var citem = $(items[i]);
                var title_string = $('h2', citem).html();
                var ntitle = title_string.split(' (')[0].trim();
                var link = $('a', citem).attr('href');
                var nyear = title_string.split(' (')[1].replace(/\s*(\(|\))/g, '').trim();
                if ((ntitle === title) && (nyear === year)) {
                    get_data({
                        url: link,
                        onload: list_cb
                    });
                    found = true;
                    break;
                }

            }
            if (!found) {
                movie.stream = null;
                scraped_stream = true;
                report();
            }
        };
        var list_cb = function(xmlDoc, rD) {
            var hosts = $('.version_host', xmlDoc);
            var found = false;
            for (var i = 0; i < hosts.length; i++) {
                var host = $(hosts[i]);
                var name = host.html().trim();
                if (name === 'watchfreeinhd.com') {
                    var prev = host.parent().prev();
                    var link = $('a', prev);
                    var link_location = 'http://www.watchfreemovies.ch' + link.attr('href');
                    found = true;
                    get_data({
                        url: link_location,
                        onload: form_cb
                    });
                }

            }
            if (!found) {
                movie.stream = null;
                scraped_stream = true;
                report();
            }
        };
        var form_cb = function(xmlDoc, rD) {
            append_stream_link(rD.finalUrl.split('.com/')[1].trim());
            movie.stream = rD.finalUrl.split('.com/')[1].trim();
            scraped_stream = true;
            report();
        };
        get_data({
            url: 'http://www.watchfreemovies.ch/search/' + title.replace(/ /g, '-').toLowerCase() + '/',
            onload: search_cb
        });
    };

    var report = function report() {
        if (location.indexOf('imdb.com') !== -1) {
            if ((scraped_stream && scraped_torrents) || addTorrents || needs_new_description) {
                console.log(movie);
                var url = tracker_address + "add";
                var data;
                if (addTorrents) {
                    console.log(movie.torrents.length);
                    url += "/torrents/" + movie.title + "/" + movie.year;
                    data = escape(JSON.stringify(movie.torrents));
                } else if (needs_new_description) {
                    url += "/description/" + movie.title + "/" + movie.year;
                    data = escape(JSON.stringify(movie.description));
                } else
                    data = escape(JSON.stringify(movie));
                url += "?data=" + data;
                GM_xmlhttpRequest({
                    method: 'GET',
                    url: url,
                    onload: function(rD) {
                        console.log(rD.responseText);
                    }
                });
            }
        }
    };

    GM_registerMenuCommand(GM_info.script.name, showOptions);

    if ((Date.now() - parseInt(GM_getValue('lu', '0'))) > ui)
        check_version();

// This part just pings a server so I can count how many people use this script
// It doesn't record any information, just ups the counter
    lp = GM_getValue('lp', '0');
    cp = '' + DATE.getMonth() + DATE.getFullYear();
    if (lp !== cp) {
        GM_xmlhttpRequest({
            method: 'GET',
            url: tracker_address + "count/" + id,
            onload: function() {
                GM_setValue('lp', cp);
            }
        });
    }
////////////////////////////////////////////////////////////
    console.log(site());
    switch (site()) {
        case options.tpb_location:
            $('#sky-right').remove();
            $('iframe').remove();
            $('#tableHead .nohover').parent().remove();
            $('#searchResult').css('width', '100%');
            $('#main-content').css('margin-left', '0');
            $("[name='orderby']").val('7');
            break;
        case 'imdb':
            if ($('#overview-top .infobar').html().indexOf('TV Series') === -1) {
                movie.title = $("[itemprop='name']").html().trim();
                movie.year = $('#overview-top h1.header a').html().trim();
                movie.director = $("[itemprop='name']", $("[itemprop='director']")).html().trim();
                movie.poster = $("img", $("#img_primary")).attr('src');
                movie.description = $($("[itemprop='description']")[1]).html().split('<p>')[1].split('<em')[0].trim();
                if ($("[itemprop='description']").html().trim().indexOf('See full summary') !== -1)
                    $("[itemprop='description']").html(movie.description);
                movie.genres = [];
                var genres = $('a', $("[itemprop='genre']"));
                for (var i = 0; i < genres.length; i++)
                    movie.genres.push($(genres[i]).html().trim());
                movie.writers = [];
                var writers = $("[itemprop='name']", $("[itemprop='creator']")[0]);
                for (var i = 0; i < writers.length; i++)
                    movie.writers.push($(writers[i]).html().trim());
                movie.duration = $("[itemprop='duration']").html().trim();
                movie.uri = 'tt' + location.split('/tt')[1].split('/')[0];
                movie.rating = $('.star-box-giga-star').html().trim();
                movie.mpaa = {
                    rating: $("[itemprop='contentRating']").attr('title'),
                    text: $($("[itemprop='contentRating']")[1]).html()
                };
                title = movie.title;
                year = movie.year;
                $('h1.header').append('<br/>').append(holder);
                get_remote(movie.title, movie.year);
            }
            break;
        case 'rottentomatoes':
            if (location.indexOf('/m/') !== -1) {
                var title_whole = $("[itemprop='name']").html().trim();
                title = title_whole.split(/\s\(/)[0].trim();
                year = title_whole.split(/\s\(/)[1].replace(/(\(|\))/g, '').trim();
                var desc = $("[itemprop='description']");
                $('script', desc).remove();
                $('a', desc).remove();
                desc.append($('span', desc).text());
                $('span', desc).remove();
                $("[itemprop='name']").append('<br/>').append(holder);
                get_remote(title, year);
            }
            break;
        case 'tvmuse.':
            if (location.match(/\/tv\-shows\/[a-zA-Z0-9\_\-]+\/$/) !== null) {
                var el = $('h1.mb_0');
                title = el.text();
                el.append(holder);
                get_remote(title);
            } else if (location.match(/\/movies\/[a-zA-Z0-9\_\-]+\/$/) !== null) {
                console.log('activated');
                var el = $('h1.mb_0');
                title = el.text().trim();
                var content = $('div#content');
                year = $(content.children()[1].children[3]).text().split(/\s\(/)[1].replace(/(\(|\))/g, '').trim();
                el.append('<br/>').append(holder);
                console.log(title, year);
                get_remote(title, year);
            }
            break;
        case 'watchfreemovies.':
            console.log('watch free movies');
            $('.stage_navigation').remove();
            $('.movie_info').remove();
            var putlocker_link = $('img[title="Putlocker link"]').parent().parent().parent().parent()[0];
            if (putlocker_link.tagName === 'TBODY')
                putlocker_link.remove();
            else
                putlocker_link.parent().remove();
            $('.choose_tabs').nextAll().remove();
            $('.download_link').remove();
            $('.featured_movies').nextAll().remove();
            $('.featured_movies').remove();
            $('.col2').remove();
            $('.footer').remove();
            $('.header').remove();
            $('script').remove();
            $('div[id="movie"]').remove();
            break;
        case 'watchfreeinhd':
            console.log('watchfreeinhd');
            var player = $('object#player');
            if (player.length === 1) {
                var params = player.children();
                $(params[4]).val($(params[4]).val().replace('stretching=fill', 'stretching=uniform'));
                var flashvars = unescape($(params[4]).val()).split('&');
                var fvars = {};
                for (var i = 0; i < flashvars.length; i++) {
                    var parts = flashvars[i].split('=');
                    fvars[parts[0]] = parts[1];
                }
                console.log(fvars);
                if (options.key !== fvars.key)
                    saveOptions({key: fvars.key});
                var stream_parts = fvars.streamer.split('230/')[1].split('/');
                var watchfree = location.split('.com/')[1].split('/')[0];
                get_data({
                    url: tracker_address + 'add/streams/' + stream_parts[0] + '/' + stream_parts[1],
                    onload: function(xmlDoc, rD) {

                    }
                });
                if (options.direct_video)
                    document.location = (fvars.streamer || fvars.provider) + '?file=&key=' + options.key + '&autostart=1';
                else {
                    player.width('100%');
                    player.height((parseInt(player.outerWidth())) + 'px');
                    body.html(player[0].outerHTML);
                    var counter = 0;
                    var timeout = function() {
                        var things = $('div, a, iframe').not('#tph_options');
                        var length = things.length;
                        if (length > 0) {
                            counter = 0;
                            things.remove();
                        } else
                            counter++;
                        console.log(counter, length);
                        if (counter < 5)
                            window.setTimeout(timeout, 500);
                    };
                    timeout();
                }
            } else {
                console.log('Page form');
                var input = $("input[value='Yes, let me watch']");
                var form = input.parent();
                if (form[0].tagName === 'FORM')
                    input.click();
            }
            break;
        case '109.201.134.230':
            break;
        default:
            break;
    }
}
