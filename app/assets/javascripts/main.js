// variables to be used throughout
var genres            = ["rock","seenlive","alternative","indie","electronic","pop","metal","femalevocalists","classicrock","alternativerock","jazz","punk","indierock","folk","ambient","singer-songwriter","experimental","electronica","hardrock","hip-hop","80s","dance","hardcore","blackmetal","chillout","progressiverock","deathmetal","instrumental","heavymetal","british","punkrock","soundtrack","industrial","soul","blues","classical","emo","rap","90s","thrashmetal","metalcore","trance","japanese","favorites","reggae","acoustic","country","progressivemetal","trip-hop","hiphop","powermetal","funk","psychedelic","melodicdeathmetal","newwave","post-rock","electro","house","indiepop","techno","german","love","70s","rnb","britpop","american","gothicmetal","downtempo","piano","60s","00s","grunge","post-punk","albumsiown","beautiful","ska","gothic","screamo","mellow","chill","doommetal","french","guitar","oldies","idm","swedish","malevocalists","awesome","j-rock","numetal","symphonicmetal","finnish","lounge","polish","femalevocalist","grindcore","progressive","folkmetal","canadian","post-hardcore","world","drumandbass","synthpop","j-pop","newage","minimal","favourites","ebm","russian","poprock","cover","poppunk","latin","darkwave","favorite","female","darkambient","noise","industrialmetal","avant-garde","psychedelicrock","brutaldeathmetal","dub","disco","gothicrock","celtic","sexy","easylistening","alternativemetal","anime","christian","bluesrock","cool","favourite","classic","shoegaze","heardonpandora","folkrock","stonerrock","comedy","psytrance","christmas","sad","atmospheric","melancholy","fun","deathcore","jpop","deutsch","romantic","vikingmetal","fusion","femalefrontedmetal","irish","uk","visualkei","spanish","relax","hardcorepunk","acidjazz","relaxing","alt-country","amazing","covers","favoritesongs","italian","lo-fi","garagerock","happy","goth","melancholic","rockabilly","live","swing","ethereal","dark","norwegian","emocore","ballad","glamrock","australian","brazilian","malevocalist","good","americana","party","softrock","synthpop","political","melodicmetal","sludge","jrock","epic","hiphop","rocknroll","postrock","technicaldeathmetal","usa","favouritesongs","vocal","femalevocals","remix","speedmetal","club","electropop","contemporaryclassical","bossanova","funky","baroque","rhythmandblues","progressivetrance","electroclash","russianrock","brasil","neofolk","triphop","nu-metal","dancehall","industrialrock","rockandroll","guitarvirtuoso","worldmusic","drone","smoothjazz","dnb","breakbeat","catchy","rapcore","dubstep","artrock","loved","summer","thrash","drumnbass","darkelectro","psychobilly","mpb","undergroundhip-hop","skapunk","southernrock","medieval","vocaltrance","dreamy","christianrock","dreampop","paganmetal","minimaltechno","nujazz","breakcore","english"];
var videos            = new Array();
var currenttrack      = 0;
var search            = "";
var prev_search       = "";
var search_type       = "";
var videosCopy        = "";
var direction         = "forward";

var userId            = 0;
var userUsername      = null;
var alreadyFavorites  = [];
var bannedVideos      = [];

var tag               = null;
var firstScriptTag    = null;
var thePlayer;

var firstSearch       = true;

// set user id
function setUserInfo (id, username) {
  userId        = id;
  userUsername  = username;
  
  // get users banned videos
  $.ajax({
    type: 'POST',
    url: '/check_banned',
    data: {
      user_id:  userId
    },
    dataType: 'json',
    success: function(data) {
      bannedVideos = data;
    }
  });
}

function is_blocked (video) {
  var blocked = false;

  if (video.author[0].name.$t.toLowerCase().search('vevo') >= 0) blocked = true;
  if (typeof video.app$control  !== "undefined" && video.app$control.yt$state.$t == "Syndication of this video was restricted by the content owner.") blocked = true;
  if (typeof video.app$control  !== "undefined" && video.app$control.yt$state.$t == "Syndication of this video was restricted by its owner.") blocked = true;
  
  return blocked;
}

