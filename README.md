# youtube-list-broadcasts
NodeJS module meant to list all of your active broadcasts and say if the specified id is actively broadcasting. YouTube API v3 compliant.

Here is what I'm doing outside the module to talk with it:

    var express = require('express');
    var youtube = require('youtube-list-broadcasts')
    var mongojs = require('mongojs')
    var db = mongojs('mydb', ['mycollection'])
    var app = express();
    var settings = {
			client_id: CLIENT_ID,
			client_secret: CLIENT_SECRET,
			redirect_url: "https://www.mywebsite.com/callback/youtube",
			collection: db.mycollection,
			DELAY: 1000, //interval between API queries.
			MAX_TRIES: 600 //how many times should the loop be ran before it returns a timeout.
		}

    app.get('/', function(req, res){
      youtube.liveBroadcasts(YOUTUBE_CODE, settings, function(err, response) {
        if(err) {
          res.send('Move along... ' + err)	
        } else {
          res.send("It's  alive!!");
        }
      })
    })

    app.get('/callback/youtube', function(req, res) {
      youtube.getNewToken(settings, req.query.code, function(err, result) {
        res.redirect('/')
      })
    })

    app.listen(80);
