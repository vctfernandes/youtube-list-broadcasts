var googleapis = require('googleapis')
var googleAuth = require('google-auth-library')
var readline = require('readline')

module.exports = function getNewToken(collection, callback) {
	var auth = new googleAuth()
	var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl)
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