function is_music (video) {
  var music = true;
  
  if (video.media$group.media$category[0].$t != "Music") music = false;
  
  return music;
}

function is_unique (track_name, video) {
  var unique = true
  
  $.each(videos, function () {
    if (this.VideoID == video.id.$t.split(":")[3]) unique = false;
    
    var tmp_title1 = this.VideoTitle.toLowerCase().replace(/ *\([^)]*\) */g, '').replace(/[^a-zA-Z ]/g, "");
    var tmp_title2 = video.title.$t.toLowerCase().replace(/ *\([^)]*\) */g, '').replace(/[^a-zA-Z ]/g, "");
    
    if (tmp_title1 == tmp_title2) unique = false;
  });
   
  return unique;
}

function is_cover_or_remix (video) {
  var cover_or_remix = false;
  
  if (video.title.$t.toLowerCase().search("cover") != -1 || video.title.$t.toLowerCase().search("remix") != -1 || video.title.$t.toLowerCase().search("alternate") != -1) cover_or_remix = true;
  
  return cover_or_remix;
}

function is_live (video) {
  var live_video = false;
  
  if (search.toLowerCase().search("live") > -1) return live_video;
  
  if (video.title.$t.toLowerCase().search("live") > -1 || video.title.$t.toLowerCase().search("@") > -1 || video.title.$t.toLowerCase().search("19") > -1 || video.title.$t.toLowerCase().search("200") > -1) live_video = true;
  
  if (!live_video) {
    $.each(video.category, function () {
      if (this.term.toLowerCase() == "live") live_video = true;
    });
  }

  return live_video
}

function is_not_banned (video_id) {
  var video_banned = true;

  $.each(bannedVideos, function () {
    if (this == video_id) video_banned = false;
  });
  
  return video_banned;
}

function prepare_search (who, type_of_search) {
  $('.' + type_of_search).addClass('listen-active');

  videos        = []; 
  currenttrack  = 0;
  search        = who;
  search_type   = type_of_search;
}

// genre search
function genreSearch (who) {
  prepare_search(who, "genre");
  
	$.getJSON('http://ws.audioscrobbler.com/2.0/?method=tag.gettopartists&tag='+who+'&api_key=b25b959554ed76058ac220b7b2e0a026&limit=20&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&callback=?', function(data) {
		$.each(data, function(i,artists) {
			var ajaxs = $.map(artists.artist, function(artist) {
				return $.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+artist.name+'&orderby=relevance&start-index=1&max-results=10&v=2&alt=json-in-script&callback=?', function(data) {
					$.each(data.feed.entry, function(i,video) {
						var video_is_good = false;
            if (!video_is_good && !is_blocked(video) && is_music(video) && !is_cover_or_remix(video)) {
						  videos.push({ 
  							VideoID: video.id.$t.split(":")[3], 
  							VideoTitle: video.title.$t,
  							ArtistName: artist.name 
  						});
  					  video_is_good = true;
  					}
					});
				});
			});
			$.when.apply($,ajaxs).then(initPlaylist);
		});
	});  
}

// artist wasnt found in last.fm artist data store
function not_lastfm_artist (who) {
  prepare_search(who, "just");
  
  $.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+escape(who)+'&orderby=relevance&start-index=1&max-results=20&v=2&alt=json-in-script&callback=?', function(data) {
    $.each(data.feed.entry, function(i,video) {
      if (!is_blocked(video) && is_not_banned(video.id.$t.split(":")[3])) {
        videos.push({ 
          VideoID: video.id.$t.split(":")[3], 
          VideoTitle: video.title.$t 
        });
      }
    });
    initPlaylist();
  });
}

function video (video_id) {
	videos        = [];
  currenttrack  = 0;
  search_type   = "video";
  url           = "/video/" + video_id;

	$.getJSON('https://gdata.youtube.com/feeds/api/videos/' + video_id + '?v=2&alt=json-in-script&callback=?', function (data) {
		var single_vid = data.entry;
    if (typeof single_vid !== "undefined") {      
      var video_is_good = false;
      if (!video_is_good && !is_blocked(single_vid) && is_not_banned(single_vid.id.$t.split(":")[3])) {
				videos.push({ 
				  VideoID: single_vid.id.$t.split(":")[3], 
				  VideoTitle: single_vid.title.$t
				}); 
				video_is_good = true;
				search        = single_vid.title.$t;
      }
    }

  	initPlaylist();
	});
}

