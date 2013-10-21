// ==UserScript==
// @name           The Pirate Helper
// @description    Enhances your pirating experience!
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version        4.4
// @date           2013-03-18
// @source         http://userscripts.org/scripts/show/56244
// @identifier     http://userscripts.org/scripts/source/56244.user.js
// @author         Noah Keller
// @namespace      http://userscripts.org/people/105134
// @include        *thepiratebay.se/*
// @include        *imdb*/title/tt*
// @include        *rottentomatoes*
// ==/UserScript==

var
        SCRIPT_VERSION = "4.4",
        DATE = new Date(),
        $ = jQuery,
        parser = new DOMParser(),
        title_el = null,
        container = null,
        onIMDB,
        onRottenTomatoes,
        onThePirateBay,
        removeDead;

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

function get_tpb_search(string) {
    return "http://thepiratebay.se/search/" + escape(string) + "/0/7/200";
}

function site(string) {
    return document.location.href.indexOf(string) !== -1;
}

function remove_dead_torrents(searchResult) {
    if (removeDead) {
        var seed_cells = $("tbody tr td:nth-child(3)", searchResult);
        for (var i = 0; i < seed_cells.length; i++) {
            var ccell = $(seed_cells[i]);
            if (ccell.html().trim() === '0') {
                ccell.parent().remove();
            }
        }
    }
    return searchResult;
}

function fetch_results(otitle, oyear) {
    GM_xmlhttpRequest({
        method: 'GET',
        url: get_tpb_search(otitle + " " + oyear),
        onload: function(rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            var searchResult = remove_dead_torrents($('#searchResult', xmlDoc));
            var numRows = $('tr', searchResult);
            if (numRows.length > 0) {
                if (numRows.length > 5) {
                    $('tbody tr:gt(4)', searchResult).remove();
                }
                $('#tableHead tr:first', searchResult).remove();
                $('tr.header', searchResult).css('background-color', '#E0E0E0');
                var headers = $('th', searchResult);
                headers[0].innerHTML = 'Type';
                headers[1].innerHTML = 'Name';
                headers[2].innerHTML = 'S';
                headers[3].innerHTML = 'L';
                var res_links = $('a', searchResult);
                for (var i = 0; i < res_links.length; i++) {
                    var clink = $(res_links[i]);
                    if (clink.attr('href').indexOf('magnet') !== 0) {
                        clink.attr('href', 'http://thepiratebay.se' + clink.attr('href'));
                        clink.attr('target', '_blank');
                    }
                }
                var main;
                if (site('imdb')) {
                    main = $('#maindetails_center_top');
                    container = $('<div class="article title-overview"></div>');
                } else if (site('rottentomatoes')) {
                    main = $("[data-param='theater']");
                    container = $('<div class="content_box"></div>');
                }
                searchResult.append($('<tr><td>&nbsp;</td><td><a target="_blank" href="' + get_tpb_search(otitle + " " + oyear) + '">more results...</a></td></tr>'));
                searchResult.width('98%');
                searchResult.css('margin-left', '1%');
                container.append(searchResult);
                main.prepend(container);
            } else {
                title_el.append('<br/>No download results...');
            }
        }
    });
}

if (site("thepiratebay.se") && onThePirateBay) {
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
    }
} else if (site("rottentomatoes.com/m/") && onRottenTomatoes) {
    var whole;
    title_el = $("[itemprop='name']");
    whole = title_el.html().split(' (');
    title = whole[0].trim();
    year = whole[1].replace(")", "").trim();
    fetch_results(title, year);
}