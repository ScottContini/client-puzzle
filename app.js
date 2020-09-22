const express = require('express');
const crypto = require('crypto');
const request = require('request');
const url = require('url');
const querystring = require('querystring');

const app = express();
const port = 5000;
const secret=crypto.randomBytes(60);

puzzle_strength=16; // default value -- this can be changed using env variable
time_limit=5000; //default time limit -- this can be changed using env variable
start_time = Date.now();

giphy_url = "";
giphy_api_key = "";
if (typeof process.env.giphy_api_key != 'undefined')
    giphy_api_key = process.env.giphy_api_key;


app.use(express.static('public'));



// This code taken from https://stackoverflow.com/questions/8775262/synchronous-requests-in-node-js
function downloadPage(url) {
    return new Promise((resolve, reject) => {
        request(url, (error, response, body) => {
            if (error) reject(error);
            if (response.statusCode != 200) {
                reject('Invalid status code <' + response.statusCode + '>');
            }
            resolve(body);
        });
    });
}

async function search_giphy( search_term, _callback ) {
    if (giphy_api_key == "") {
        console.log("Giphy API key is undefined");
        var rand = Math.floor((Math.random()*4));
        console.log(rand);
        // no API key provided :-( , just return one of these boring gifs
        switch (rand) {
            case 0:
                giphy_url = "https://media2.giphy.com/media/3o6YfT6YHxfCwfyvvy/giphy.gif";
                break;
            case 1:
                giphy_url = "https://media3.giphy.com/media/LT0fzPk5V1fLJEWDMu/giphy.gif";
                break;
            case 2:
                giphy_url = "https://media2.giphy.com/media/gIfv29q3ULtqjYTR7B/giphy.gif";
                break;
            case 3:
                giphy_url = "https://media4.giphy.com/media/92ybGNsaLsfuM/giphy.gif";
                break;
        }
    }
    else {
        var url = 'https://api.giphy.com/v1/gifs/random?api_key='+giphy_api_key+'&tag=' + search_term;
        try {
            const response = await downloadPage(url);
            r = JSON.parse(response);
            giphy_url = r.data.image_url;
            if (giphy_url === undefined)
                // nothing found -- give a default url
                giphy_url = "https://media4.giphy.com/media/QzBvpfKuIVBcPmXS0R/giphy.gif";
        } catch (error) {
            console.log("got an error!");
            // just return some stupid response
            giphy_url = 'https://media1.giphy.com/media/3ohhwDGmpiXTv53VXW/giphy.gif';
        }
    }
    _callback();
}




app.get('/', function (req, res)
{
    res.redirect(301, 'search.html');

});

function compute_puzzle( params ) {
    var hash1 = crypto.createHash('sha256');
    var hash2 = crypto.createHash('sha256');
    var timestamp = Date.now();

    // allow puzzle strength to change by environmental variable
    if (typeof process.env.puzzle_strength != 'undefined') {
        puzzle_strength = process.env.puzzle_strength;
    }
    params_with_secret_and_timestamp = params;
    params_with_secret_and_timestamp.timestamp = timestamp.toString(10);
    params_with_secret_and_timestamp.secret = secret;
    value_to_hash = JSON.stringify( params_with_secret_and_timestamp );
    // first hash (h1) -- this is what the client needs to derive
    h1 = hash1.update(value_to_hash).digest("hex");
    // we remove some of the bits from  h1  -- this is what we give the client
    var index_last_byte = h1.length - Math.floor(puzzle_strength/4) - 1;
    puzzle_to_solve = h1.substr(0, index_last_byte);
    // we need to mask out some of the bits of the last character
    var last_char_of_puzzle = parseInt("0x" + h1.substr(index_last_byte,1) );
    var bits_to_mask = puzzle_strength % 4;
    var masked_last_char_of_puzzle = last_char_of_puzzle & ~((1<<bits_to_mask)-1);
    puzzle_to_solve = puzzle_to_solve + masked_last_char_of_puzzle.toString(16);
    // second hash -- this is the target client used to check if he derived h1 correctly
    h2 = hash2.update(h1).digest("hex");
    return {"puzzle_to_solve": puzzle_to_solve, "target_hash": h2, "puzzle_strength":puzzle_strength, "timestamp": timestamp } ;
}


function check_puzzle_solution( params, claimed_solution ) {
    var hash1 = crypto.createHash('sha256');

    params_with_secret_and_timestamp = params;
    params_with_secret_and_timestamp.secret = secret;
    delete params_with_secret_and_timestamp.puzzle_solution;
    value_to_hash = JSON.stringify( params_with_secret_and_timestamp );
    // first hash (h1) -- this is what the client should have derived
    h1 = hash1.update(value_to_hash).digest("hex");
    return h1 === claimed_solution;
}


app.get('/search', function(req, res) 
{
    var parsedUrl = url.parse(req.url);
    var parsedQs = querystring.parse(parsedUrl.query);
    var search = "";
    time = Date.now();
    //console.log(parsedQs);
    
    // loop through the values sent in to see if there is a puzzle solution provided
    provided_puzzle_solution = undefined;
    const keys = Object.keys(parsedQs);
    for (const key of keys)
        if (key === "puzzle_solution") {
            provided_puzzle_solution = parsedQs.puzzle_solution;
            console.log( "\nClient provided following solution: " + provided_puzzle_solution );
        }
        else if (key === "timestamp") {
            start_time = parseInt(parsedQs.timestamp);
        }
        else if (key === "search") {
            search = parsedQs.search;
        }
    if (typeof provided_puzzle_solution != undefined && provided_puzzle_solution) {
        // solution has been provided -- check it
        var elapsed_time = time - start_time;
        console.log("Elapsed time: " + elapsed_time.toString(10) + " milliseconds");
        var valid = check_puzzle_solution( parsedQs, provided_puzzle_solution );
        // allow time_limit to change by environmental variable
        if (typeof process.env.time_limit != 'undefined')
            time_limit = process.env.time_limit;
        if (valid) {
            if (elapsed_time <= time_limit) {
                giphy_url="";
                giphy_url = search_giphy(search, function()
                {
                    console.log("giphy url is " + giphy_url);
                    if (giphy_api_key === "") 
                        var r = { "status": "success", "message": "Puzzle has been solved, but no Giphy API key has been configured so sorry for the boring result", "image_url": giphy_url };
                    else
                        var r = { "status": "success", "message": "Puzzle has been solved!  Image served below (Powered by Giphy).", "image_url": giphy_url };
                    console.log(r);
                    res.send(r);
                } );
            }
            else {
                var r = { "status": "failure", "message": "Puzzle has expired!" };
                res.send(r);
            }
        }
        else {
            // invalid puzzle solution provided
            challenge = compute_puzzle( parsedQs );
            console.log("invalid puzzle solution!!!");
            res.send(challenge);
        }
    }
    else {
        // no solution provided
        start_time = time;
        challenge = compute_puzzle( parsedQs );
        console.log("The following challenge provided to client:");
        console.log(challenge);
        res.send(challenge);
    }



});



app.listen(port, function () {
  console.log('Example app listening on port ' + port + '!');
});