// just artist/band
function just (who) {
  // check if the users input is a last.fm top tag
  if ($.inArray(who.replace(/[ +]/g, ""), genres) > -1) {
    genreSearch(who);
  }
  else {
    prepare_search(who, "just");
    
    $.getJSON('http://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist='+escape(who)+'&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&callback=?', function(data) {
      if (data.error == 6 || data.toptracks.total == 0) {
        not_lastfm_artist(who);
      }
      else {
        $.each(data, function(i, tracks) {
          var ajaxs = $.map(tracks.track, function(track) {
            if (track.name.toLowerCase().search("cover") == -1 && track.name.toLowerCase().search("remix") == -1 && track.name.toLowerCase().search("alternate") == -1) {
              return $.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+escape(who)+'%20%2D$20'+escape(track.name)+'&orderby=relevance&start-index=1&max-results=10&v=2&alt=json-in-script&callback=?', function(data) {
                if (typeof data.feed.entry !== "undefined") {
                  $.each(data.feed.entry, function(i,video) {
                    var video_is_good = false;
                    if (!video_is_good && !is_blocked(video) && !is_live(video) && is_music(video) && is_unique(track.name, video) && !is_cover_or_remix(video) && is_not_banned(video.id.$t.split(":")[3])) {
                      videos.push({ 
                        VideoID: video.id.$t.split(":")[3], 
                        VideoTitle: video.title.$t
                      }); 
                      video_is_good = true;
                    }
                  });
                }
              });
            }
          });
          $.when.apply($,ajaxs).then(initPlaylist);
        });
      }
    });
  } 
}

// similar artist/bands
function similarTo (who) {
  prepare_search(who, "similar");
  
	$.getJSON('http://ws.audioscrobbler.com/2.0/?method=artist.getsimilar&artist='+escape(who)+'&limit=20&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&callback=?', function(data) {
		$.each(data, function(i,similars) {
			var ajaxs = $.map(similars.artist, function(artist) {
				return $.getJSON('http://gdata.youtube.com/feeds/api/videos?q='+escape(artist.name)+'&orderby=relevance&start-index=1&max-results=10&v=2&alt=json-in-script&callback=?&format=5', function(data) {
					$.each(data.feed.entry, function(i,video) {
						var video_is_good = false;
            if (!video_is_good && !is_blocked(video) && is_music(video) && !is_cover_or_remix(video) && is_not_banned(video.id.$t.split(":")[3])) {
					  	videos.push({ 
  							VideoID: video.id.$t.split(":")[3], 
  							VideoTitle: video.title.$t,
  							ArtistName: artist.name 
  						});
  						video_is_good = true;
  					}
					});
				});
			});
			$.when.apply($,ajaxs).then(initPlaylist);
		});
	});
}

// user favorites
function userFavorites (un, srch) {
  videos        = [];
  currenttrack  = 0;
  search        = (srch != '' ? un + ' : ' + srch : un);
  search_type   = "favorites";
  url           = (srch != '' ? '/'+un+'/favorites/'+srch+'.json' : '/'+un+'/favorites.json');
  
	$.getJSON(url, function(data) {
	  if (data.length != 0) {
      videos = data;
		  initPlaylist();
	  } 
	  else {
      if (search == userUsername) {
        $('#empty-playlist .empty-standard-playlist').remove();
        $('#empty-playlist .bystander').remove();
        $('#empty-playlist').fadeIn();
      }
      else {
        $('#empty-playlist .empty-standard-playlist').remove();
        $('#empty-playlist .users-favorites').remove();
        $('#empty-playlist').fadeIn();      
      }
	  } 
	});
}

