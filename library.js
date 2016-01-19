var googleapis = require('googleapis')
var googleAuth = require('google-auth-library')
var readline = require('readline')
var async = require('async')
const DELAY = 1000
const MAX_TRIES = 10

exports.liveBroadcasts = function(id, clientInfo, callback) {
	collection = clientInfo.collection
	isLive = false;
	count = 0;
	async.whilst(
		function() {
			return (!isLive && count < MAX_TRIES) 
		},
		function(callback) {
			count++
			setTimeout(
				authorize(clientInfo, collection, function(oauth2Client) {
					listLiveBroadcasts(oauth2Client, id, function(err, res) {
						if(err) {
							console.log("YOUTUBE --- Refreshing the token.")
							refreshToken(oauth2Client, collection, function() {
								listLiveBroadcasts(oauth2Client, id, function(err, res) {
									if(err) {
										callback(true, null)
									} else {
										if(findId(res.items, id)) {
											isLive = true	
										}
										callback(null, res.items)	
									}
								})
							})
						} else {
							if(findId(res.items, id)) {
								isLive = true	
							}
							callback(null, res.items)	
						}
					})
				}), DELAY)
		}, function (err, results) {
			if(count >= MAX_TRIES) {
				callback('timeout', null)
			} else {
				callback(null, results)
			}
		}
	)
}

function findId(items, id) {
	for(i=0;i<items.length;i++) {
		if(items[i].id == id) {
			return true
		}
	}
	return false
}

function authorize(credentials, collection, callback) {
	var client_secret = credentials.client_secret
	var client_id = credentials.client_id
	var redirect_url = credentials.redirect_url
	var auth = new googleAuth()
	var oauth2Client = new auth.OAuth2(client_id, client_secret, redirect_url)

	collection.findOne({}, function(err, token) {
		if(!token || typeof token.access_token === 'undefined' || token.access_token == '') {
			getNewToken(oauth2Client, collection, callback)
		} else {
			oauth2Client.credentials = token
			callback(oauth2Client)
		}
	})
}

function getNewToken(oauth2Client, collection, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: ["https://www.googleapis.com/auth/youtube.readonly"]
	})
	console.log('YOUTUBE --- Authorize this app by visiting this URL: ', authUrl + '&approval_prompt=force')
	var rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout
	})
	rl.question('YOUTUBE --- Enter the code from that page here: ', function(code) {
		rl.close()
		oauth2Client.getToken(code, function(err, token) {
			if (err) {
				console.log('YOUTUBE --- ' + err)
				callback()
			} else {
				oauth2Client.credentials = token
				storeToken(collection, token, function() {
					callback(oauth2Client)
				})
			}
		})
	})
}

function refreshToken(oauth2Client, collection, callback) {
	oauth2Client.refreshAccessToken(function(err, tokens){
		oauth2Client.credentials.access_token = tokens.access_token
		storeToken(collection, tokens, function() {
			callback()
		})
	})
}

function storeToken(collection, token, callback) {
	collection.update({}, {$set: token}, {upsert: true}, function() {
		callback()
	})
}

function listLiveBroadcasts(oauth2Client, id, callback) {
	var youtube = googleapis.youtube('v3')

	youtube.liveBroadcasts.list({
		auth: oauth2Client,
		part: 'id',
		broadcastStatus: 'active'
	}, function(err, response) {
		if(err){
			callback(err, null)
		} else {
			callback(null, response)	
		}
	})
}