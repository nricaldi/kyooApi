const express = require('express');
const querystring = require('querystring');
const axios = require('axios');

const router = express.Router();

const spotify_client_id = process.env.SPOTIFY_CLIENT_ID;
const spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET;
const spotify_redirect_uri = process.env.SPOTIFY_REDIRECT_URI

let accessToken = null;
let code = null;

const generateRandomString = (length) => {
    let result = '';
    let counter = 0;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;

    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

const addToQueue = (uri) => {
    const queryData = querystring.stringify({
        'uri': uri,
        'Authorization' : `Bearer ${accessToken}`,
        'content-type' : 'application/json',
    });

    const queueHeaders = {
        'Authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json',
    }
    const queueUrl = `https://api.spotify.com/v1/me/player/queue?${queryData}`;

    axios.post(queueUrl, {}, { headers: queueHeaders })
        .then(response => {
            console.log('successfull queue');
        })
        .catch(error => {
            console.log('error adding to queue');
    });
};

const getTopResults = async (songName, limit) => {
    const searchHeaders = { Authorization: `Bearer ${accessToken}` };
    const queryOptions = querystring.stringify({
        q: songName,
        type: 'track',
        limit: limit
    });
    const searchUrl = `https://api.spotify.com/v1/search?${queryOptions}`;
    
    return new Promise((resolve, reject) => {
        axios.get(searchUrl, { headers : searchHeaders })
            .then(response => {
                const searchResults = response.data.tracks.items || null;
                resolve(searchResults);
            }).catch(error => {
                console.log('error getting results');
                reject(error);
            });
    });
};

const getAccessToken = async () => {
    const accessTokenUrl = 'https://accounts.spotify.com/api/token';
    const data = {
        code: code,
        redirect_uri: spotify_redirect_uri,
        grant_type: 'authorization_code'
      };
    const headers = {
        'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64')),
        'content-type':'application/x-www-form-urlencoded'
    };

    return axios.post(accessTokenUrl, data, { headers })
        .then(response => {
            console.log('successfull get auth token');
            accessToken = response.data.access_token;

        }).catch(error => {
            console.log('Not aye aye aye');
            console.log(error.message);
        });
};

router.get('/login', (req, res) => {
    /*
        App should compare the state parameter that it received in
        the redirection URI with the state parameter it originally 
        provided to Spotify in the authorization URI. If there is a 
        mismatch then your app should reject the request and stop
        the authentication flow.
    */
    const state = generateRandomString(16);
    res.cookie('spotify_auth_state', state);

    const scope = 'user-modify-playback-state';
    const queryOptions = querystring.stringify({
        response_type: 'code',
        client_id: spotify_client_id,
        redirect_uri: spotify_redirect_uri,
        state: state,
        scope: scope
    });

    res.redirect(`https://accounts.spotify.com/authorize?${queryOptions}`);
});

router.get('/add-to-queue', async (req, res) => {
    if (accessToken) {
        const songName = req.query.song_name || 'de carolina';
        const limit = req.query.limit || 1;

        const searchResults = await getTopResults(songName, limit);
        searchResults.forEach(result => {
            console.log(result.name, 'added to queue.');
            addToQueue(result.uri);
        });
    } else {
        console.log('not logged in');
        res.redirect('http://localhost:3000/api/songs/login');
    }
});

router.get('/callback', async (req, res) => {
    console.log('successfull login');
    const spotifyAuthState = req.cookies.spotify_auth_state;
    const callbackState = req.query.state || null;

    if (spotifyAuthState === callbackState) {
        code = req.query.code || null;
        await getAccessToken();
        res.sendStatus(200);
    } else {
        console.log('invalid states');
        res.sendStatus(400);
    }
    res.end();
});

module.exports = router;