function onYouTubePlayerAPIReady () {
  thePlayer = new YT.Player('ytplayerid', {
    videoId: videos[currenttrack].VideoID,
    width: 498,
    height: 280,
    version: 3,
    playerVars: { 'autoplay': 1, 'rel': 0, 'theme': 'dark', 'showinfo': 0, 'autohide': 1, 'wmode': 'opaque', 'allowScriptAccess': 'always', 'version': 3, 'restriction': 'US' },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange,
      'onError': onPlayerError
    }
  });
}

// start the playlist
function initPlaylist () {  
  if (videos.length == 0) {
    $('#about').hide();
    $('.listen-active').removeClass('listen-active');
    $('#empty-playlist .bystander').remove();
    $('#empty-playlist .users-favorites').remove();
    $('#empty-playlist').fadeIn();
  }
  else {
    _gaq.push(['_trackPageview', (search_type == 'favorites' ? search.replace(/[ ]/g,"+")+"/favorites" : search_type+"/"+search.replace(/[ ]/g,"+"))]);
  
    videos.sort(function () { return (Math.round(Math.random())-0.5); });
  
    if (firstSearch) {
      var tag = document.createElement('script');
      tag.src = "http://www.youtube.com/player_api?version=3";
      var firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }
    
    // check to see if any of the video ids are already marked as a favorite for the user
    if (userId > 0) {
      $.ajax({
        type: 'POST',
        url: '/check_favorites',
        data: {
          user_id:  userId,
          videos:   videos
        },
        dataType: 'json',
        success: function(data) {
          alreadyFavorites = data;
        }
      });
    }

    $('.listen-active').removeClass('listen-active');
    $('#empty-playlist').fadeOut();
    $('#about').fadeOut(500, function(){
      $("#main").animate({
        marginTop: ($('#main').css('marginTop') == '20px' ? 20 : 100)
      }, 500, function () {  
        videosCopy = "";
        $.each(videos, function(i) {
          videosCopy = videosCopy + '<a href="#" id="'+this.VideoID+'">'+this.VideoTitle+'<div class="share-video" data-video-id="' + this.VideoID + '" data-video-title="' + this.VideoTitle + '">share video</div></a>';
        });
      	$('#the-list').html(videosCopy);

        if (prev_search != search) {  
        	$.get('/insert_search/' + search_type + '/' + escape(search));
      	  prev_search = search;
      	}
    	
      	if (search_type == 'favorites') {
      	  $('#info-icon').hide();
      	  $('#remove-video').hide();
      	}
      	else {
      	  $('#info-icon').show();
      	  $('#remove-video').show();
      	} 
    	
      	$('#twitter').attr('href',"https://twitter.com/share?text=I%27m%20listening%20to%20"+(search_type == 'similar' ? 'artists%2Fbands%20similar%20to%20' : '')+search.replace(/ /g,"%20")+(search_type == 'favorites' ? "%27s%20favorites": '')+"%20on%20%40tubalr%21&url=http%3A%2F%2Ftubalr.com%2F"+(search_type == 'favorites' ? search.replace(/[ +]/g,"%2B")+"%2Ffavorites" : search_type+"%2F"+search.replace(/[ +]/g,"%2B")));
		
      	currentVideo(videos[currenttrack]);
  		  firstSearch = false;
		  
  		  if (search_type == 'just') {
  		    getInfo();
  	    }
		  	
				if (search_type == 'video') {
					$('#player-controls').hide();
					$('#info-icon').hide();
					$('#share').hide();
				}
				else {
					$('#player-controls').show();
					$('#info-icon').show();
					$('#share').show();
				}
				
      	$('#player').fadeIn(1000);
      	$('nav').animate({ right: 220 }, 500, function() {
      	  $('#playlist').fadeIn(1000);
        	$('.slimScrollDiv').fadeIn(1000);

          $('#playlist').slimScroll({
            height: '100%',
            width: '200px'
          });
      	});
      });
    });
  }
}

// denote current song in the ui
function currentVideo (video) {
  if (search_type == 'similar' || search_type == 'genre') {
    getInfo();
  }
  
  if ($.inArray(video.VideoID, alreadyFavorites) != -1) {
    $('#favorite-star').addClass('fav');
  }
  else {
    $('#favorite-star').removeClass('fav');    
  }
  
  if (!firstSearch) {
    firstSearch = false;
    thePlayer.loadVideoById(video.VideoID, 0);
  }
	
	$('#the-list .active').removeClass('active');
	$('#'+video.VideoID).addClass('active');
}

