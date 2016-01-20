var googleapis = require('googleapis')
var googleAuth = require('google-auth-library')
var async = require('async')

exports.liveBroadcasts = function(id, clientInfo, callback) {
	if(
		!clientInfo.client_id || 
		!clientInfo.client_secret || 
		!clientInfo.redirect_url || 
		!clientInfo.collection || 
		!clientInfo.MAX_TRIES  || clientInfo.MAX_TRIES <= 0 ||
		!clientInfo.DELAY || clientInfo.DELAY <= 0
	) {
		return callback('Missing parameters.', null)
	}
	collection = clientInfo.collection
	isLive = false;
	count = 0;
	needsNewToken = false
	wrongRefreshToken = false
	async.whilst(
		function() {
			return (!isLive && count < clientInfo.MAX_TRIES && !needsNewToken) 
		},
		function(callback) {
			count++
			setTimeout(function() {
				authorize(clientInfo, collection, function(err, oauth2Client) {
					if(err){
						console.log(err)
						needsNewToken = true
						callback(needsNewToken, null)
					} else {
						listLiveBroadcasts(oauth2Client, id, function(err, res) {
							if(err) {
								console.log("YOUTUBE --- Refreshing the token.")
								refreshToken(oauth2Client, collection, function(err, result) {
									if(err) {
										wrongRefreshToken = true
										callback('wrongRefreshToken', null)
									} else {
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
									}
								})
							} else {
								if(findId(res.items, id)) {
									isLive = true	
								}
								callback(null, res.items)	
							}
						})	
					}
				})
			}, clientInfo.DELAY)
		}, function (err, results) {
			if(count >= clientInfo.MAX_TRIES) {
				callback('timeout', null)
			} else if (needsNewToken) {
				callback('needsNewToken',null)
			} else if (wrongRefreshToken) {
				callback('wrongRefreshToken', null)
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
		if(!token || !token.access_token) {
			getNewCode(oauth2Client, collection, function(err, result) {
				callback(err, result)
			})
		} else {
			oauth2Client.credentials = token
			callback(err, oauth2Client)
		}
	})
}

function getNewCode(oauth2Client, collection, callback) {
	var authUrl = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: ["https://www.googleapis.com/auth/youtube.readonly"]
	})
	console.log('Authorize this app by visiting this URL: ' + authUrl + '&approval_prompt=force')
	callback('needsNewToken', null)
}

exports.getNewToken = function(settings, code, callback) {
	var auth = new googleAuth()
	var oauth2Client = new auth.OAuth2(settings.client_id, settings.client_secret, settings.redirect_url)
	oauth2Client.getToken(code, function(err, token) {
		if (err) {
			console.log('YOUTUBE --- ' + err)
			callback(err, null)
		} else {
			oauth2Client.credentials = token
			storeToken(settings.collection, token, function(err, result) {
				if(err) {
					callback(err, null)
				} else {
					callback(null, 'ok')	
				}
			})
		}
	})
}

function refreshToken(oauth2Client, collection, callback) {
	oauth2Client.refreshAccessToken(function(err, tokens){
		if (err) {
			callback(err, null)
		} else {
			oauth2Client.credentials.access_token = tokens.access_token ? tokens.access_token : null 
			storeToken(collection, tokens, function(err, result) {
				callback(err, result)
			})
		}
	})
}

function storeToken(collection, token, callback) {
	collection.update({}, {$set: token}, {upsert: true}, function(err, result) {
		callback(err, result)
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
