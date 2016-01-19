var googleapis = require('googleapis')
var googleAuth = require('google-auth-library')
var readline = require('readline')

exports.liveBroadcasts = function(clientId, clientSecret, redirectUrl, collection, callback) {
	clientInfo = {
		clientId: clientId,
		clientSecret: clientSecret,
		redirectUrl: redirectUrl
	}
	authorize(clientInfo, collection, function(oauth2Client) {
		listLiveBroadcasts(oauth2Client, function(err, res) {
			if(err) {
				console.log("YOUTUBE --- Refreshing the token.")
				refreshToken(oauth2Client, collection, function() {
					listLiveBroadcasts(oauth2Client, function(err, res) {
						if(err) {
							callback(true, null)
						} else {
							callback(null, res.items)	
						}
					})
				})
			} else {
				callback(null, res.items)	
			}
		})
	})
}

function authorize(credentials, collection, callback) {
	var clientSecret = credentials.clientSecret
	var clientId = credentials.clientId
	var redirectUrl = credentials.redirectUrl
	var auth = new googleAuth()
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)

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
				storeToken(collection, token)
				callback(oauth2Client)
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

function listLiveBroadcasts(oauth2Client, callback) {
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