// jump to a certain video
function jumpTo (VideoID) {
	currenttrack = VideoID;
	currentVideo(videos[currenttrack]);
}

// next
function nextSong (removedFromFavorites) {
  direction = "forward";
  if (removedFromFavorites) {
    if (currenttrack == videos.length) {
      currenttrack = 0;
	    currentVideo(videos[currenttrack]);
	  }
	  else {
	    currentVideo(videos[currenttrack]);
	  }
  }
	else if (currenttrack == videos.length-1) {
		currenttrack = 0;
		currentVideo(videos[currenttrack]);
	}
	else {
		currenttrack = currenttrack+=1;
		currentVideo(videos[currenttrack]);
	}
	return false;
}

// previousSong
function previousSong () {
  direction = "backward";
	if (currenttrack == 0) {
		currenttrack = videos.length-1;
		currentVideo(videos[currenttrack]);
	}
	else {
		currenttrack = currenttrack-=1;
		currentVideo(videos[currenttrack]);
	}
	return false;
}

// YouTube player changes states
function onPlayerStateChange (newState) {
  // if track ended
	if (newState.data == 0) {
    nextSong();
  }
}

//YouTube player error
function onPlayerError (errorCode) {
	if (direction == "backward") {
	  previousSong();
	} 
	else {
	  nextSong();
	}
}

function onPlayerReady () { }

function facebook () {
  FB.ui({
      method: 'stream.publish',
      attachment: {
        name: (search_type == 'similar' ? 'Artists/Bands similar to ' : '')+search.replace(/[+]/g," ")+(search_type == 'favorites' ? "'s favorites": '')+", brought to you by tubalr!",
        href: "http://www.tubalr.com/"+(search_type == 'favorites' ? search.replace(/ /g,"+")+'/favorites' : search_type+"/"+search.replace(/ /g,"+")),
        description: ("Tubalr allows you to effortlessly listen to a band's or artist's top YouTube videos without all the clutter YouTube brings.")
      },
      display: 'popup'
    },
    function (response) {
    }
  );
  return false;
}

function share_video_facebook (video_id, video_title) {
  FB.ui({
      method: 'stream.publish',
      attachment: {
        name: video_title + ", brought to you by tubalr!",
        href: "http://www.tubalr.com/video/" + video_id,
        description: ("Tubalr allows you to effortlessly listen to a band's or artist's top YouTube videos without all the clutter YouTube brings.")
      },
      display: 'popup'
    },
    function (response) {
    }
  );
  return false;
}

function remove_from_list (type_of_list) {
  if (videos.length == 0) {
    thePlayer.stopVideo();
    $('#player').fadeOut();
    $('.slimScrollDiv').fadeOut(500, function() {
      $('#main').animate({ marginTop: 200 }, 500);
      $('#main nav').animate({ right: 20 }, 500);
    });
    $('#empty-playlist .bystander').remove();
    $('#empty-playlist .' + type_of_list).remove();
    $('#empty-playlist').fadeIn();
  }
  else {
    nextSong("removedFromFavorites");
  }
}

function remove_video () {
  if (userId != 0) {
    $.ajax({
      type: 'POST',
      url: '/ban_video',
      data: {
        user_id:  userId,  
        video_id: videos[currenttrack].VideoID
      },
      dataType: 'json',
      success: function(data) {
        bannedVideos.push(videos[currenttrack].VideoID);
        $("#the-list #"+videos[currenttrack].VideoID).remove();
        videos.splice(currenttrack, 1);
        remove_from_list("users-favorites");
      }
    });
  }
  else {
    $("#the-list #"+videos[currenttrack].VideoID).remove();
    videos.splice(currenttrack, 1);
    remove_from_list("users-favorites");
  }
}

