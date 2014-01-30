var $ = jQuery;

var
        options = null
        , location = ('' + document.location)
        , downloadURL = GM_info.scriptMetaStr.split('@downloadURL')[1].split('\n')[0].trim();

var browser = function browser(name) {
    var n = 'unknown';
    if (GM_info.scriptHandler === 'Tampermonkey')
        n = 'chrome';
    else if (typeof window.opera !== 'undefined')
        n = 'opera';
    else if (typeof GM_info.scriptWillUpdate === 'number')
        n = 'opera';
    else if (typeof GM_info.scriptWillUpdate === 'boolean')
        n = 'firefox';
    return typeof name === 'undefined' ? n : n === name;
};

var site = function site(check) {
    var s = '';
    var f = location.split(/^http(s)?\:\/\/(www\.)?/)[3].split('/')[0];
    if (typeof f !== 'undefined')
        s = f.split(/\.[a-zA-Z](\.[a-zA-Z])?/)[0];
    else
        s = null;
    return typeof check === 'undefined' ? s : s === check;
};

var get_data = function get_data(args) {
    args.post = typeof args.post === 'undefined' ? false : args.post;
    var post_data = '';
    if (typeof args.post === 'object')
        for (var d in args.post)
            post_data += (post_data === '' ? '' : '&') + d + '=' + args.post[d];
    GM_xmlhttpRequest({
        method: args.post === false ? 'GET' : 'POST',
        data: post_data,
        url: args.url,
        onload: function(rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            if (typeof args.onload === 'function')
                args.onload(xmlDoc, rD);
        },
        ontimeout: function(rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            if (typeof args.ontimeout === 'function')
                args.ontimeout(xmlDoc, rD);
        },
        onerror: function(rD) {
            var xmlDoc = $.parseHTML(rD.responseText);
            if (typeof args.onerror === 'function')
                args.onerror(xmlDoc, rD);
        }
    });
};

var init = function init(params) {
    if (GM_getValue('options', null) === null)
        GM_setValue('options', JSON.stringify(params));
    options = JSON.parse(GM_getValue('options'));
};

var showOptions = function() {
    var ops = {
        the_pirate_bay: {
            tpb_location: {
                text: 'URL',
                type: 'text',
                binding: options.tpb_location,
                default: 'thepiratebay.se'
            },
            tpb_protocol: {
                text: 'Protocol',
                type: 'switch',
                binding: options.tpb_protocol,
                options: ['HTTP', 'HTTPS'],
                default: 'HTTPS'
            },
            removeDead: {
                text: 'Remove dead torrents',
                type: 'checkbox',
                default: true
            }
        },
        watchfreeinhd: {
            direct_video: {
                text: 'Direct video link',
                type: 'checkbox',
                default: true
            },
            auto_accept: {
                text: 'Auto click accept',
                type: 'checkbox',
                default: true
            }
        }
    };

    var headers = {
        the_pirate_bay: 'The Pirate Bay',
        watchfreeinhd: 'Watch Free In HD'
    };

    var wrapper = null, saveButton, updateButton, closeButton, tpb_location_input
            , tpb_protocol_select, set_tpb_location_button, direct_video_checkbox;

    var set_tpb_location = function() {
        get_data({
            url: tracker_address + 'tpb_location',
            onload: function(xmlDoc, rD) {
                $('#option-tpb_location').val(rD.responseText);
            }
        });
    };

    var createOptions = function() {
        wrapper = $('<div id="tph_options"></div>');
        wrapper.css({
            'border-radius': '1em',
            width: '84%',
            position: 'absolute',
            padding: '1em',
            'padding-top': '2.5em',
            left: '8%',
            top: '25%',
            border: '1px solid black',
            'z-index': '1000000',
            'background-color': 'gray'
        });

        saveButton = $('<button>Save</button>');
        saveButton.click(save);
        saveButton.css({
            position: 'absolute',
            left: '1em',
            top: '.75em'
        });
        wrapper.append(saveButton);

        updateButton = $('<button>Update Script</button>');
        updateButton.click(function() {
            check_version(function() {
                alert('No update necessary');
            });
        });
        updateButton.css({
            position: 'absolute',
            left: '50%',
            top: '.75em'
        });
        wrapper.append(updateButton);

        closeButton = $('<button>Close</button>');
        closeButton.click(function() {
            wrapper.hide();
        });
        closeButton.css({
            position: 'absolute',
            right: '1em',
            top: '.75em'
        });
        wrapper.append(closeButton);

        set_tpb_location_button = $('<button>Default TPB Location</button>');
        set_tpb_location_button.click(set_tpb_location);
        set_tpb_location_button.css({
            position: 'absolute',
            left: '20%',
            top: '.75em'
        });
        wrapper.append(set_tpb_location_button);

        for (var o in ops) {
            var section = ops[o];
            wrapper.append($('<h2 style="background-color: #E0E0E0; border-bottom: 1px solid black; border-top: 1px solid black; margin-bottom: .25em; width: 100%; text-align: center; clear: both; color: gray; padding: 0; margin: 0; margin-top: 1em">' + headers[o] + '</h2>'));
            for (var oo in section) {
                var option = section[oo];
                var cstring = '<div style="clear: both;"><label style="float: left; width: 40%; padding-right: 2%; text-align: right; clear: both" for="option-' + oo + '">' + option.text + '</label>';
                if (option.type === 'text')
                    cstring += '<input id="option-' + oo + '" type="text" value="' + options[oo] + '"></input>';
                else if (option.type === 'switch') {
                    cstring += '<select id="option-' + oo + '">';
                    for (var i = 0; i < option.options.length; i++)
                        cstring += '<option' + (options[oo] === option.options[i].toLowerCase() ? ' SELECTED' : '') + '>' + option.options[i] + '</option>';
                    cstring += '</select>';
                } else if (option.type === 'checkbox')
                    cstring += '<input type="checkbox" id="option-' + oo + '"' + (options[oo] === true ? ' CHECKED' : '') + '></input>';
                cstring += '</div>';
                wrapper.append($(cstring));
            }
        }

        body.append(wrapper);
    };

    var save = function() {
        options.tpb_location = $('#option-tpb_location').val().replace(/(http(s)?\:|\/|\\)/g, '');
        options.tpb_protocol = $('#option-tpb_protocol').val().toLowerCase();
        options.removeDead = $('#option-removeDead').is(':checked');
        options.direct_video = $('#option-direct_video').is(':checked');
        options.auto_accept = $('#option-auto_accept').is(':checked');
        saveOptions();
        wrapper.hide();
    };

    if (wrapper === null)
        createOptions();
    else
        wrapper.show();
};

var saveOptions = function saveOptions(os) {
    if (typeof os !== 'undefined')
        for (var o in os)
            options[o] = os[o];
    GM_setValue('options', JSON.stringify(options));
};

var GM_execute = function GM_execute(check) {
    if (window.top === window.self) {
        var tph_sig = $('#' + check);
        if (tph_sig.length === 0) {
            $(document.body).append($('<span id="' + check + '"></span>'));
            return true;
        }
    }
    return false;
};