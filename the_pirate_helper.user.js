// ==UserScript==
// @name           The Pirate Helper
// @description    Enhances your pirating experience!
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version        4.1
// @date           2013-03-17
// @source         http://userscripts.org/scripts/show/56244
// @identifier     http://userscripts.org/scripts/source/56244.user.js
// @author         Noah Keller
// @namespace      http://userscripts.org/people/105134
// @include        *thepiratebay.se/*
// @include        *imdb*/title/tt*
// @include        *rottentomatoes*
// @include        *moviefone*/movie/*
// ==/UserScript==

var
        SCRIPT_VERSION = "4.1",
        DATE = new Date(),
        $ = jQuery,
        parser = new DOMParser(),
        title_el = null,
        tpb_icon = "data:image/ico;base64,Qk04AwAAAAAAADYAAAAoAAAAEAAAABAAAAABABgAAAAAAAAAAADgTAAA4EwAAAAAAAAAAAAA/////////////////////////////////////////////////////v7+/////////////Pz8vb297Ozs////////////////////////////////4uLiSUlJ3d3d////////8/PzEhIScnJy8fHx////////////////////8fHxwsLCWFhYAAAAyMjI////////5+fnEBAQICAgQkJCV1dXZWVli4uLiYmJUlJSKioqPT09bm5uHh4eYWFhwcHBubm5bGxsQEBAp6end3d3FBQUAAAAFBQUOTk5ISEhGRkZPT09WVlZQkJCKioqJycnenp6AAAAQUFBPz8/YGBgjo6O0dHR+/v7////////7+/vxcXFnZ2dg4ODExMTQEBAv7+/AAAAgoKCjo6OpaWltra2qqqqpqampaWlpKSkra2tr6+vsbGx5eXll5eXW1tb1NTUcXFxmJiYAwMDAAAANzc3VFRUGxsbAAAAX19fPDw8ERERAAAAQUFB/v7+/Pz8////////nJycAAAAAAAAAAAAHx8fCwsLAAAAJiYmBQUFAAAAAAAAKysr+vr6////////////nJycAAAAAAAADw8PAAAAAAAAAAAAAAAADQ0NAwMDAAAANjY2+vr6////////////rq6uAAAANjY25eXlWVlZHx8fJycnIyMj0dHRhoaGAAAAV1dX////////////////r6+vAAAALS0t0tLSX19fsrKy2dnZZWVlsrKyiIiIAAAAWVlZ////////////////r6+vAAAAAAAABQUFAgICExMTEBAQAwMDAwMDAQEBAAAAWlpa////////////////q6urAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVFRU////////////////19fXSUlJQUFBQ0NDQ0NDQ0NDQ0NDQ0NDQ0NDQkJCQkJCqKio/////////////////////////v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+/v7+////////////AAA=",
        magnet_icon = 'data:image/gif;base64,R0lGODlhDAAMALMPAOXl5ewvErW1tebm5oocDkVFRePj47a2ts0WAOTk5MwVAIkcDesuEs0VAEZGRv///yH5BAEAAA8ALAAAAAAMAAwAAARB8MnnqpuzroZYzQvSNMroUeFIjornbK1mVkRzUgQSyPfbFi/dBRdzCAyJoTFhcBQOiYHyAABUDsiCxAFNWj6UbwQAOw==';

/**
 * This checks and alerts to see if the script is up to date.
 */
function Update() {
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

// This registers the menu command for manual update checking
GM_registerMenuCommand("Update The Pirate Helper", Update);

/**
 * This figures out if it's been long enough to check the version
 * on userscripts.org to see if it needs an update, if the version number
 * does not match the userscripts site, it alerts the user to update the script
 */
lu = parseInt(GM_getValue('lu', '' + (DATE.getTime() - (24 * 60 * 60 * 1000) + 1)));
if ((DATE.getTime() - lu) >= (24 * 60 * 60 * 1000)) {
    GM_setValue('su', 'true');
    GM_setValue('lu', '' + DATE.getTime());
    Update();
}

function get_tpb_search(string) {
    return "http://thepiratebay.se/search/" + escape(string) + "/0/7/200";
}

function add_links(otitle, oyear) {
    var title = otitle + " " + oyear;
    var tpb_link = "&nbsp;&nbsp;<a href='" + get_tpb_search(title) + "' target='_blank'><img width='16' height='16' alt='The Pirate Bay' src='" + tpb_icon + "'/></a>&nbsp;&nbsp;";
    title_el.append(tpb_link);
    GM_xmlhttpRequest({
        method: 'GET',
        url: get_tpb_search(title),
        onload: function(rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            var magnet = $("[title='Download this torrent using magnet']", xmlDoc)[0];
            if (typeof magnet !== 'undefined') {
                var link = $("<a href='" + magnet + "'><img width='16' height='16' alt='Magnet Download' src='" + magnet_icon + "'/></a>");
                title_el.append(link);
            }
        }
    });
}

// on website the pirate bay
if (document.location.href.indexOf("://thepiratebay.se/") !== -1) {
    // Remove Ads
    $('#sky-right').remove();
    $('iframe').remove();
    $('#tableHead .nohover').parent().remove();


    $('#searchResult').css('width', '100%');
    $('#main-content').css('margin-left', '0');
    $("[name='orderby']").val('7');
    var rows = $('#searchResult tr td');
    for (var i = 0; i < rows.length; i++) { // iterate through search results
        var dat = jQuery(rows[i]);
        if (dat.index() === 2) {
            if (dat.html().trim() === '0') {
                dat.parent().remove(); // this torrent has no seeds, remove
            }
        }
    }
} else if (document.location.href.indexOf("://www.imdb.") !== -1) {
    if (document.location.href.indexOf("/title/tt") >= 0) {
        // grab the movie details from the DOM
        var
                address = document.location,
                title = $("[itemprop='name']").html().trim(),
                year = $('#overview-top h1.header a').html().trim(),
                summary = $("[itemprop='description']").html().trim(),
                rating = $('.star-box-giga-star').html().trim(),
                director = $("[itemprop='director'] [itemprop='name']").html().trim();

        // if this is not a TV Series, add a download link
        if ($('#overview-top .infobar').html().indexOf('TV Series') === -1) {
            title_el = $('#overview-top h1.header .nobr');
            $('#overview-top h1.header .nobr').append(add_links(title, year));
        }
    }
} else if (document.location.href.indexOf("://www.rottentomatoes.com") !== -1) {
    if (document.location.href.indexOf("/m/") >= 0) {
        var whole, title, year;
        title_el = $("[itemprop='name']");
        whole = title_el.html().split(' (');
        title = whole[0].trim();
        year = whole[1].replace(")", "").trim();
        add_links(title, year);
    }
} else if (document.location.href.indexOf("://www.moviefone.com") !== -1) {
    if (document.location.href.indexOf("/movie/") >= 0) {
        var whole, title, year;
        title_el = $(".movie-title h1");
        title = title_el.html().split('<strong>')[0].trim();
        year = $('.movie-release-date').html().split(', ')[1].trim();
        add_links(title, year);
    }
}