function favorite (star) {
  if ($(star).hasClass('fav')) {
    $.ajax({
      type: 'POST',
      url: '/favorites/remove',
      data: {
        user_id:  userId,  
        video_id: videos[currenttrack].VideoID
      },
      dataType: 'json',
      success: function(data) {
        $(star).removeClass('fav');
        alreadyFavorites.splice(alreadyFavorites.indexOf(videos[currenttrack].VideoID), 1);
        if (search == userUsername) {
          $("#the-list #"+videos[currenttrack].VideoID).remove();
          videos.splice(currenttrack, 1);
          remove_from_list("empty-standard-playlist");
        }
      }
    });
  }
  else {
    $.ajax({
      type: 'POST',
      url: '/favorites/add',
      data: {
        user_id:      userId,  
        video_id:     videos[currenttrack].VideoID,
        video_title:  videos[currenttrack].VideoTitle
      },
      dataType: 'json',
      success: function(data) {
        alreadyFavorites.push(videos[currenttrack].VideoID);
        $(star).addClass('fav');
      }
    });  
  }
}

function getGenreInfo (clickedGenre) {
  var genre = clickedGenre.parent().find('a').text();
  $('.ui-dialog-title').html('About ' + genre);
  $('.ui-dialog-content').html("");
  $.getJSON('http://ws.audioscrobbler.com/2.0/?method=tag.getinfo&tag='+genre+'&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&callback=?', function(data) {
		if (data.error == 6 || data.tag.wiki == "") {
		  $('.ui-dialog-content').html('No information could be found for this genre.');
		}
		else {
		  $('.ui-dialog-content').html(data.tag.wiki.content.replace(/[\n]/g,"<br/>"));
		}
    $('#about-genre').dialog('open');
	});
}

function getInfo () {
  var tmpWho = "";
  if (search_type == 'similar' || search_type == 'genre') {
    tmpWho = videos[currenttrack].ArtistName;
  }
  else {
   tmpWho = search; 
  }
  
  $.getJSON('http://ws.audioscrobbler.com/2.0/?method=artist.getInfo&artist='+tmpWho+'&api_key=b25b959554ed76058ac220b7b2e0a026&format=json&callback=?', function(data) {
		if (data.error == 6 || data.artist.bio.content == "") {
		  $('#info').html('No information could be found for the artist/band you supplied.');
		}
		else {
		  $('#info').html(data.artist.bio.content.replace(/[\n]/g,"<br/>"));
		  $('#info').prepend("<h3>"+tmpWho.replace(/[+]/g,' ')+"</h3>")
		}
	});
}

function import_youtube_favorites (youtube_username) {
	$.ajax({
    type: 'POST',
    url: '/add_youtube_favorites',
    data: {
      youtube_username:  youtube_username
    },
    dataType: 'json',
    success: function (data) {
			$("#import-favorites").removeClass('listen-active');

			if (data.success) {
				$('#import-youtube-favorites .error').hide();
				$('#import-youtube-favorites .success').show();
				
				setTimeout(function () {
		      $('#import-youtube-favorites .success').fadeOut(500);
		    }, 5000);
			}
			else {
				$('#import-youtube-favorites .error').show();
				$('#import-youtube-favorites .success').hide();
			}
    },
		error: function () {
			$('#import-youtube-favorites .error').show();
			$('#import-youtube-favorites .success').hide();
		}
  });
}

function share_single (video_id, video_title) {
	$('#share-video div.facebook').data('video-id', video_id);
	$('#share-video div.facebook').data('video-title', video_title);	
	$('#share-video div.twitter').data('video-id', video_id);
	$('#share-video div.twitter').data('video-title', video_title);
}

