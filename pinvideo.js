	(function() {
	    function UVpinnableVideo(params) { // constructor
	        var that = this;
	        that.videos = [];
	        that.debug('UVpinnableVideo.js');
	        that.is_pinned = false;
	        that.previous_pinned = true;
	        that.header_height = 50;
	        that.is_user_action = false;
	        if (!that.deviceIsSupported()) return;
	        that.init();
	    }
	    UVpinnableVideo.prototype = {
	        debug: function(text) {
	            console.log(text);
	        },
	        init: function() {
	            var that = this;
	            that.width = 0;
	            that.sticky = false;
	            that.debug('Init UVpinnableVideo');
	            that.checkJWPlayer();
	        },
	        deviceIsSupported: function() {
	            var user_agent = window.navigator.userAgent;
	            if (user_agent.match('iOS')) {
	                var is_ipad = user_agent.match('iPad');
	                var ios_version = parseFloat(
	                    ('' + (/CPU.*OS ([0-9_]{1,5})|(CPU like).*AppleWebKit.*Mobile/i.exec(navigator.userAgent) || [0, ''])[1])
	                    .replace('undefined', '3_2').replace('_', '.').replace('_', '')
	                ) || false;
	                if ((ios_version < 10) && (!is_ipad)) return (false); // if the device is an iPhone and the iOS version is less than 10, Safari does not support the playsinline parameter. without that parameter this script does not make any sense
	                if ((ios_version < 5) && (is_ipad)) return (false); // if the device is an iPhone and the iOS version is less than 5, position:fixed does not work properly in Safari
	            }
	            if (user_agent.match('Android')) {
	                var android_version = parseInt(navigator.userAgent.match(/Android\s+([\d\.]+)/)[1], 10);
	                if (android_version < 5) return (false); // under Android 4- position:fixed does not work properly
	            }
	            return (true);
	        },
	        checkJWPlayer: function() { // wait for the jwplayer instance to be initialized
	            var that = this;
	            var i;
	            that.video_container = document.querySelector('.uvn-jw-live-stream-wrapper');
	            var tryAgain = function() {
	                window.setTimeout(function() {
	                    that.checkJWPlayer();
	                }, 1000);
	            };
	            that.debug('Checking for live streaming jwplayer instance');
	            if ((typeof(jwplayer) === 'function')) {
	                that.debug('Detected jwplayer init');
	                if (!that.video_container) tryAgain();
	                var video_enhancements = that.video_container.querySelectorAll('.jwplayer');
	                if (video_enhancements.length === 0) {
	                    that.debug('No players yet');
	                    tryAgain();
	                    return;
	                }
	                for (i = 0; i < video_enhancements.length; i++) {
	                    var video_id = video_enhancements[i].getAttribute('id');
	                    that.debug('Found jwplayer, id ' + video_id);
	                    that.video = ({ div: video_enhancements[i], player: jwplayer(video_id) });

	                }
	                that.initPinnable();
	            }
	        },
	        adjustEverything: function() { // adjust everything according to the viewport size
	            var that = this;
	            that.width = that.div_copy.offsetWidth;
	            that.height = that.div_copy.offsetHeight;
	            that.pinToBottom(that.is_pinned);
	            var div_content = document.querySelector('.uvn-liveblog');
	            that.height_content = div_content.offsetHeight;
	            that.y_content = that.getAbsOffsetTop(div_content);
	            that.button_unpin.style.bottom = (that.video.div.offsetHeight - that.button_unpin.offsetHeight) + 'px';
	            if (that.is_pinned) {
	                document.querySelector('.uvn-liveblog-goup').style.bottom = (that.video.div.offsetHeight - that.button_unpin.offsetHeight + 70) + 'px';
	            } else {
	                if (that.video.player.getFullscreen()) {
	                    that.video.div.style.marginTop = '0';
	                } else {
	                    that.video.div.style.marginTop = -that.height + 'px';
	                }
	            } // as we positioned the video as absolute, it has to be positioned over the div_copy
	        },
	        pinToBottom: function(toggle) { // pin or unpin the video in the bottom of the viewport
	            var that = this;
	            if (toggle !== that.previous_pinned) {
	                if (!toggle) {
	                    that.video.div.style.marginTop = -that.height + 'px';
	                    that.video.div.classList.add('uvn-unpinned');
	                    that.video.div.classList.remove('uvn-pinned');
	                    that.video.div.classList.remove('uvn-pin-ani');
	                    document.querySelector('.uvn-liveblog-goup').style.bottom = '10px';
	                    that.button_unpin.style.display = 'none';
	                } else {
	                    that.video.div.classList.add('uvn-pinned');
	                    that.video.div.classList.remove('uvn-unpinned');
	                    that.video.div.style = '';
	                    that.button_unpin.style.display = 'block';
	                    document.querySelector('.uvn-liveblog-goup').style.bottom = (that.video.div.offsetHeight - that.button_unpin.offsetHeight + 70) + 'px';
	                    window.setTimeout(function() { that.video.div.classList.add('uvn-pin-ani'); }, 10);
	                }
	            }
	            that.previous_pinned = toggle;
	        },
	        initPinnable: function() { // init html and css 
	            var that = this;
	            that.debug('Init pinnable');
	            that.div_copy = document.createElement('div'); // this div is going the reserve the space for the video
	            that.div_copy.className = 'uvn-copy';
	            that.video_container.parentNode.insertBefore(that.div_copy, that.video_container);
	            that.video_container.style.position = 'relative';
	            that.button_unpin = document.createElement('a');
	            that.button_unpin.className = 'uvn-unpin-button'; // overlay close button for closing the pinned video
	            document.body.appendChild(that.button_unpin);
	            that.button_unpin.addEventListener('click', function() {
	                that.is_pinned = false;
	                that.is_user_action = true; // remember that closing the video was an user choice
	                that.video.player.pause();
	                that.adjustEverything();
	            }, false);

	            var html5_video = that.video.div.getElementsByTagName('video'); // for iOS 10
	            if (html5_video.length > 0) {
	                html5_video[0].setAttribute('playsinline', 'playsinline'); // this allows the video to be played inline, without going fullscreen
	            }

	            that.adjustEverything();

	            window.addEventListener('scroll', function() {
	                that.checkScroll();
	            }, false);
	            that.adjustEverything();
	            // resize window handling
	            var resize_handler = '';
	            window.addEventListener('resize', function() {
	                if (resize_handler !== '') {
	                    window.clearTimeout(resize_handler);
	                    resize_handler = '';
	                }
	                resize_handler = window.setTimeout(function() {
	                    that.adjustEverything();
	                    resize_handler = '';
	                }, 500); // don't fire resize event more than once very 500 ms
	            }, false);
	        },
	        getAbsOffsetTop: function(e) {
	            var rect = e.getBoundingClientRect();
	            var top = window.pageYOffset || document.documentElement.scrollTop;
	            return (rect.top + top);
	        },
	        getScrollPos: function() {
	            var that = this;
	            return ((document.body.scrollTop || document.documentElement.scrollTop));
	        },
	        checkScroll: function() {
	            var that = this;
	            var scroll_pos = that.getScrollPos() + that.header_height;
	            var y_wrapper = that.getAbsOffsetTop(that.div_copy);

	            if (scroll_pos > (y_wrapper + that.height)) { // video gets out of the browser viewport
	                if (!that.is_pinned) { // enable pinned mode
	                    if (that.is_user_action) return;
	                    if (that.video.player.getState() !== 'playing') return;
	                    that.debug('Enable pin');
	                    that.is_pinned = true;
	                    that.adjustEverything();
	                }
	            }
	            if (scroll_pos < (y_wrapper + that.height)) { // the original place that video occupied enters the viewport
	                if ((that.is_pinned) || (that.is_user_action)) { // disable pinned mode
	                    that.debug('Disable pin');
	                    that.is_user_action = false;
	                    that.is_pinned = false;
	                    that.adjustEverything();
	                }
	            }
	        }
	    };
	    window.UVpinnableVideo = UVpinnableVideo;
	}());

	document.addEventListener('DOMContentLoaded', function(e) {
	    window.UVSyncVideo = new UVpinnableVideo();
	}, false);