$(document).ready(function () { 
	FB.init({ 
    appId   : '239275546125436', 
    status  : true, 
    cookie  : true, 
    xfbml   : true 
  });
	
	$('#share-video div.facebook').click(function () {
		share_video_facebook($(this).data('video-id'), $(this).data('video-title'));
	});
	$('#share-video div.twitter').click(function() {
	  var width  = 575,
	      height = 400,
	      left   = ($(window).width()  - width)  / 2,
	      top    = ($(window).height() - height) / 2,
	      url    = "https://twitter.com/share?text=I%27m%20enjoying%20"+$(this).data('video-title')+"%20on%20%40tubalr%21&url=http%3A%2F%2Ftubalr.com%2Fvideo%2f"+$(this).data('video-id'),
	      opts   = 'status=1' +
	               ',width='  + width  +
	               ',height=' + height +
	               ',top='    + top    +
	               ',left='   + left;

	  window.open(url, 'twitter', opts);
	});
	
	$('#the-list').delegate('.share-video', 'click', function (e) {
		e.stopImmediatePropagation();
		share_single($(this).data('video-id'), $(this).data('video-title'));
		$('#share-video').dialog('open');
	});

	var share_single_timer;
	$("#the-list").delegate('a', 'mouseenter', function () {
		var playlist_item = $(this);
		share_single_timer = setTimeout(function () {
      playlist_item.find('.share-video').stop(true, true).slideDown();
    }, 800);		
	});
	$("#the-list").delegate('a', 'mouseleave', function () {
		clearTimeout(share_single_timer);
		$(this).find('.share-video').stop(true, true).slideUp();
	});
	
	$("#import-favorites").click(function () {
		$(this).addClass("listen-active");
		import_youtube_favorites($('#youtube_username').val());
	});
	
  $('#remove-video').click(function () {
    remove_video();
    return false;
  });
  
  $('#next').click(function () { 
    nextSong();
    return false;
  });
  $('#previous').click(function () {
    previousSong();
    return false;
  });
  
	$('#share-video').dialog({
    modal: true,
    autoOpen: false,
    width: 200,
    draggable: false,
		height: 128,
		title: "Share Video"
  });

  $('#about-tubalr').dialog({
    modal: true,
    autoOpen: false,
    width: 600,
    draggable: false,
    title: 'About Tubalr'
  });
  $('.about-tubalr').click(function () { $('#about-tubalr').dialog('open'); });
    
  $('#about-genre').dialog({
    modal: true,
    autoOpen: false,
    width: 600,
    draggable: false
  });
  $('#genres-main ul li i').click(function () {
    getGenreInfo($(this));
  });
   
  $('#info-icon').click(function(){
    if ($('#main').css('marginTop') == '20px') {
      $('#info').slideToggle(function(){
        $("#main").animate({ marginTop: 100 }, 500);
      });
    }
    else {
      $("#main").animate({
        marginTop: 20
      }, 500, function () {
        $('#info').slideToggle();
      });
    }
  });
  
  if ($('.flash-msg')) {
    setTimeout(function () {
      $('.flash-msg').slideUp(500, function () {
        $(this).remove();
      });
    }, 5000);
  }
  
  $('#player').delegate('#favorite-star', 'click', function() {
    favorite(this);
  });
  
  $('#the-list').delegate('a', 'click', function () { jumpTo($(this).index('#the-list a')); return false; });   
  
  $('table tbody tr').click(function() {
    if ($(this).parent().parent().attr("id") != 'general') {
      window.open(window.location.protocol+"//"+window.location.host+$(this).attr('url'));
    }
  });
  
  $('#main').delay(500).fadeIn();
  $('#footer').delay(500).fadeIn();
  
  $('#q').focus(function() {
    if ($(this).val() == "Enter Artist or Band Here") $(this).val("");
  });
  $('#q').blur(function() {
    if ($(this).val() == "") $(this).val("Enter Artist or Band Here");
  });

  $('.just').click(function() {
     just($('#q').val());
  });
  $('.similar').click(function() {
    similarTo($('#q').val());
  });

  $('input#q').keypress(function(e) {
    var code = (e.keyCode ? e.keyCode : e.which);
    if (code == 13) { //Enter keycode  
      if ($('#q').val() != "") {
        just($('#q').val());
      }
    }
  });
  
  $('#twitter').click(function(event) {
    var width  = 575,
        height = 400,
        left   = ($(window).width()  - width)  / 2,
        top    = ($(window).height() - height) / 2,
        url    = this.href,
        opts   = 'status=1' +
                 ',width='  + width  +
                 ',height=' + height +
                 ',top='    + top    +
                 ',left='   + left;
    
    window.open(url, 'twitter', opts);
 
    return false;
  });
});